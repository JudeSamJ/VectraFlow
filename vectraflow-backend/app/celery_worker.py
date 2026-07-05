import os
import ssl
from pathlib import Path

# Load .env before anything else
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from celery import Celery

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "synapse_worker",
    broker=redis_url,
    backend=redis_url,
    include=["app.tasks.ingestion_tasks"],
)

_use_ssl = redis_url.startswith("rediss://")

# Upstash requires SSL with CERT_NONE (self-signed cert acceptable)
_ssl_opts = {"ssl_cert_reqs": ssl.CERT_NONE} if _use_ssl else {}

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_transport_options={
        "visibility_timeout": 3600,
        **_ssl_opts,
    },
    redis_backend_use_ssl=_ssl_opts,
)
