import uuid
<<<<<<< HEAD
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, computed_field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase, IndexStatus
from app.api.deps import get_current_user
=======

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.knowledge_base import (
    CreateKnowledgeBaseRequest,
    KnowledgeBaseListResponse,
    KnowledgeBaseResponse,
    KnowledgeBaseStatsResponse,
    UpdateKnowledgeBaseRequest,
)
from app.services import knowledge_base_service
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

router = APIRouter()


<<<<<<< HEAD
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
):
    from datetime import timezone
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
    kb.deleted_at = datetime.now(timezone.utc)
    db.add(kb)
    await db.commit()


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
=======
@router.post("", response_model=KnowledgeBaseResponse, status_code=201)
async def create_kb(
    data: CreateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await knowledge_base_service.create(data, current_user.id, db)


@router.get("", response_model=KnowledgeBaseListResponse)
async def list_kbs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kbs = await knowledge_base_service.list_for_owner(current_user.id, db)
    return KnowledgeBaseListResponse(items=kbs, next_cursor=None, total=len(kbs))


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_kb(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await knowledge_base_service.get_or_404(kb_id, current_user.id, db)


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_kb(
    kb_id: uuid.UUID,
    data: UpdateKnowledgeBaseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await knowledge_base_service.get_or_404(kb_id, current_user.id, db)
    return await knowledge_base_service.update(kb, data, db)


@router.delete("/{kb_id}", status_code=204)
async def delete_kb(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await knowledge_base_service.get_or_404(kb_id, current_user.id, db)
    await knowledge_base_service.delete(kb, db)
    return Response(status_code=204)


@router.get("/{kb_id}/stats", response_model=KnowledgeBaseStatsResponse)
async def get_kb_stats(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    kb = await knowledge_base_service.get_or_404(kb_id, current_user.id, db)
    stats = await knowledge_base_service.get_stats(kb, db)
    return KnowledgeBaseStatsResponse(**stats)
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
