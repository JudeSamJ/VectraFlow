"""
Routes under /knowledge-bases/{kb_id}/:
  POST /{kb_id}/chat/sync          — synchronous RAG answer
  POST /{kb_id}/retrieve           — raw retrieval (no generation)
  POST /{kb_id}/documents/upload   — upload files, create Document rows
  GET  /{kb_id}/documents/{doc_id}/status — poll ingestion status
"""
import uuid
import hashlib
import os
import time
from typing import List, Optional

import aiofiles
import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status as http_status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document, DocumentStatus, SourceType
from app.models.conversation import Conversation, Message, MessageRole
from app.api.deps import get_current_user
from app.dependencies import get_rag_orchestrator, get_retrieval_engine
from app.rag.pipeline.rag_orchestrator import RAGOrchestrator
from app.rag.retrieval.retrieval_engine import RetrievalEngine

logger = structlog.get_logger(__name__)
router = APIRouter()

UPLOAD_DIR = os.path.join(os.environ.get("TEMP", "/tmp"), "synapse_uploads")


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class SyncChatRequest(BaseModel):
    query: str
    conversation_id: Optional[uuid.UUID] = None
    chat_history: Optional[List[dict]] = None


class SyncChatResponse(BaseModel):
    answer: str
    citations: List[dict] = []
    conversation_id: Optional[uuid.UUID] = None


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    strategy: str = "hybrid"
    rerank: bool = True


class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    status: DocumentStatus
    file_size_bytes: int
    created_at: str

    class Config:
        from_attributes = True


class DocumentStatusResponse(BaseModel):
    id: uuid.UUID
    status: DocumentStatus
    error_message: Optional[str] = None
    chunk_count: int = 0


class DocumentListResponse(BaseModel):
    id: uuid.UUID
    filename: str
    mime_type: str
    status: DocumentStatus
    file_size_bytes: int
    chunk_count: int
    error_message: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

async def _get_kb(kb_id: uuid.UUID, user: User, db: AsyncSession) -> KnowledgeBase:
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


# ─────────────────────────────────────────────
# Sync Chat
# ─────────────────────────────────────────────

@router.post("/{kb_id}/chat/sync", response_model=SyncChatResponse)
async def sync_chat(
    kb_id: uuid.UUID,
    req: SyncChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    orchestrator: RAGOrchestrator = Depends(get_rag_orchestrator),
):
    kb = await _get_kb(kb_id, current_user, db)

    # Resolve conversation
    conv = None
    if req.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == req.conversation_id,
                Conversation.owner_id == current_user.id,
            )
        )
        conv = result.scalars().first()

    # Build chat history from conversation messages
    history = req.chat_history or []
    if conv and not history:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
        )
        msgs = result.scalars().all()
        history = [{"role": m.role.value, "content": m.content} for m in msgs]

    # Collect full SSE stream and extract answer + citations
    answer_parts: List[str] = []
    citations: List[dict] = []

    try:
        async for event_str in orchestrator.chat(
            query=req.query,
            collection_name=kb.milvus_collection_name,
            chat_history=history,
        ):
            # events are "data: {json}\n\n"
            if event_str.startswith("data: "):
                import json
                payload_str = event_str[6:].strip()
                try:
                    payload = json.loads(payload_str)
                    etype = payload.get("type") or payload.get("event")
                    # GenerationEngine yields {"type": "text", "content": chunk}
                    if etype in ("text", "generation_token"):
                        answer_parts.append(payload.get("content") or payload.get("token", ""))
                    elif etype == "citations":
                        raw = payload.get("citations") or payload.get("metadata") or []
                        citations = raw if isinstance(raw, list) else list(raw.values()) if isinstance(raw, dict) else []
                    elif etype == "done" or payload_str == "[DONE]":
                        break
                    elif etype == "error":
                        break
                except Exception:
                    pass
    except Exception as exc:
        logger.error("sync_chat_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {exc}")

    answer = "".join(answer_parts)

    # Persist messages if conversation exists
    if conv:
        from datetime import datetime, timezone
        db.add(Message(conversation_id=conv.id, role=MessageRole.user, content=req.query))
        db.add(Message(
            conversation_id=conv.id,
            role=MessageRole.assistant,
            content=answer,
            citations={"items": citations},
        ))
        conv.updated_at = datetime.now(timezone.utc)
        await db.commit()

    return SyncChatResponse(
        answer=answer,
        citations=citations,
        conversation_id=conv.id if conv else None,
    )


