from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document


async def active_kb_count(db: AsyncSession) -> int:
    """Active (non-deleted) knowledge bases, app-wide — capped to match Zilliz Cloud's free tier."""
    result = await db.execute(
        select(func.count()).select_from(KnowledgeBase).where(KnowledgeBase.deleted_at.is_(None))
    )
    return result.scalar_one()


async def total_storage_bytes(db: AsyncSession) -> int:
    """Sum of file_size_bytes across every non-deleted document, app-wide — capped to match Cloudinary's free tier."""
    result = await db.execute(
        select(func.coalesce(func.sum(Document.file_size_bytes), 0)).where(Document.deleted_at.is_(None))
    )
    return int(result.scalar_one())
