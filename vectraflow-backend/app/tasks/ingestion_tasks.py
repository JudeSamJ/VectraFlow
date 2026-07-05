<<<<<<< HEAD
import os
import uuid
import asyncio
import structlog
from datetime import datetime, timezone

from app.celery_worker import celery_app
from app.dependencies import get_ingestion_pipeline
=======
import asyncio

import structlog

from app.celery_app import celery_app
from app.database import async_session_maker
from app.services.ingestion_service import ingest_document
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

logger = structlog.get_logger(__name__)


<<<<<<< HEAD
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
    import os
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
                    from datetime import datetime, timezone
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
# Main Celery task
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
    """
    Parse → chunk → embed → index a document into Milvus.
    Updates the Document row status throughout.
    """
    logger.info(
        "celery_ingestion_task_started",
        task_id=self.request.id,
        filename=original_filename,
        doc_id=doc_id,
    )

    real_doc_id = uuid.UUID(doc_id) if doc_id else None

    def run_async(coro):
        """Run an async coroutine in a fresh event loop (safe in Celery worker threads)."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("loop closed")
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    # Mark as parsing
    if real_doc_id:
        run_async(_update_document_status(real_doc_id, "parsing"))

    try:
        # If path looks like an S3 key (no drive letter, no leading slash) download it
        is_s3_key = temp_file_path and not os.path.isabs(temp_file_path) and not os.path.exists(temp_file_path)
        if is_s3_key:
            try:
                from app.services.storage_service import storage_service
                file_content = run_async(storage_service.download_file(temp_file_path))
                logger.info("s3_download_for_ingestion", key=temp_file_path, size=len(file_content))
            except Exception as s3_err:
                raise FileNotFoundError(
                    f"File not found locally and S3 download failed: {temp_file_path} — {s3_err}"
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
            run_async(_update_document_status(real_doc_id, "embedding"))

        pipeline = get_ingestion_pipeline()
        result = run_async(pipeline.run(kb=mock_kb, document=mock_doc, file_content=file_content))

        chunk_count = result.get("chunks_indexed", 0)

        # Mark as ready
        if real_doc_id:
            run_async(_update_document_status(real_doc_id, "ready", chunk_count=chunk_count))

        logger.info(
            "celery_ingestion_task_complete",
            task_id=self.request.id,
            doc_id=str(real_doc_id),
            chunks=chunk_count,
        )

        return {
            "status": "success",
            "document_id": str(real_doc_id),
            "collection_name": collection_name,
            "filename": original_filename,
            "bytes_processed": file_size,
            "chunks_indexed": chunk_count,
        }

    except Exception as exc:
        logger.error("celery_ingestion_task_failed", error=str(exc), task_id=self.request.id)
        if real_doc_id:
            run_async(_update_document_status(real_doc_id, "failed", error_msg=str(exc)[:500]))
        raise self.retry(exc=exc, countdown=30)

    finally:
        # Only delete if it was a real local temp file (not an S3 key)
        if temp_file_path and os.path.isabs(temp_file_path) and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError as e:
                logger.warning("temp_file_cleanup_failed", error=str(e), path=temp_file_path)
=======
@celery_app.task(
    bind=True,
    max_retries=3,
    soft_time_limit=300,
    time_limit=360,
)
def ingest_document_task(self, document_id: str) -> dict:
    async def _run():
        async with async_session_maker() as db:
            await ingest_document(document_id, db)

    try:
        asyncio.run(_run())
        return {"document_id": document_id, "status": "ready"}
    except Exception as exc:  # noqa: BLE001
        logger.error("ingest_document_task_failed", document_id=document_id, error=str(exc))
        raise self.retry(exc=exc, countdown=2**self.request.retries)
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
