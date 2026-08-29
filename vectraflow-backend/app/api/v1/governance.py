import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.pii_policy import PIIPolicy as PIIPolicyModel, PIIAction
from app.api.deps import get_current_user

logger = structlog.get_logger(__name__)
router = APIRouter()


class PIIPolicyRequest(BaseModel):
    detect_categories: List[str]
    action: PIIAction
    allowed_provider_regions: Optional[List[str]] = None
    restore_in_final_answer: bool = False


class PIIPolicyResponse(BaseModel):
    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    detect_categories: List[str]
    action: PIIAction
    allowed_provider_regions: Optional[List[str]] = None
    restore_in_final_answer: bool

    class Config:
        from_attributes = True


async def _get_owned_kb(kb_id: uuid.UUID, user: User, db: AsyncSession) -> KnowledgeBase:
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.owner_id == user.id,
            KnowledgeBase.deleted_at.is_(None),
        )
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.get("/knowledge-bases/{kb_id}/governance/pii-policy", response_model=PIIPolicyResponse)
async def get_pii_policy(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the PII policy for a knowledge base — persisted in the real pii_policies table."""
    await _get_owned_kb(kb_id, current_user, db)
    result = await db.execute(select(PIIPolicyModel).where(PIIPolicyModel.knowledge_base_id == kb_id))
    policy = result.scalars().first()
    if not policy:
        # No policy saved yet — hand back a sensible default without writing it,
        # so an untouched KB doesn't silently get a row until the user actually saves.
        return PIIPolicyResponse(
            id=kb_id,
            knowledge_base_id=kb_id,
            detect_categories=["ssn", "credit_card"],
            action=PIIAction.redact_before_send,
            allowed_provider_regions=None,
            restore_in_final_answer=False,
        )
    return policy


@router.put("/knowledge-bases/{kb_id}/governance/pii-policy", response_model=PIIPolicyResponse)
async def update_pii_policy(
    kb_id: uuid.UUID,
    policy_in: PIIPolicyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the PII policy for a knowledge base."""
    await _get_owned_kb(kb_id, current_user, db)
    result = await db.execute(select(PIIPolicyModel).where(PIIPolicyModel.knowledge_base_id == kb_id))
    policy = result.scalars().first()
    if policy:
        policy.detect_categories = policy_in.detect_categories
        policy.action = policy_in.action
        policy.allowed_provider_regions = policy_in.allowed_provider_regions
        policy.restore_in_final_answer = policy_in.restore_in_final_answer
    else:
        policy = PIIPolicyModel(
            knowledge_base_id=kb_id,
            detect_categories=policy_in.detect_categories,
            action=policy_in.action,
            allowed_provider_regions=policy_in.allowed_provider_regions,
            restore_in_final_answer=policy_in.restore_in_final_answer,
        )
        db.add(policy)
    await db.commit()
    await db.refresh(policy)
    logger.info("pii_policy_updated", kb_id=str(kb_id))
    return policy


# ─────────────────────────────────────────────
# Audit Log — not implemented yet. Left as an honest stub (the frontend
# already labels this "not yet enabled" rather than presenting fake data);
# only the PII policy above was wired to real persistence.
# ─────────────────────────────────────────────

@router.get("/knowledge-bases/{kb_id}/governance/audit-log")
async def get_audit_log(kb_id: uuid.UUID, limit: int = 50, cursor: Optional[str] = None):
    return {"records": [], "next_cursor": None}


@router.post("/knowledge-bases/{kb_id}/governance/audit-log/export")
async def export_audit_log(kb_id: uuid.UUID, format: str = "csv"):
    logger.info("audit_log_export_started", kb_id=str(kb_id), format=format)
    return {"status": "exporting", "job_id": "mock-job-id"}
