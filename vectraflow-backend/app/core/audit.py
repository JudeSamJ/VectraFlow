import os
import uuid
import structlog
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

logger = structlog.get_logger(__name__)

# Opens its own short-lived engine/session per call rather than requiring a
# request-scoped AsyncSession, so it can be called from anywhere — request
# handlers, FastAPI BackgroundTasks running after the response is sent,
# Celery tasks — without depending on that caller's session lifecycle.
# Mirrors the same pattern already used by
# app/tasks/ingestion_tasks.py::_update_document_status.


async def record_audit_log(
    action: str,
    user_id: Optional[uuid.UUID] = None,
    knowledge_base_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[dict] = None,
) -> None:
    """
    Best-effort audit trail write. Never raises — a logging failure should
    never take down the request/task that triggered it.
    """
    try:
        from app.models.audit_log import AuditLog

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            from app.config import settings
            db_url = settings.DATABASE_URL

        engine = create_async_engine(db_url, future=True)
        try:
            session_factory = async_sessionmaker(engine, expire_on_commit=False)
            async with session_factory() as session:
                session.add(AuditLog(
                    action=action,
                    user_id=user_id,
                    knowledge_base_id=knowledge_base_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    detail=detail,
                ))
                await session.commit()
        finally:
            await engine.dispose()
    except Exception as exc:
        logger.warning("audit_log_write_failed", action=action, error=str(exc))
