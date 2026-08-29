import csv
import io
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.pii_policy import PIIPolicy as PIIPolicyModel, PIIAction
from app.models.audit_log import AuditLog
from app.api.deps import get_current_user
from app.core.audit import record_audit_log

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

    await record_audit_log(
        action="governance.pii_policy_updated",
        user_id=current_user.id,
        knowledge_base_id=kb_id,
        resource_type="pii_policy",
        resource_id=str(policy.id),
        detail={"detect_categories": policy_in.detect_categories, "action": policy_in.action.value},
    )

    return policy


# ─────────────────────────────────────────────
# Audit Log
# ─────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    id: uuid.UUID
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    detail: Optional[dict] = None
    user_email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogPage(BaseModel):
    records: List[AuditLogEntry]
    next_cursor: Optional[str] = None


_EXPORT_ROW_CAP = 5000


async def _query_audit_log(kb_id: uuid.UUID, db: AsyncSession, limit: int, cursor: Optional[str]):
    from app.models.user import User as UserModel

    stmt = (
        select(AuditLog, UserModel.email)
        .outerjoin(UserModel, AuditLog.user_id == UserModel.id)
        .where(AuditLog.knowledge_base_id == kb_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            stmt = stmt.where(AuditLog.created_at < cursor_dt)
        except ValueError:
            pass
    result = await db.execute(stmt)
    return result.all()


@router.get("/knowledge-bases/{kb_id}/governance/audit-log", response_model=AuditLogPage)
async def get_audit_log(
    kb_id: uuid.UUID,
    limit: int = 50,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_owned_kb(kb_id, current_user, db)
    limit = max(1, min(limit, 200))
    rows = await _query_audit_log(kb_id, db, limit, cursor)

    records = [
        AuditLogEntry(
            id=log.id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            detail=log.detail,
            user_email=email,
            created_at=log.created_at,
        )
        for log, email in rows
    ]
    next_cursor = records[-1].created_at.isoformat() if len(records) == limit else None
    return AuditLogPage(records=records, next_cursor=next_cursor)


@router.post("/knowledge-bases/{kb_id}/governance/audit-log/export")
async def export_audit_log(
    kb_id: uuid.UUID,
    format: str = "csv",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Synchronous export (small scale — no need for an async job queue here)."""
    await _get_owned_kb(kb_id, current_user, db)
    rows = await _query_audit_log(kb_id, db, _EXPORT_ROW_CAP, None)
    logger.info("audit_log_export_started", kb_id=str(kb_id), format=format, row_count=len(rows))

    if format == "json":
        import json
        payload = [
            {
                "id": str(log.id),
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "detail": log.detail,
                "user_email": email,
                "created_at": log.created_at.isoformat(),
            }
            for log, email in rows
        ]
        return Response(
            content=json.dumps(payload, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="audit-log-{kb_id}.json"'},
        )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "action", "resource_type", "resource_id", "detail", "user_email", "created_at"])
    for log, email in rows:
        writer.writerow([
            str(log.id), log.action, log.resource_type or "", log.resource_id or "",
            log.detail or "", email or "", log.created_at.isoformat(),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="audit-log-{kb_id}.csv"'},
    )
