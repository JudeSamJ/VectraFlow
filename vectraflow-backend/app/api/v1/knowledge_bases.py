import uuid
import re
import structlog
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, computed_field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase, IndexStatus
from app.api.deps import get_current_user
from app.dependencies import get_milvus_index_manager
from app.rag.indexing.milvus_index_manager import MilvusIndexManager
from app.services.capacity_service import active_kb_count, total_storage_bytes

logger = structlog.get_logger(__name__)
router = APIRouter()


class KBCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pipeline_config: Optional[dict] = None


class KBUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pipeline_config: Optional[dict] = None


class KBResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    milvus_collection_name: str
    pipeline_config: dict
    document_count: int
    chunk_count: int
    total_tokens_indexed: int
    storage_bytes: int
    last_ingested_at: Optional[datetime]
    index_status: IndexStatus
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def status(self) -> IndexStatus:
        return self.index_status

    @computed_field
    @property
    def total_tokens(self) -> int:
        return self.total_tokens_indexed

    class Config:
        from_attributes = True


class KBCapacityResponse(BaseModel):
    count: int
    limit: int
    limit_reached: bool
    storage_used_bytes: int
    storage_limit_bytes: int
    storage_limit_reached: bool


class SharedKBEntry(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    owner_email: str
    document_count: int
    chunk_count: int
    index_status: IndexStatus
    created_at: datetime
    is_mine: bool


def _make_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "kb"


def _make_collection_name(slug: str, kb_id: uuid.UUID) -> str:
    suffix = str(kb_id).replace("-", "")[:8]
    safe_slug = re.sub(r"[^a-z0-9_]", "_", slug)[:40]
    return f"kb_{safe_slug}_{suffix}"


@router.post("", response_model=KBResponse, status_code=status.HTTP_200_OK)
async def create_knowledge_base(
    kb_in: KBCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_count = await active_kb_count(db)
    if current_count >= settings.MAX_KNOWLEDGE_BASES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Knowledge base limit reached ({current_count}/{settings.MAX_KNOWLEDGE_BASES}). "
                f"This app runs on Zilliz Cloud's free tier, which only supports "
                f"{settings.MAX_KNOWLEDGE_BASES} vector collections in total across all users. "
                "Delete an existing knowledge base (see the shared pool) to free up a slot, "
                "then try again."
            ),
        )

    kb_id = uuid.uuid4()
    slug = _make_slug(kb_in.name)
    collection_name = _make_collection_name(slug, kb_id)

    # Ensure slug uniqueness
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.slug == slug))
    if result.scalars().first():
        slug = f"{slug}-{str(kb_id)[:8]}"

    kb = KnowledgeBase(
        id=kb_id,
        owner_id=current_user.id,
        name=kb_in.name,
        slug=slug,
        description=kb_in.description,
        milvus_collection_name=collection_name,
        pipeline_config=kb_in.pipeline_config or {},
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


@router.get("", response_model=List[KBResponse])
async def list_knowledge_bases(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.owner_id == current_user.id)
        .where(KnowledgeBase.deleted_at.is_(None))
        .order_by(KnowledgeBase.created_at.desc())
    )
    return result.scalars().all()


