import os
import uuid
import asyncio
import structlog
from datetime import datetime, timezone

from app.celery_worker import celery_app
from app.dependencies import get_ingestion_pipeline

logger = structlog.get_logger(__name__)


# ─────────────────────────────────────────────────────────────
# Lightweight data containers (no SQLAlchemy ORM dependency)
# ─────────────────────────────────────────────────────────────

class MockKnowledgeBaseDoc:
    """Minimal document object accepted by IngestionPipeline."""
    def __init__(self, id, collection_name: str, file_name: str, file_size: int, content_type: str):
        self.id = id
        self.milvus_collection_name = collection_name
        self.file_name = file_name
        self.filename = file_name
        self.mime_type = content_type
        self.file_size = file_size
        self.content_type = content_type


class MockKnowledgeBase:
    """Minimal KB object accepted by IngestionPipeline."""
    def __init__(self, collection_name: str, pipeline_config: dict = None):
        self.milvus_collection_name = collection_name
        self.embedding_dimensions = 384
        self.pipeline_config = pipeline_config or {}


# ─────────────────────────────────────────────────────────────
# Async helper: update document status in PostgreSQL
# ─────────────────────────────────────────────────────────────

async def _update_document_status(doc_id: uuid.UUID, status: str, error_msg: str = None, chunk_count: int = None):
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select, func
    from app.models.document import Document, DocumentStatus
    from app.models.knowledge_base import KnowledgeBase

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        from app.config import settings
        db_url = settings.DATABASE_URL

    engine = create_async_engine(db_url, future=True)
    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            result = await session.execute(select(Document).where(Document.id == doc_id))
            doc = result.scalars().first()
            if not doc:
                logger.warning("document_not_found_for_status_update", doc_id=str(doc_id))
                return
            doc.status = DocumentStatus(status)
            if error_msg is not None:
                doc.error_message = error_msg
            if chunk_count is not None:
                doc.chunk_count = chunk_count
            await session.commit()
            logger.info("document_status_updated", doc_id=str(doc_id), status=status)

            # When a document finishes, recount and update KB counters
            if status in ("ready", "failed"):
                kb_result = await session.execute(
                    select(KnowledgeBase).where(KnowledgeBase.id == doc.knowledge_base_id)
                )
                kb = kb_result.scalars().first()
                if kb:
                    counts = await session.execute(
                        select(
                            func.count(Document.id),
                            func.coalesce(func.sum(Document.chunk_count), 0),
                            func.coalesce(func.sum(Document.file_size_bytes), 0),
                        ).where(
                            Document.knowledge_base_id == kb.id,
                            Document.status == DocumentStatus.ready,
                            Document.deleted_at.is_(None),
                        )
                    )
                    doc_count, total_chunks, total_bytes = counts.one()
                    kb.document_count = int(doc_count)
                    kb.chunk_count = int(total_chunks)
                    kb.storage_bytes = int(total_bytes)
                    if status == "ready":
                        kb.last_ingested_at = datetime.now(timezone.utc)
                        if int(doc_count) > 0:
                            kb.index_status = "ready"
                    await session.commit()
                    logger.info("kb_counters_updated", kb_id=str(kb.id),
                                documents=int(doc_count), chunks=int(total_chunks))
    finally:
        await engine.dispose()


# ─────────────────────────────────────────────────────────────
# Core ingestion logic — plain async function, no Celery dependency.
#
# Called directly (as a FastAPI BackgroundTasks job) from the API routes
# that accept uploads, since this app's free-tier Render deployment has no
# separate always-on Celery worker consuming the Redis queue: a worker
# service on Render's free tier only wakes on Render's own schedule (not
# on incoming requests, unlike the web service), so tasks dispatched via
# `.delay()` could sit in the queue indefinitely. Running ingestion
# in-process removes that dependency entirely for the common case.
#
# process_document_task below still exists as a thin Celery wrapper around
# this same function, for anyone who does run a dedicated worker.
# ─────────────────────────────────────────────────────────────

