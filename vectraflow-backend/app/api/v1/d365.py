"""
Dynamics 365 F&O sync endpoints — additive, under the same
/knowledge-bases/{kb_id}/... namespace as the existing upload/chat routes
but in their own file/router so nothing here touches kb_chat.py or
knowledge_bases.py.
"""
import time
import uuid
from typing import Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.d365_sync_state import D365SyncState
from app.api.deps import get_current_user
from app.integrations.d365.auth import D365TokenProvider, D365AuthError
from app.integrations.d365.client import D365ODataClient, D365ODataError
from app.integrations.d365.entity_config import BUILTIN_ENTITIES, get_entity_config
from app.tasks.d365_sync_tasks import run_d365_sync, D365SyncDisabledError, D365SyncNotFoundError

logger = structlog.get_logger(__name__)

# Two routers on purpose: `router` holds the /{kb_id}/d365/... routes and is
# mounted under the existing "/knowledge-bases" prefix alongside
# knowledge_bases.py/kb_chat.py's routes. `global_router` holds routes with
# no kb_id (list entities, integration status) — these must NOT also be
# mounted under "/knowledge-bases", or e.g. "/knowledge-bases/entities"
# would collide with knowledge_bases.py's earlier-registered
# "GET /knowledge-bases/{kb_id}" route (Starlette matches path shape before
# FastAPI validates kb_id as a UUID, so "entities" would 422 there instead
# of ever reaching this router).
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


class D365EntityInfo(BaseModel):
    entity_name: str
    heading: str
    select_fields: List[str]
    supports_incremental_sync: bool


class D365SyncRequest(BaseModel):
    entity_name: str
    max_records: Optional[int] = None


class D365SyncResponse(BaseModel):
    status: str
    entity: str
    records_synced: int


class D365ConnectivityCheckResponse(BaseModel):
    entity_name: str
    token_acquired: bool
    sample_record_count: int
    latency_ms: Dict[str, int]
    error: Optional[str] = None


class D365SyncStateResponse(BaseModel):
    entity_name: str
    last_synced_at: Optional[str]
    last_sync_status: str
    last_sync_error: Optional[str]
    records_synced_last_run: int
    records_synced_total: int

    class Config:
        from_attributes = True


@global_router.get("/status")
async def d365_integration_status():
    """Whether D365 sync is configured at all for this deployment (no auth needed — no secrets returned)."""
    return {"enabled": settings.d365_enabled}


@global_router.get("/entities", response_model=List[D365EntityInfo])
async def list_d365_entities(current_user: User = Depends(get_current_user)):
    """Known D365 entities this connector can sync (see entity_config.py to add more)."""
    return [
        D365EntityInfo(
            entity_name=cfg.entity_name,
            heading=cfg.heading or cfg.entity_name,
            select_fields=cfg.select_fields,
            supports_incremental_sync=cfg.modified_field is not None,
        )
        for cfg in BUILTIN_ENTITIES.values()
    ]


@global_router.get("/connectivity-check", response_model=D365ConnectivityCheckResponse)
async def d365_connectivity_check(
    entity_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight, read-only probe: acquires a token and fetches a single
    record for one entity, without touching any knowledge base or the
    embedding/index pipeline (unlike /{kb_id}/d365/sync). Meant to be hit
    from wherever this backend is actually deployed — i.e. somewhere that
    can reach the D365 environment's network — to validate
    D365_BASE_URL/D365_TENANT_ID/D365_CLIENT_ID/D365_CLIENT_SECRET against
    a real environment independently of running a full sync.

    Returns 200 with token_acquired/error fields describing what failed
    rather than raising, since "auth failed" and "OData call failed" are
    both expected, actionable outcomes of a connectivity check — not server
    errors.
    """
    if not settings.d365_enabled:
        raise HTTPException(
            status_code=http_status.HTTP_501_NOT_IMPLEMENTED,
            detail="D365 integration is not configured on this deployment.",
        )

    name = entity_name or next(iter(BUILTIN_ENTITIES))
    try:
        config = get_entity_config(name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    token_provider = D365TokenProvider(
        tenant_id=settings.D365_TENANT_ID,
        client_id=settings.D365_CLIENT_ID,
        client_secret=settings.D365_CLIENT_SECRET,
        resource_scope=settings.d365_resource_scope,
    )
    client = D365ODataClient(base_url=settings.D365_BASE_URL, token_provider=token_provider)

    token_start = time.monotonic()
    try:
        await token_provider.get_token()
    except D365AuthError as exc:
        return D365ConnectivityCheckResponse(
            entity_name=name,
            token_acquired=False,
            sample_record_count=0,
            latency_ms={"token_ms": round((time.monotonic() - token_start) * 1000)},
            error=str(exc),
        )
    token_ms = round((time.monotonic() - token_start) * 1000)

    fetch_start = time.monotonic()
    try:
        records = await client.fetch_entity_records(config, max_records=1)
    except D365ODataError as exc:
        return D365ConnectivityCheckResponse(
            entity_name=name,
            token_acquired=True,
            sample_record_count=0,
            latency_ms={"token_ms": token_ms, "fetch_ms": round((time.monotonic() - fetch_start) * 1000)},
            error=str(exc),
        )
    fetch_ms = round((time.monotonic() - fetch_start) * 1000)

    return D365ConnectivityCheckResponse(
        entity_name=name,
        token_acquired=True,
        sample_record_count=len(records),
        latency_ms={"token_ms": token_ms, "fetch_ms": fetch_ms},
        error=None,
    )


@router.post("/{kb_id}/d365/sync", response_model=D365SyncResponse)
async def sync_d365_entity(
    kb_id: uuid.UUID,
    req: D365SyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Synchronously runs one D365 entity sync for this knowledge base and
    returns the result. (Kept synchronous rather than fire-and-forget so a
    misconfiguration — bad credentials, unknown entity — surfaces
    immediately instead of only showing up later in sync-status.)
    """
    if not settings.d365_enabled:
        raise HTTPException(
            status_code=http_status.HTTP_501_NOT_IMPLEMENTED,
            detail="D365 integration is not configured on this deployment.",
        )
    kb = await _get_owned_kb(kb_id, current_user, db)

    try:
        result = await run_d365_sync(kb_id=str(kb.id), entity_name=req.entity_name, max_records=req.max_records)
    except D365SyncDisabledError as exc:
        raise HTTPException(status_code=http_status.HTTP_501_NOT_IMPLEMENTED, detail=str(exc))
    except D365SyncNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        # Unknown entity name
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("d365_sync_endpoint_failed", kb_id=str(kb_id), entity=req.entity_name, error=str(exc))
        raise HTTPException(status_code=502, detail=f"D365 sync failed: {exc}")

    return D365SyncResponse(**result)


@router.get("/{kb_id}/d365/sync-status", response_model=List[D365SyncStateResponse])
async def d365_sync_status(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = await _get_owned_kb(kb_id, current_user, db)
    result = await db.execute(
        select(D365SyncState).where(D365SyncState.knowledge_base_id == kb.id)
    )
    states = result.scalars().all()
    return [
        D365SyncStateResponse(
            entity_name=s.entity_name,
            last_synced_at=s.last_synced_at.isoformat() if s.last_synced_at else None,
            last_sync_status=s.last_sync_status,
            last_sync_error=s.last_sync_error,
            records_synced_last_run=s.records_synced_last_run,
            records_synced_total=s.records_synced_total,
        )
        for s in states
    ]
