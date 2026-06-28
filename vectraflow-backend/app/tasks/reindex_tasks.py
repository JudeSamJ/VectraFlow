from app.celery_app import celery
import structlog

logger = structlog.get_logger(__name__)

@celery.task
def reindex_knowledge_base(kb_id: str):
    logger.info("reindex_kb_started", kb_id=kb_id)
    pass
