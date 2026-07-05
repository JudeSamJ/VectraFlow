from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document, DocumentStatus
from app.api.deps import get_current_user

router = APIRouter()

# In-memory circuit breaker state (resets on server restart — good enough for now)
_cb_state: dict[str, dict] = {
    "embedding-service": {"state": "closed", "failure_count": 0, "last_failure_at": None},
    "llm-provider":      {"state": "closed", "failure_count": 0, "last_failure_at": None},
    "milvus":            {"state": "closed", "failure_count": 0, "last_failure_at": None},
    "reranker":          {"state": "closed", "failure_count": 0, "last_failure_at": None},
}


class CircuitBreaker(BaseModel):
    name: str
    state: str
    failure_count: int
    last_failure_at: str | None


class DLQEntry(BaseModel):
    id: str
    filename: str
    knowledge_base_id: str
    knowledge_base_name: str
    error_message: str | None
    created_at: str


@router.get("/dlq", response_model=list[DLQEntry])
async def list_dlq(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document, KnowledgeBase)
        .join(KnowledgeBase, Document.knowledge_base_id == KnowledgeBase.id)
        .where(
            KnowledgeBase.owner_id == current_user.id,
            Document.status == DocumentStatus.failed,
            Document.deleted_at.is_(None),
        )
        .order_by(Document.created_at.desc())
        .limit(50)
    )
    rows = result.all()
    return [
        DLQEntry(
            id=str(doc.id),
            filename=doc.filename,
            knowledge_base_id=str(kb.id),
            knowledge_base_name=kb.name,
            error_message=doc.error_message,
            created_at=doc.created_at.isoformat() if doc.created_at else "",
        )
        for doc, kb in rows
    ]


@router.get("/circuit-breakers", response_model=list[CircuitBreaker])
async def list_circuit_breakers(
    current_user: User = Depends(get_current_user),
):
    return [CircuitBreaker(name=name, **data) for name, data in _cb_state.items()]


@router.post("/circuit-breakers/{name}/trip")
async def trip_circuit_breaker(
    name: str,
    current_user: User = Depends(get_current_user),
):
    if name not in _cb_state:
        raise HTTPException(status_code=404, detail="Circuit breaker not found")
    _cb_state[name]["state"] = "open"
    return {"name": name, "state": "open"}


@router.post("/circuit-breakers/{name}/reset")
async def reset_circuit_breaker(
    name: str,
    current_user: User = Depends(get_current_user),
):
    if name not in _cb_state:
        raise HTTPException(status_code=404, detail="Circuit breaker not found")
    _cb_state[name]["state"] = "closed"
    _cb_state[name]["failure_count"] = 0
    return {"name": name, "state": "closed"}


@router.post("/dlq/{entry_id}/retry")
async def retry_dlq(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid
    try:
        doc_uuid = uuid.UUID(entry_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document id")

    result = await db.execute(
        select(Document, KnowledgeBase)
        .join(KnowledgeBase, Document.knowledge_base_id == KnowledgeBase.id)
        .where(Document.id == doc_uuid, KnowledgeBase.owner_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    doc, kb = row

    doc.status = DocumentStatus.pending
    doc.error_message = None
    await db.commit()

    from app.tasks.ingestion_tasks import process_document_task
    process_document_task.delay(
        temp_file_path=doc.storage_path,
        collection_name=kb.milvus_collection_name,
        original_filename=doc.filename,
        content_type=doc.mime_type,
        doc_id=str(doc.id),
    )
    return {"id": entry_id, "status": "queued"}
