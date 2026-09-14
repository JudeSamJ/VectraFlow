"""
The D365 write "action layer" — kept as its own module, separate from the
existing chat/retrieval code (kb_chat.py only adds an intent-detection
routing step ahead of it; nothing in the RAG pipeline itself changes).

Flow: stage_action() validates parameters against the whitelisted action's
Pydantic model and writes a D365ActionLog row with
status=pending_confirmation — nothing is sent to D365 yet. Only
execute_staged_action(), called after the user explicitly confirms, calls
D365 and updates that row with the result. cancel_staged_action() marks it
cancelled instead. Every one of these three functions writes to
d365_action_logs, so the confirmation record and the execution audit log
are the same table (user, timestamp, action, parameters, result).

On user attribution: D365 F&O's OData write endpoints identify the caller
by whatever access token authenticates the request. Getting a token that
represents the *signed-in VectraFlow user* (rather than this app's own
service-account client-credentials token) requires a delegated Entra ID
app registration for D365 F&O and an on-behalf-of token exchange from the
user's session token — a real Azure AD setup step outside what this repo
can configure for you. execute_staged_action() already accepts a
user_bearer_token to use instead of the service-account token the moment
that's wired up (see D365ActionClient._headers); until then, every
D365ActionLog row still records exactly who in VectraFlow asked for the
action and when, and — where the target entity accepts a field for it —
the request body includes the user's email so it's visible on the D365
side too.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import structlog
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.d365_action_log import D365ActionLog, D365ActionStatus
from app.models.user import User
from app.integrations.d365.auth import D365TokenProvider, D365AuthError
from app.integrations.d365.action_client import D365ActionClient, D365ActionError
from app.integrations.d365.action_config import ACTION_WHITELIST, get_action_config
from app.core.audit import record_audit_log

logger = structlog.get_logger(__name__)


class ActionValidationError(Exception):
    pass


class ActionNotFoundError(Exception):
    pass


class ActionNotPendingError(Exception):
    pass


def list_whitelisted_actions() -> list[Dict[str, Any]]:
    return [
        {
            "name": cfg.name,
            "description": cfg.description,
            "is_write": cfg.is_write,
            "parameters": list(cfg.param_model.model_fields.keys()),
        }
        for cfg in ACTION_WHITELIST.values()
    ]


async def stage_action(
    action_name: str,
    raw_parameters: Dict[str, Any],
    user: User,
    knowledge_base_id: Optional[uuid.UUID],
    db: AsyncSession,
) -> D365ActionLog:
    """
    Validates parameters against the whitelisted action's schema and
    records the exact action + parameters as pending_confirmation — this
    is the only thing the caller shows the user to confirm; nothing here
    calls D365.
    """
    try:
        config = get_action_config(action_name)
    except ValueError as exc:
        raise ActionValidationError(str(exc)) from exc

    try:
        validated = config.param_model.model_validate(raw_parameters)
    except ValidationError as exc:
        raise ActionValidationError(f"Invalid parameters for '{action_name}': {exc}") from exc

    log_row = D365ActionLog(
        user_id=user.id,
        knowledge_base_id=knowledge_base_id,
        action_name=action_name,
        parameters=validated.model_dump(),
        status=D365ActionStatus.pending_confirmation,
    )
    db.add(log_row)
    await db.commit()
    await db.refresh(log_row)

    logger.info("d365_action_staged", action=action_name, user_id=str(user.id), action_log_id=str(log_row.id))
    return log_row


async def execute_staged_action(
    action_log_id: uuid.UUID,
    user: User,
    db: AsyncSession,
    user_bearer_token: Optional[str] = None,
) -> D365ActionLog:
    """
    Executes a previously staged action — only ever one that this user
    staged and that is still pending_confirmation ("no silent writes": the
    user must have seen stage_action()'s result first). Always updates the
    same row rather than creating a new one, so its full lifecycle
    (staged -> executed/failed) is one audit record.
    """
    log_row = await _get_owned_pending_action(action_log_id, user, db)
    config = get_action_config(log_row.action_name)
    params = config.param_model.model_validate(log_row.parameters)
    request = config.build_request(params)

    if not settings.d365_enabled:
        return await _fail(log_row, db, "D365 integration is not configured on this deployment.")

    token_provider = D365TokenProvider(
        tenant_id=settings.D365_TENANT_ID,
        client_id=settings.D365_CLIENT_ID,
        client_secret=settings.D365_CLIENT_SECRET,
        resource_scope=settings.d365_resource_scope,
    )
    client = D365ActionClient(base_url=settings.D365_BASE_URL, token_provider=token_provider)

    try:
        if config.http_method == "GET":
            result = await client.get(config.entity_name, request["filter"], user_bearer_token)
        elif config.http_method == "POST":
            body = dict(request["body"])
            body.setdefault("RequestedByEmail", user.email)
            result = await client.post(config.entity_name, body, user_bearer_token)
        else:  # PATCH
            body = dict(request["body"])
            result = await client.patch(config.entity_name, request["key"], body, user_bearer_token)
    except (D365AuthError, D365ActionError) as exc:
        return await _fail(log_row, db, str(exc))

    log_row.status = D365ActionStatus.executed
    log_row.result = result
    log_row.executed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(log_row)

    await record_audit_log(
        action="d365_action.executed",
        user_id=user.id,
        knowledge_base_id=log_row.knowledge_base_id,
        resource_type="d365_action_log",
        resource_id=str(log_row.id),
        detail={"action_name": log_row.action_name, "parameters": log_row.parameters},
    )
    logger.info("d365_action_executed", action=log_row.action_name, action_log_id=str(log_row.id))
    return log_row


async def cancel_staged_action(action_log_id: uuid.UUID, user: User, db: AsyncSession) -> D365ActionLog:
    log_row = await _get_owned_pending_action(action_log_id, user, db)
    log_row.status = D365ActionStatus.cancelled
    await db.commit()
    await db.refresh(log_row)
    logger.info("d365_action_cancelled", action=log_row.action_name, action_log_id=str(log_row.id))
    return log_row


async def _fail(log_row: D365ActionLog, db: AsyncSession, error_message: str) -> D365ActionLog:
    log_row.status = D365ActionStatus.failed
    log_row.error_message = error_message[:2000]
    log_row.executed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(log_row)
    logger.error("d365_action_failed", action=log_row.action_name, action_log_id=str(log_row.id), error=error_message)
    return log_row


async def _get_owned_pending_action(action_log_id: uuid.UUID, user: User, db: AsyncSession) -> D365ActionLog:
    result = await db.execute(
        select(D365ActionLog).where(D365ActionLog.id == action_log_id, D365ActionLog.user_id == user.id)
    )
    log_row = result.scalars().first()
    if not log_row:
        raise ActionNotFoundError(f"Action {action_log_id} not found")
    if log_row.status != D365ActionStatus.pending_confirmation:
        raise ActionNotPendingError(f"Action {action_log_id} is not pending confirmation (status={log_row.status.value})")
    return log_row
