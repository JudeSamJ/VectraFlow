from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.models.conversation import Message
from app.api.deps import get_current_user
from app.core import metrics

router = APIRouter()


class AnalyticsMetrics(BaseModel):
    avg_retrieval_latency_ms: float
    avg_generation_latency_ms: float
    no_context_rate: float
    estimated_daily_cost_usd: float
    total_documents: int
    total_chunks: int
    total_conversations: int
    total_knowledge_bases: int
    total_storage_bytes: int


@router.get("/metrics", response_model=AnalyticsMetrics)
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Aggregate real counts from DB
    kbs_result = await db.execute(
        select(
            func.count(KnowledgeBase.id),
            func.sum(KnowledgeBase.document_count),
            func.sum(KnowledgeBase.chunk_count),
            func.sum(KnowledgeBase.storage_bytes),
        ).where(
            KnowledgeBase.owner_id == current_user.id,
            KnowledgeBase.deleted_at.is_(None),
        )
    )
    row = kbs_result.one()
    total_kbs = int(row[0] or 0)
    total_docs = int(row[1] or 0)
    total_chunks = int(row[2] or 0)
    total_storage = int(row[3] or 0)

    from app.models.conversation import Conversation
    conv_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.owner_id == current_user.id,
        )
    )
    total_conversations = int(conv_result.scalar() or 0)

    live = metrics.snapshot()

    return AnalyticsMetrics(
        avg_retrieval_latency_ms=round(live["avg_retrieval_latency_ms"], 1),
        avg_generation_latency_ms=round(live["avg_generation_latency_ms"], 1),
        no_context_rate=round(live["no_context_rate"], 4),
        estimated_daily_cost_usd=round(live["estimated_daily_cost_usd"], 4),
        total_documents=total_docs,
        total_chunks=total_chunks,
        total_conversations=total_conversations,
        total_knowledge_bases=total_kbs,
        total_storage_bytes=total_storage,
    )
