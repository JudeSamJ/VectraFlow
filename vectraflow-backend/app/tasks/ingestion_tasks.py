import os
import asyncio
import uuid
import structlog
from app.celery_worker import celery_app
from app.dependencies import get_ingestion_pipeline
from app.api.v1.ingest import MockKnowledgeBaseDoc, MockKnowledgeBase

logger = structlog.get_logger(__name__)

@celery_app.task(bind=True, name="process_document_task")
def process_document_task(self, temp_file_path: str, collection_name: str, original_filename: str, content_type: str):
    """
    Background task to parse, chunk, and index a document into Milvus.
    """
    logger.info("celery_ingestion_task_started", task_id=self.request.id, filename=original_filename)
    
    try:
        # Read the file content from the temp storage
        with open(temp_file_path, "rb") as f:
            file_content = f.read()
            
        file_size = len(file_content)
            
        doc_id = uuid.uuid4()
        mock_doc = MockKnowledgeBaseDoc(
            id=doc_id,
            collection_name=collection_name,
            file_name=original_filename,
            file_size=file_size,
            content_type=content_type
        )
        mock_kb = MockKnowledgeBase(collection_name=collection_name)
        
        # Instantiate pipeline singletons for this worker process
        pipeline = get_ingestion_pipeline()
        
        # Celery is synchronous, so we run the async pipeline using asyncio
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            pipeline.run(kb=mock_kb, document=mock_doc, file_content=file_content)
        )
        
        logger.info("celery_ingestion_task_complete", task_id=self.request.id, document_id=str(doc_id))
        
        return {
            "status": "success",
            "document_id": str(doc_id),
            "collection_name": collection_name,
            "filename": original_filename,
            "bytes_processed": file_size
        }
        
    except Exception as e:
        logger.error("celery_ingestion_task_failed", error=str(e), task_id=self.request.id)
        raise
    finally:
        # Clean up the temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError as e:
                logger.warning("celery_temp_file_cleanup_failed", error=str(e), path=temp_file_path)