# ─────────────────────────────────────────────
# Retrieve
# ─────────────────────────────────────────────

@router.post("/{kb_id}/retrieve")
async def retrieve(
    kb_id: uuid.UUID,
    req: RetrieveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    retrieval_engine: RetrievalEngine = Depends(get_retrieval_engine),
):
    kb = await _get_kb(kb_id, current_user, db)
    try:
        results = await retrieval_engine.run(
            original_query=req.query,
            sub_queries=[req.query],
            collection_name=kb.milvus_collection_name,
            top_k_per_query=req.top_k,
            top_n_final=req.top_k,
        )
        return {"results": [r.__dict__ for r in results], "count": len(results)}
    except Exception as exc:
        logger.error("retrieve_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Retrieval error: {exc}")


# ─────────────────────────────────────────────
# Document List
# ─────────────────────────────────────────────

@router.get("/{kb_id}/documents", response_model=List[DocumentListResponse])
async def list_documents(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_kb(kb_id, current_user, db)
    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == kb_id, Document.deleted_at.is_(None))
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentListResponse(
            id=doc.id,
            filename=doc.filename,
            mime_type=doc.mime_type,
            status=doc.status,
            file_size_bytes=doc.file_size_bytes,
            chunk_count=doc.chunk_count,
            error_message=doc.error_message,
            created_at=doc.created_at.isoformat(),
        )
        for doc in docs
    ]


# ─────────────────────────────────────────────
# Document Delete
# ─────────────────────────────────────────────

@router.delete("/{kb_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_kb(kb_id, current_user, db)
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.knowledge_base_id == kb_id,
        )
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    from datetime import datetime, timezone
    doc.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─────────────────────────────────────────────
# Document Upload
# ─────────────────────────────────────────────

@router.post("/{kb_id}/documents/upload", response_model=List[DocumentResponse])
async def upload_documents(
    kb_id: uuid.UUID,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = await _get_kb(kb_id, current_user, db)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    created_docs: List[Document] = []

    for file in files:
        content = await file.read()
        content_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        file_id = uuid.uuid4()
        ext = os.path.splitext(file.filename or "")[1]
        storage_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

        async with aiofiles.open(storage_path, "wb") as f:
            await f.write(content)

        # Upload to S3 for durable storage
        s3_key = f"documents/{kb.id}/{file_id}{ext}"
        try:
            from app.services.storage_service import storage_service
            await storage_service.upload_file(
                object_name=s3_key,
                file_data=content,
                content_type=file.content_type or "application/octet-stream",
            )
            permanent_path = s3_key
        except Exception as s3_err:
            logger.warning("s3_upload_skipped", error=str(s3_err), fallback=storage_path)
            permanent_path = storage_path

        doc = Document(
            knowledge_base_id=kb.id,
            filename=file.filename or f"upload_{file_id}",
            mime_type=file.content_type or "application/octet-stream",
            source_type=SourceType.upload,
            storage_path=permanent_path,
            file_size_bytes=file_size,
            content_hash=content_hash,
            status=DocumentStatus.pending,
        )
        db.add(doc)
        created_docs.append(doc)

    await db.commit()
    for doc in created_docs:
        await db.refresh(doc)

    # Dispatch ingestion tasks (best-effort; requires Celery worker running)
    for doc in created_docs:
        try:
            from app.tasks.ingestion_tasks import process_document_task
            process_document_task.delay(
                temp_file_path=doc.storage_path,
                collection_name=kb.milvus_collection_name,
                original_filename=doc.filename,
                content_type=doc.mime_type,
                doc_id=str(doc.id),
                pipeline_config=kb.pipeline_config,
            )
            logger.info("ingestion_task_dispatched", doc_id=str(doc.id), collection=kb.milvus_collection_name)
        except Exception as exc:
            logger.warning("ingestion_dispatch_failed", doc_id=str(doc.id), error=str(exc))

    return [
        DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            status=doc.status,
            file_size_bytes=doc.file_size_bytes,
            created_at=doc.created_at.isoformat(),
        )
        for doc in created_docs
    ]


# ─────────────────────────────────────────────
# Document Status
# ─────────────────────────────────────────────

@router.get("/{kb_id}/documents/{doc_id}/status", response_model=DocumentStatusResponse)
async def document_status(
    kb_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_kb(kb_id, current_user, db)  # verify ownership

    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.knowledge_base_id == kb_id,
        )
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentStatusResponse(
        id=doc.id,
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=doc.chunk_count,
    )
