from typing import List, Any
import structlog

logger = structlog.get_logger(__name__)

class SufficiencyChecker:
    async def check(self, original_query: str, gathered_context: List[Any]) -> bool:
        """
        LLM judges "do I have enough context to answer, or do I need another pass"
        """
        # Stub implementation defaults to True (sufficient)
        return True
