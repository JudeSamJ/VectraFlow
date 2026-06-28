import structlog
from typing import List
from pydantic import UUID4
from app.rag.embeddings.base_provider import BaseEmbeddingProvider

logger = structlog.get_logger(__name__)

class KBRouter:
    """
    Routes a query to the most relevant Knowledge Base(s) when none is explicitly provided.
    """
    def __init__(self, embedder: BaseEmbeddingProvider):
        self.embedder = embedder
        
    async def route(self, query: str, available_kbs: List[UUID4]) -> List[UUID4]:
        """
        Calculates similarity between query embedding and KB centroid embeddings.
        Returns top relevant KBs.
        """
        logger.info("kb_router_invoked", num_available=len(available_kbs))
        # Mock logic
        if not available_kbs:
            return []
            
        # Return the first one as a mock "best match"
        return [available_kbs[0]]
