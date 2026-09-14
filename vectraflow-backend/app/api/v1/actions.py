"""
D365 action-layer endpoints — separate router/file from kb_chat.py, whose
only change for Step 2 is calling detect_action_intent() ahead of its
existing RAG flow (see the top of sync_chat). Routes:

  GET  /d365-actions/whitelist                      — the 3 whitelisted actions
  POST /knowledge-bases/{kb_id}/actions/detect       — classify a message; stages
                                                        (never executes) if it's a
                                                        recognized action request
  POST /knowledge-bases/{kb_id}/actions/{id}/confirm — execute a staged action
  POST /knowledge-bases/{kb_id}/actions/{id}/cancel  — cancel a staged action
  GET  /knowledge-bases/{kb_id}/actions/history      — this KB's action audit log
"""
import uuid
from typing import Any, Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.d365_action_log import D365ActionLog
from app.api.deps import get_current_user
from app.dependencies import get_llm_provider
from app.rag.generation.base_llm_provider import BaseLLMProvider
from app.services.action_intent import detect_action_intent
from app.services import action_handler
from app.services.action_handler import ActionValidationError, ActionNotFoundError, ActionNotPendingError

logger = structlog.get_logger(__name__)

router = APIRouter()
global_router = APIRouter()


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


class ActionWhitelistEntry(BaseModel):
    name: str
    description: str
    is_write: bool
    parameters: List[str]


class DetectActionRequest(BaseModel):
    query: str


class DetectActionResponse(BaseModel):
    # "question": not an action — caller should fall back to the normal
    # /chat/sync flow. "pending_confirmation": staged, show the user
    # action_name/parameters and call /confirm or /cancel next.
    # "clarification_needed": looked like an action but couldn't be staged
    # (unknown action or invalid/missing parameters) — ask the user for
    # the missing detail rather than guessing.
    type: str
    action_log_id: Optional[uuid.UUID] = None
    action_name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class ActionLogResponse(BaseModel):
    id: uuid.UUID
    action_name: str
    parameters: Dict[str, Any]
    status: str
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: str
    executed_at: Optional[str] = None

    @staticmethod
    def from_row(row: D365ActionLog) -> "ActionLogResponse":
        return ActionLogResponse(
            id=row.id,
            action_name=row.action_name,
            parameters=row.parameters,
            status=row.status.value,
            result=row.result,
            error_message=row.error_message,
            created_at=row.created_at.isoformat(),
            executed_at=row.executed_at.isoformat() if row.executed_at else None,
        )


@global_router.get("/whitelist", response_model=List[ActionWhitelistEntry])
async def list_action_whitelist(current_user: User = Depends(get_current_user)):
    return action_handler.list_whitelisted_actions()


@router.post("/{kb_id}/actions/detect", response_model=DetectActionResponse)
async def detect_action(
    kb_id: uuid.UUID,
    req: DetectActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: BaseLLMProvider = Depends(get_llm_provider),
):
    """
    The intent-detection routing step: classifies req.query, and if — and
    only if — it's a recognized, fully-specified whitelisted action,
    stages it (writes a pending_confirmation row) and returns it for the
    user to confirm. Anything else (a question, an unrecognized action, an
    action missing required parameters) comes back as "question" or
    "clarification_needed" so the caller keeps using the existing
    /chat/sync RAG flow unchanged.
    """
    kb = await _get_owned_kb(kb_id, current_user, db)

    intent = await detect_action_intent(req.query, llm)
    if not intent.is_action:
        return DetectActionResponse(type="question")

    if intent.rejection_reason:
        return DetectActionResponse(
            type="clarification_needed",
            action_name=intent.action_name,
            parameters=intent.parameters,
            message=intent.rejection_reason,
        )

    try:
        log_row = await action_handler.stage_action(
            action_name=intent.action_name,
            raw_parameters=intent.parameters,
            user=current_user,
            knowledge_base_id=kb.id,
            db=db,
        )
    except ActionValidationError as exc:
        return DetectActionResponse(type="clarification_needed", action_name=intent.action_name, message=str(exc))

    return DetectActionResponse(
        type="pending_confirmation",
        action_log_id=log_row.id,
        action_name=log_row.action_name,
        parameters=log_row.parameters,
    )


@router.post("/{kb_id}/actions/{action_log_id}/confirm", response_model=ActionLogResponse)
async def confirm_action(
    kb_id: uuid.UUID,
    action_log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_owned_kb(kb_id, current_user, db)
    try:
        log_row = await action_handler.execute_staged_action(action_log_id, current_user, db)
    except ActionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ActionNotPendingError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return ActionLogResponse.from_row(log_row)


@router.post("/{kb_id}/actions/{action_log_id}/cancel", response_model=ActionLogResponse)
async def cancel_action(
    kb_id: uuid.UUID,
    action_log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_owned_kb(kb_id, current_user, db)
    try:
        log_row = await action_handler.cancel_staged_action(action_log_id, current_user, db)
    except ActionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ActionNotPendingError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return ActionLogResponse.from_row(log_row)


@router.get("/{kb_id}/actions/history", response_model=List[ActionLogResponse])
async def action_history(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = await _get_owned_kb(kb_id, current_user, db)
    result = await db.execute(
        select(D365ActionLog)
        .where(D365ActionLog.knowledge_base_id == kb.id, D365ActionLog.user_id == current_user.id)
        .order_by(D365ActionLog.created_at.desc())
        .limit(50)
    )
    return [ActionLogResponse.from_row(r) for r in result.scalars().all()]