async def run_ingestion(
    temp_file_path: str,
    collection_name: str,
    original_filename: str,
    content_type: str,
    doc_id: str = None,
    pipeline_config: dict = None,
) -> dict:
    """Parse → chunk → embed → index a document into Milvus. Updates the Document row status throughout."""
    logger.info("ingestion_started", filename=original_filename, doc_id=doc_id)

    real_doc_id = uuid.UUID(doc_id) if doc_id else None

    if real_doc_id:
        await _update_document_status(real_doc_id, "parsing")

    try:
        # If path looks like a cloud storage key (no drive letter, no leading
        # slash, no local file at that path) download it from Cloudinary.
        is_remote_key = temp_file_path and not os.path.isabs(temp_file_path) and not os.path.exists(temp_file_path)
        if is_remote_key:
            try:
                from app.services.storage_service import storage_service
                file_content = await storage_service.download_file(temp_file_path)
                logger.info("cloud_download_for_ingestion", key=temp_file_path, size=len(file_content))
            except Exception as download_err:
                raise FileNotFoundError(
                    f"File not found locally and cloud download failed: {temp_file_path} — {download_err}"
                )
        else:
            with open(temp_file_path, "rb") as f:
                file_content = f.read()

        file_size = len(file_content)

        mock_doc = MockKnowledgeBaseDoc(
            id=real_doc_id or uuid.uuid4(),
            collection_name=collection_name,
            file_name=original_filename,
            file_size=file_size,
            content_type=content_type,
        )
        mock_kb = MockKnowledgeBase(
            collection_name=collection_name,
            pipeline_config=pipeline_config or {},
        )

        # Mark as embedding (pipeline covers parse+chunk+embed+index)
        if real_doc_id:
            await _update_document_status(real_doc_id, "embedding")

        pipeline = get_ingestion_pipeline()
        result = await pipeline.run(kb=mock_kb, document=mock_doc, file_content=file_content)

        chunk_count = result.get("chunks_indexed", 0)

        # Mark as ready
        if real_doc_id:
            await _update_document_status(real_doc_id, "ready", chunk_count=chunk_count)

        logger.info("ingestion_complete", doc_id=str(real_doc_id), chunks=chunk_count)

        return {
            "status": "success",
            "document_id": str(real_doc_id),
            "collection_name": collection_name,
            "filename": original_filename,
            "bytes_processed": file_size,
            "chunks_indexed": chunk_count,
        }

    except Exception as exc:
        logger.error("ingestion_failed", error=str(exc), doc_id=str(real_doc_id))
        if real_doc_id:
            await _update_document_status(real_doc_id, "failed", error_msg=str(exc)[:500])
        raise

    finally:
        # Only delete if it was a real local temp file (not a cloud storage key)
        if temp_file_path and os.path.isabs(temp_file_path) and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError as e:
                logger.warning("temp_file_cleanup_failed", error=str(e), path=temp_file_path)


# ─────────────────────────────────────────────────────────────
# Optional Celery task wrapper — only used if a dedicated worker is
# actually running and dispatching via .delay()/.apply_async(). The API
# routes call run_ingestion() directly instead (see comment above).
# ─────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="process_document_task", max_retries=3)
def process_document_task(
    self,
    temp_file_path: str,
    collection_name: str,
    original_filename: str,
    content_type: str,
    doc_id: str = None,
    pipeline_config: dict = None,
):
    def run_async(coro):
        """Run an async coroutine in a fresh event loop (safe in Celery worker threads)."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("loop closed")
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    try:
        return run_async(run_ingestion(
            temp_file_path=temp_file_path,
            collection_name=collection_name,
            original_filename=original_filename,
            content_type=content_type,
            doc_id=doc_id,
            pipeline_config=pipeline_config,
        ))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
