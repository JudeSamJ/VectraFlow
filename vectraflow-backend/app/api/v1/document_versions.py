from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, UUID4
from typing import List, Optional
from datetime import datetime
import uuid
import structlog

logger = structlog.get_logger(__name__)
router = APIRouter()

# Schema representing our DB Model
class DocumentVersion(BaseModel):
    id: UUID4
    document_id: UUID4
    version_number: int
    content_hash: str
    storage_path: str
    chunk_ids: List[UUID4]
    superseded_at: Optional[datetime] = None
    created_at: datetime

class RestoreVersionRequest(BaseModel):
    pass # No body required, the version_number is in the URL

# Mocks
mock_db = {}

@router.get("/documents/{doc_id}/versions", response_model=List[DocumentVersion])
async def list_versions(doc_id: UUID4):
    """
    List all versions for a given document.
    """
    logger.info("list_document_versions", doc_id=str(doc_id))
    return mock_db.get(str(doc_id), [])

@router.get("/documents/{doc_id}/versions/{version_number}", response_model=DocumentVersion)
async def get_version(doc_id: UUID4, version_number: int):
    """
    Get a specific version of a document.
    """
    versions = mock_db.get(str(doc_id), [])
    for v in versions:
        if v.version_number == version_number:
            return v
    raise HTTPException(status_code=404, detail="Version not found")

@router.post("/documents/{doc_id}/versions/{version_number}/restore")
async def restore_version(doc_id: UUID4, version_number: int):
    """
    Restores a previous version by creating a NEW version that copies the old content.
    We NEVER mutate versions in place.
    """
    logger.info("restore_document_version", doc_id=str(doc_id), target_version=version_number)
    # 1. Fetch old version
    # 2. Re-index chunks (or flip is_current flags)
    # 3. Create NEW version row
    return {"status": "restored", "new_version_number": version_number + 1}

@router.get("/documents/{doc_id}/diff")
async def diff_versions(doc_id: UUID4, from_ver: int, to_ver: int):
    """
    Chunk-level diff between two document versions.
    """
    return {"diff": ["+ chunk A", "- chunk B"]}
