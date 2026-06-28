import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document_version import DocumentVersion
import structlog

logger = structlog.get_logger(__name__)

class DocumentVersionService:
    async def create_snapshot(self, document_id: uuid.UUID, content_hash: str, storage_path: str, chunk_ids: List[uuid.UUID], db: AsyncSession) -> DocumentVersion:
        """
        Creates a new immutable snapshot.
        """
        version = DocumentVersion(
            document_id=document_id,
            version_number=1, # Logic to increment goes here
            content_hash=content_hash,
            storage_path=storage_path,
            chunk_ids=chunk_ids
        )
        db.add(version)
        await db.commit()
        await db.refresh(version)
        return version
