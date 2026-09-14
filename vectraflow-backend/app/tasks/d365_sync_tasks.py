"""
Dynamics 365 F&O OData ingestion — a separate sync route alongside the
existing document-upload ingestion path (app/tasks/ingestion_tasks.py).
Nothing here is imported by or modifies that file; the two share only the
same embedding provider / Milvus index manager singletons from
app.dependencies, exactly like the upload path does.
"""
import os
import uuid
import hashlib
import asyncio
import structlog
from datetime import datetime, timezone
from typing import Optional

from app.celery_worker import celery_app
from app.config import settings
from app.integrations.d365.auth import D365TokenProvider, D365AuthError
from app.integrations.d365.client import D365ODataClient, D365ODataError
from app.integrations.d365.entity_config import get_entity_config
from app.integrations.d365.text_templater import entity_record_to_text

logger = structlog.get_logger(__name__)


class D365SyncDisabledError(Exception):
    """Raised when a sync is attempted but D365 settings aren't fully configured."""
    pass


class D365SyncNotFoundError(Exception):
    """Raised when the given knowledge_base_id doesn't exist."""
    pass


def _require_d365_configured() -> None:
    if not settings.d365_enabled:
        raise D365SyncDisabledError(
            "D365 integration is not configured — set D365_BASE_URL, D365_TENANT_ID, "
            "D365_CLIENT_ID, and D365_CLIENT_SECRET to enable it."
        )


async def run_d365_sync(kb_id: str, entity_name: str, max_records: Optional[int] = None) -> dict:
    """
    Fetches D365 records for one entity (only those changed since the last
    successful sync, when the entity supports it), converts each to a
    natural-language chunk, and embeds+indexes it into the same knowledge
    base's Milvus collection the existing upload path uses.

    Mirrors app/tasks/ingestion_tasks.py::run_ingestion's structure: a
    plain async function with its own short-lived DB session, callable
    directly from a FastAPI route (BackgroundTasks) or from the Celery
    task wrapper below.
    """
    _require_d365_configured()
    entity_config = get_entity_config(entity_name)

    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from app.models.knowledge_base import KnowledgeBase
    from app.models.d365_sync_state import D365SyncState
    from app.rag.chunking.base_chunker import Chunk
    from app.core.token_counter import token_counter
    from app.dependencies import get_embedding_provider, get_milvus_index_manager

    db_url = os.getenv("DATABASE_URL") or settings.DATABASE_URL
    engine = create_async_engine(db_url, future=True)
    result_summary = {"status": "success", "entity": entity_name, "records_synced": 0}

    try:
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with session_factory() as session:
            kb_result = await session.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.id == uuid.UUID(kb_id),
                    KnowledgeBase.deleted_at.is_(None),
                )
            )
            kb = kb_result.scalars().first()
            if not kb:
                raise D365SyncNotFoundError(f"Knowledge base {kb_id} not found")

            state_result = await session.execute(
                select(D365SyncState).where(
                    D365SyncState.knowledge_base_id == kb.id,
                    D365SyncState.entity_name == entity_name,
                )
            )
            sync_state = state_result.scalars().first()
            if not sync_state:
                sync_state = D365SyncState(knowledge_base_id=kb.id, entity_name=entity_name)
                session.add(sync_state)
                await session.flush()

            logger.info("d365_sync_started", kb_id=kb_id, entity=entity_name)

            try:
                token_provider = D365TokenProvider(
                    tenant_id=settings.D365_TENANT_ID,
                    client_id=settings.D365_CLIENT_ID,
                    client_secret=settings.D365_CLIENT_SECRET,
                    resource_scope=settings.d365_resource_scope,
                )
                client = D365ODataClient(base_url=settings.D365_BASE_URL, token_provider=token_provider)
                records = await client.fetch_entity_records(
                    entity_config,
                    modified_since=sync_state.last_synced_at,
                    max_records=max_records,
                )

                if records:
                    embedder = get_embedding_provider()
                    index_manager = get_milvus_index_manager()
                    await index_manager.create_collection(kb.milvus_collection_name, dimensions=384)

                    texts = [entity_record_to_text(r, entity_config) for r in records]
                    vectors = await embedder.embed_batch(texts)

                    for record, text, vector in zip(records, texts, vectors):
                        record_id = str(record.get(entity_config.id_field, uuid.uuid4()))
                        chunk = Chunk(
                            text=text,
                            token_count=token_counter.count(text),
                            metadata={
                                "type": "d365",
                                "heading_path": [entity_config.heading or entity_config.entity_name],
                                "page_number": None,
                                "tags": ["d365", entity_config.entity_name],
                            },
                        )
                        # Milvus's document_id column is VARCHAR(36) — the same
                        # width a document-upload UUID uses — so a composed
                        # "d365:<entity>:<record_id>" string would overflow for
                        # any realistic entity/id combination. Hash it down to a
                        # deterministic 32-char id instead: same record always
                        # maps to the same document_id (so delete_by_document
                        # below still finds and replaces it on re-sync), without
                        # risking truncation/silent collisions from a raw cut.
                        # sha1 hexdigest is 40 chars — trim to 32 to stay safely
                        # under the 36-char column width.
                        document_id = hashlib.sha1(
                            f"d365:{entity_config.entity_name}:{record_id}".encode()
                        ).hexdigest()[:32]
                        # Drop any chunks from a previous sync of this same record first,
                        # so a re-sync replaces rather than duplicates it.
                        try:
                            await index_manager.delete_by_document(kb.milvus_collection_name, document_id)
                        except Exception:
                            pass
                        await index_manager.upsert(
                            kb.milvus_collection_name, document_id, [chunk], [vector]
                        )

                sync_state.last_synced_at = datetime.now(timezone.utc)
                sync_state.last_sync_status = "success"
                sync_state.last_sync_error = None
                sync_state.records_synced_last_run = len(records)
                sync_state.records_synced_total += len(records)
                await session.commit()

                result_summary["records_synced"] = len(records)
                logger.info("d365_sync_completed", kb_id=kb_id, entity=entity_name, count=len(records))

            except (D365AuthError, D365ODataError) as exc:
                sync_state.last_sync_status = "failed"
                sync_state.last_sync_error = str(exc)[:500]
                await session.commit()
                logger.error("d365_sync_failed", kb_id=kb_id, entity=entity_name, error=str(exc))
                raise
    finally:
        await engine.dispose()

    return result_summary


# ─────────────────────────────────────────────────────────────
# Optional Celery task wrapper — mirrors process_document_task in
# ingestion_tasks.py exactly (fresh event loop per call, safe in worker
# threads). Note: this deployment has no always-on Celery worker (see the
# comment in ingestion_tasks.py), so the D365 API route below calls
# run_d365_sync() directly via BackgroundTasks rather than .delay(); this
# wrapper exists for anyone who does run a dedicated worker/beat schedule.
# ─────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="sync_d365_entity_task", max_retries=3)
def sync_d365_entity_task(self, kb_id: str, entity_name: str, max_records: Optional[int] = None):
    def run_async(coro):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("loop closed")
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    try:
        return run_async(run_d365_sync(kb_id=kb_id, entity_name=entity_name, max_records=max_records))
    except (D365SyncDisabledError, D365SyncNotFoundError):
        raise
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
