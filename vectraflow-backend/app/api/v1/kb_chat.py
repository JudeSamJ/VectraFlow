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
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status as http_status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document, DocumentStatus, SourceType
from app.models.conversation import Conversation, Message, MessageRole
from app.api.deps import get_current_user
from app.dependencies import get_rag_orchestrator, get_retrieval_engine, get_milvus_index_manager, get_llm_provider
from app.rag.generation.base_llm_provider import BaseLLMProvider
from app.rag.pipeline.rag_orchestrator import RAGOrchestrator
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.indexing.milvus_index_manager import MilvusIndexManager
from app.services.capacity_service import total_storage_bytes
from app.core.audit import record_audit_log

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


class SampleQueriesResponse(BaseModel):
    queries: List[str]


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
    pipeline_error: Optional[str] = None

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
                        pipeline_error = payload.get("content") or "The RAG pipeline reported an error."
                        logger.error("sync_chat_pipeline_error", error=pipeline_error, kb_id=str(kb_id))
                        break
                except Exception:
                    pass
    except Exception as exc:
        logger.error("sync_chat_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {exc}")

    if pipeline_error:
        raise HTTPException(status_code=502, detail=pipeline_error)

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

    await record_audit_log(
        action="chat.query",
        user_id=current_user.id,
        knowledge_base_id=kb_id,
        resource_type="conversation",
        resource_id=str(conv.id) if conv else None,
        detail={"query": req.query[:500]},
    )

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
        # RetrievedNode uses chunk_id/text/metadata — map to the shape the
        # frontend's Chunk type expects (id/content/document_id/etc.), which
        # a raw r.__dict__ dump never matched.
        serialized = [
            {
                "id": r.chunk_id,
                "document_id": r.metadata.get("document_id"),
                "content": r.text,
                "page_number": r.metadata.get("page_number"),
                "score": r.score,
                "source": r.metadata.get("section_heading") or r.metadata.get("document_id") or "",
            }
            for r in results
        ]
        return {"results": serialized, "count": len(serialized)}
    except Exception as exc:
        logger.error("retrieve_error", error=str(exc))
        raise HTTPException(status_code=500, detail=f"Retrieval error: {exc}")


# ─────────────────────────────────────────────
# Chunk Inspector — browse indexed chunks straight from Zilliz/Milvus
# ─────────────────────────────────────────────

@router.get("/{kb_id}/chunks")
async def list_kb_chunks(
    kb_id: uuid.UUID,
    limit: int = 25,
    offset: int = 0,
    document_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    index_manager: MilvusIndexManager = Depends(get_milvus_index_manager),
):
    kb = await _get_kb(kb_id, current_user, db)
    limit = max(1, min(limit, 100))
    try:
        rows = await index_manager.list_chunks(
            kb.milvus_collection_name,
            limit=limit,
            offset=offset,
            document_id=str(document_id) if document_id else None,
        )
    except Exception as exc:
        logger.error("list_chunks_failed", kb_id=str(kb_id), error=str(exc))
        raise HTTPException(status_code=500, detail=f"Failed to list chunks: {exc}")

    return {
        "chunks": [
            {
                "chunk_id": row.get("chunk_id"),
                "document_id": row.get("document_id"),
                "text": row.get("text"),
                "chunk_index": row.get("chunk_index"),
                "page_number": row.get("page_number"),
                "section_heading": row.get("section_heading"),
                "token_count": row.get("token_count"),
            }
            for row in rows
        ],
        "total": kb.chunk_count,
        "has_more": len(rows) == limit,
    }


# ─────────────────────────────────────────────
# Sample Queries — LLM-suggested example searches for this KB
# ─────────────────────────────────────────────

