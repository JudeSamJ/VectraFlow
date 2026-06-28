from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import structlog
from typing import Optional

from app.rag.agentic.retrieval_agent import RetrievalAgent, AgentPlanner, SufficiencyChecker
from app.rag.agentic.loop_guard import LoopGuard
from app.dependencies import get_retrieval_engine, get_generation_engine, get_embedding_provider

logger = structlog.get_logger(__name__)
router = APIRouter()

class AgenticQueryRequest(BaseModel):
    query: str

def get_retrieval_agent(
    retrieval_engine = Depends(get_retrieval_engine),
    generation_engine = Depends(get_generation_engine),
    llm = Depends(get_embedding_provider)
) -> RetrievalAgent:
    return RetrievalAgent(
        planner=AgentPlanner(llm),
        sufficiency_checker=SufficiencyChecker(llm),
        retrieval_engine=retrieval_engine,
        generation_engine=generation_engine,
        loop_guard=LoopGuard()
    )

@router.post("/{kb_id}/agentic-query")
async def agentic_query_endpoint(
    kb_id: str, 
    request: AgenticQueryRequest, 
    agent: RetrievalAgent = Depends(get_retrieval_agent)
):
    """
    SSE stream endpoint for multi-hop agentic queries.
    """
    logger.info("api_agentic_query_received", query=request.query, kb=kb_id)
    
    generator = agent.run_stream(request.query, kb_id)
    return StreamingResponse(generator, media_type="text/event-stream")

@router.get("/agentic-runs/{run_id}")
async def get_agentic_run(run_id: str):
    """
    Returns the full trace of an agentic run for debugging.
    """
    return {"id": run_id, "status": "stub", "trace": {}}