# NOTE: these fixed-path routes must stay above `/{kb_id}` so FastAPI doesn't
# try to parse "capacity" / "shared-pool" as a UUID path param.
@router.get("/capacity", response_model=KBCapacityResponse)
async def kb_capacity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    App-wide knowledge base usage vs. the free-tier cap. Zilliz Cloud's free
    tier supports only MAX_KNOWLEDGE_BASES vector collections total, and AWS
    S3's free tier only covers MAX_TOTAL_STORAGE_BYTES of storage — both are
    counted across all users, not just the current one.
    """
    count = await active_kb_count(db)
    storage_used = await total_storage_bytes(db)
    return KBCapacityResponse(
        count=count,
        limit=settings.MAX_KNOWLEDGE_BASES,
        limit_reached=count >= settings.MAX_KNOWLEDGE_BASES,
        storage_used_bytes=storage_used,
        storage_limit_bytes=settings.MAX_TOTAL_STORAGE_BYTES,
        storage_limit_reached=storage_used >= settings.MAX_TOTAL_STORAGE_BYTES,
    )


@router.get("/shared-pool", response_model=List[SharedKBEntry])
async def shared_kb_pool(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists every active knowledge base across all users. Used by the "limit
    reached" UI so any signed-in user can free up a shared free-tier slot,
    since this demo deployment doesn't have per-user Zilliz quotas.
    """
    result = await db.execute(
        select(KnowledgeBase, User.email)
        .join(User, KnowledgeBase.owner_id == User.id)
        .where(KnowledgeBase.deleted_at.is_(None))
        .order_by(KnowledgeBase.created_at.asc())
    )
    rows = result.all()
    return [
        SharedKBEntry(
            id=kb.id,
            name=kb.name,
            slug=kb.slug,
            owner_email=owner_email,
            document_count=kb.document_count,
            chunk_count=kb.chunk_count,
            index_status=kb.index_status,
            created_at=kb.created_at,
            is_mine=(kb.owner_id == current_user.id),
        )
        for kb, owner_email in rows
    ]


@router.get("/{kb_id}", response_model=KBResponse)
async def get_knowledge_base(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.owner_id == current_user.id,
            KnowledgeBase.deleted_at.is_(None),
        )
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.put("/{kb_id}", response_model=KBResponse)
async def update_knowledge_base(
    kb_id: uuid.UUID,
    kb_in: KBUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.owner_id == current_user.id,
            KnowledgeBase.deleted_at.is_(None),
        )
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    if kb_in.name is not None:
        kb.name = kb_in.name
    if kb_in.description is not None:
        kb.description = kb_in.description
    if kb_in.pipeline_config is not None:
        kb.pipeline_config = kb_in.pipeline_config

    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return kb


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    index_manager: MilvusIndexManager = Depends(get_milvus_index_manager),
):
    from datetime import timezone

    # In SHARED_KB_POOL_MODE (default on, for this free-tier demo deployment)
    # any signed-in user can delete any knowledge base — not just their own —
    # so the 5 shared Zilliz Cloud free-tier slots can be freed up by whoever
    # needs the next one. Flip SHARED_KB_POOL_MODE off once this app has
    # per-user billing/quotas and each user should only manage their own KBs.
    filters = [KnowledgeBase.id == kb_id, KnowledgeBase.deleted_at.is_(None)]
    if not settings.SHARED_KB_POOL_MODE:
        filters.append(KnowledgeBase.owner_id == current_user.id)

    result = await db.execute(select(KnowledgeBase).where(*filters))
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    was_owner = kb.owner_id == current_user.id
    kb.deleted_at = datetime.now(timezone.utc)
    db.add(kb)
    await db.commit()

    # Actually drop the Zilliz/Milvus collection — soft-deleting only the
    # Postgres row would leave the collection counted against the free-tier
    # cap, so the "5 knowledge base" limit would never actually free up.
    try:
        await index_manager.delete_collection(kb.milvus_collection_name)
    except Exception as exc:
        logger.warning(
            "milvus_collection_drop_failed",
            kb_id=str(kb_id),
            collection=kb.milvus_collection_name,
            error=str(exc),
        )

    logger.info(
        "kb_deleted",
        kb_id=str(kb_id),
        deleted_by=str(current_user.id),
        was_owner=was_owner,
    )


@router.get("/{kb_id}/stats")
async def kb_stats(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.owner_id == current_user.id,
        )
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return {
        "document_count": kb.document_count,
        "chunk_count": kb.chunk_count,
        "total_tokens_indexed": kb.total_tokens_indexed,
        "storage_bytes": kb.storage_bytes,
        "index_status": kb.index_status,
    }


@router.get("/{kb_id}/health")
async def kb_health(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == current_user.id)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return {"status": "ok", "index_status": kb.index_status, "collection": kb.milvus_collection_name}