@router.get("/{kb_id}/sample-queries", response_model=SampleQueriesResponse)
async def sample_queries(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    index_manager: MilvusIndexManager = Depends(get_milvus_index_manager),
    llm: BaseLLMProvider = Depends(get_llm_provider),
):
    kb = await _get_kb(kb_id, current_user, db)
    if kb.document_count == 0:
        return SampleQueriesResponse(queries=[])

    result = await db.execute(
        select(Document).where(
            Document.knowledge_base_id == kb_id,
            Document.deleted_at.is_(None),
            Document.status == DocumentStatus.ready,
        )
    )
    docs = result.scalars().all()
    if not docs:
        return SampleQueriesResponse(queries=[])

    # Pull chunks from EVERY document (via a scalar Milvus query filtered per
    # document_id), not from a single semantic search seeded by the KB's
    # name/description — that biased retrieval toward whichever one document
    # scored best, so a KB with several unrelated documents only ever
    # produced suggestions about one of them.
    per_doc_chunks = max(1, 6 // len(docs))
    excerpts = []
    for doc in docs:
        try:
            rows = await index_manager.list_chunks(
                kb.milvus_collection_name, limit=per_doc_chunks, offset=0, document_id=str(doc.id)
            )
        except Exception as exc:
            logger.warning("sample_queries_chunk_fetch_failed", kb_id=str(kb_id), doc_id=str(doc.id), error=str(exc))
            continue
        for row in rows:
            text = row.get("text")
            if text:
                excerpts.append(f'[From "{doc.filename}"]\n{text[:400]}')

    if not excerpts:
        return SampleQueriesResponse(queries=[])

    context = "\n\n".join(excerpts)
    system_prompt = (
        "You suggest example search queries for a document retrieval system. "
        "Given excerpts from MULTIPLE documents in a knowledge base (each labeled with its "
        "source document), propose short, natural questions a user could type to search it — "
        "cover a MIX of the different documents/topics shown, not just one, roughly "
        "proportional to how many documents are represented. Return ONLY a JSON array of "
        "exactly 5 short strings — no prose, no numbering, no markdown fences."
    )
    try:
        raw = await llm.generate(prompt=context, system_prompt=system_prompt, temperature=0.6)
        import json
        import re
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        parsed = json.loads(match.group(0)) if match else []
        queries = [str(q).strip() for q in parsed if str(q).strip()][:5]
    except Exception as exc:
        logger.warning("sample_queries_generation_failed", kb_id=str(kb_id), error=str(exc))
        queries = []

    return SampleQueriesResponse(queries=queries)


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
    index_manager: MilvusIndexManager = Depends(get_milvus_index_manager),
):
    kb = await _get_kb(kb_id, current_user, db)
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

    # Actually free the underlying bytes — soft-deleting only the Postgres
    # row would leave the file's size still counted against the app-wide
    # storage cap, so "delete a document to free up space" wouldn't work.
    if os.path.isabs(doc.storage_path):
        # storage_path is a local on-disk fallback path (cloud upload failed
        # at ingest time), not a Cloudinary key — remove the local file instead.
        try:
            os.remove(doc.storage_path)
        except OSError as exc:
            logger.warning("local_file_delete_failed", doc_id=str(doc_id), path=doc.storage_path, error=str(exc))
    else:
        try:
            from app.services.storage_service import storage_service
            await storage_service.delete_file(doc.storage_path)
        except Exception as exc:
            logger.warning("cloud_delete_failed", doc_id=str(doc_id), key=doc.storage_path, error=str(exc))

    # Remove the document's chunks from Zilliz/Milvus too — otherwise a
    # "deleted" document's content stays retrievable (and rerankable,
    # citable) in chat/retrieval indefinitely.
    try:
        await index_manager.delete_by_document(kb.milvus_collection_name, doc_id)
    except Exception as exc:
        logger.warning(
            "milvus_chunk_delete_failed",
            doc_id=str(doc_id),
            collection=kb.milvus_collection_name,
            error=str(exc),
        )

    await record_audit_log(
        action="document.delete",
        user_id=current_user.id,
        knowledge_base_id=kb_id,
        resource_type="document",
        resource_id=str(doc_id),
        detail={"filename": doc.filename},
    )


# ─────────────────────────────────────────────
# Document Upload
# ─────────────────────────────────────────────

@router.post("/{kb_id}/documents/upload", response_model=List[DocumentResponse])
async def upload_documents(
    kb_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    kb = await _get_kb(kb_id, current_user, db)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Read everything up front so we can size-check the whole batch before
    # writing anything to disk/cloud storage — reject atomically rather than
    # uploading some files and then failing partway through.
    contents: List[bytes] = [await f.read() for f in files]
    incoming_bytes = sum(len(c) for c in contents)

    used_bytes = await total_storage_bytes(db)
    if used_bytes + incoming_bytes > settings.MAX_TOTAL_STORAGE_BYTES:
        raise HTTPException(
            status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Storage limit reached: this upload needs {incoming_bytes / (1024 * 1024):.1f} MB, but "
                f"only {(settings.MAX_TOTAL_STORAGE_BYTES - used_bytes) / (1024 * 1024):.1f} MB remain of the "
                f"{settings.MAX_TOTAL_STORAGE_BYTES / (1024 ** 3):.0f} GB app-wide storage cap "
                "(this app runs on Cloudinary's free tier, shared across all users). "
                "Delete some documents or an existing knowledge base to free up space."
            ),
        )

    created_docs: List[Document] = []

    for file, content in zip(files, contents):
        content_hash = hashlib.sha256(content).hexdigest()
        file_size = len(content)

        file_id = uuid.uuid4()
        ext = os.path.splitext(file.filename or "")[1]
        storage_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

        async with aiofiles.open(storage_path, "wb") as f:
            await f.write(content)

        # Upload to Cloudinary for durable storage
        object_key = f"documents/{kb.id}/{file_id}{ext}"
        try:
            from app.services.storage_service import storage_service
            await storage_service.upload_file(
                object_name=object_key,
                file_data=content,
                content_type=file.content_type or "application/octet-stream",
            )
            permanent_path = object_key
        except Exception as upload_err:
            logger.warning("cloud_upload_skipped", error=str(upload_err), fallback=storage_path)
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

    for doc in created_docs:
        background_tasks.add_task(
            record_audit_log,
            action="document.upload",
            user_id=current_user.id,
            knowledge_base_id=kb.id,
            resource_type="document",
            resource_id=str(doc.id),
            detail={"filename": doc.filename, "file_size_bytes": doc.file_size_bytes},
        )

    # Process ingestion in-process, after the response is sent — no Celery
    # worker required (see comment on run_ingestion for why).
    from app.tasks.ingestion_tasks import run_ingestion
    for doc in created_docs:
        background_tasks.add_task(
            run_ingestion,
            temp_file_path=doc.storage_path,
            collection_name=kb.milvus_collection_name,
            original_filename=doc.filename,
            content_type=doc.mime_type,
            doc_id=str(doc.id),
            pipeline_config=kb.pipeline_config,
        )
        logger.info("ingestion_task_scheduled", doc_id=str(doc.id), collection=kb.milvus_collection_name)

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
