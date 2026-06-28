from typing import List, Any
import structlog
from app.rag.retrieval.reranker import ScoredChunk

logger = structlog.get_logger(__name__)

class BuiltContext:
    def __init__(self, prompt: str, used_chunks: List[ScoredChunk]):
        self.prompt = prompt
        self.used_chunks = used_chunks

class ContextBuilder:
    async def build(
        self, query: str, retrieved_chunks: List[ScoredChunk],
        conversation_history: List[Any], system_template: str
    ) -> BuiltContext:
        """
        1. Order chunks (by score, or by document position for coherence)
        2. Deduplicate near-identical chunks
        3. Token-budget the context
        4. Inject numbered source markers ([1], [2]...)
        5. Render final prompt
        """
        # Stub implementation
        prompt = system_template + "\n\nQuery: " + query
        return BuiltContext(prompt=prompt, used_chunks=retrieved_chunks)
