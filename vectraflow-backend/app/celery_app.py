from celery import Celery
from app.config import settings

celery = Celery(
    "synapse",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ingestion_tasks",
        "app.tasks.reindex_tasks",
        "app.tasks.eval_tasks",
        "app.tasks.health_check_tasks",
    ]
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.INGESTION_PER_DOCUMENT_TIMEOUT_SECONDS + 60,
    task_soft_time_limit=settings.INGESTION_PER_DOCUMENT_TIMEOUT_SECONDS,
)
