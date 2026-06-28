import os
from celery import Celery

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "synapse_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.ingestion_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1, # Fair dispatch for long-running RAG tasks
    task_acks_late=True # Only acknowledge after complete parsing
)
