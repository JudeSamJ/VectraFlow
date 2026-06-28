from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import structlog

from app.dependencies import get_rag_orchestrator
from app.rag.pipeline.rag_orchestrator import RAGOrchestrator

logger = structlog.get_logger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    collection_name: str
    chat_history: Optional[List[Dict[str, str]]] = None

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, orchestrator: RAGOrchestrator = Depends(get_rag_orchestrator)):
    """
    SSE stream endpoint for chat completions.
    """
    logger.info("api_chat_request_received", query=request.query, collection=request.collection_name)
    
    # orchestrator.chat returns an AsyncGenerator yielding SSE strings
    generator = orchestrator.chat(
        query=request.query,
        collection_name=request.collection_name,
        chat_history=request.chat_history
    )
    
    return StreamingResponse(generator, media_type="text/event-stream")
