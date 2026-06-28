from app.celery_app import celery
import structlog

logger = structlog.get_logger(__name__)

@celery.task
def run_evaluation(eval_dataset_id: str):
    logger.info("run_evaluation_started", eval_dataset_id=eval_dataset_id)
    pass
