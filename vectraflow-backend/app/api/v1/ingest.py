from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form, HTTPException
import structlog
import uuid
import time
import os
import aiofiles
from typing import Dict, Any

from app.tasks.ingestion_tasks import run_ingestion, MockKnowledgeBaseDoc, MockKnowledgeBase

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/ingest")
async def ingest_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_name: str = Form(...)
):
    """
    Ingests a raw file upload, processed in-process after the response is
    sent (no Celery worker required — see run_ingestion for why).
    """
    logger.info("api_ingest_request_received", filename=file.filename, collection=collection_name)

    try:
        temp_dir = "/tmp/synapse_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")

        async with aiofiles.open(temp_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        background_tasks.add_task(
            run_ingestion,
            temp_file_path=temp_path,
            collection_name=collection_name,
            original_filename=file.filename,
            content_type=file.content_type,
        )

        logger.info("api_ingest_task_scheduled", filename=file.filename, collection=collection_name)

        return {
            "status": "processing",
            "collection_name": collection_name,
            "filename": file.filename
        }
    except Exception as e:
        logger.error("api_ingest_dispatch_error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal ingestion dispatch error")
