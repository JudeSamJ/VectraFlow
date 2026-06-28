from abc import ABC, abstractmethod
from typing import List, Dict, Any
import structlog
from app.models.knowledge_base import KnowledgeBase

logger = structlog.get_logger(__name__)

class ScoredChunk:
    def __init__(self, chunk_id: str, text: str, score: float, metadata: Dict[str, Any]):
        self.chunk_id = chunk_id
        self.text = text
        self.score = score
        self.metadata = metadata
        self.rerank_score: float | None = None

class BaseReranker(ABC):
    @abstractmethod
    async def rerank(self, query: str, candidates: List[ScoredChunk], top_k: int) -> List[ScoredChunk]:
        """Rerank candidates using a cross-encoder"""
        pass

class DummyReranker(BaseReranker):
    """Fallback if reranking is enabled but no provider configured."""
    async def rerank(self, query: str, candidates: List[ScoredChunk], top_k: int) -> List[ScoredChunk]:
        return candidates[:top_k]
