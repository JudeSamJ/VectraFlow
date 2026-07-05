import structlog
from dataclasses import dataclass
from app.rag.embeddings.base_provider import BaseLLMProvider

logger = structlog.get_logger(__name__)

class GuardrailException(Exception):
    """Raised when a query is blocked by the guardrail filter."""
    pass

@dataclass
class GuardrailVerdict:
    is_safe: bool
    reason: str = ""

class GuardrailFilter:
    """
    Pre-retrieval input screening for prompt injection patterns.
    Runs BEFORE the Milvus call.
    """
    def __init__(self, llm: BaseLLMProvider):
        self.llm = llm
        
    async def check(self, query: str) -> GuardrailVerdict:
        """
        Detects malicious intent like "ignore the system prompt".
        """
        # Mock logic
        query_lower = query.lower()
        if "ignore the system prompt" in query_lower or "ignore previous instructions" in query_lower:
            logger.warning("guardrail_tripped", query=query, reason="prompt_injection")
            return GuardrailVerdict(is_safe=False, reason="Detected potential prompt injection.")
            
        if "reveal raw chunk text" in query_lower:
            logger.warning("guardrail_tripped", query=query, reason="data_exfiltration")
            return GuardrailVerdict(is_safe=False, reason="Detected data exfiltration attempt.")
            
        return GuardrailVerdict(is_safe=True)

    async def validate(self, query: str) -> bool:
        """Alias expected by RAGOrchestrator. Returns True if query is safe."""
        verdict = await self.check(query)
        if not verdict.is_safe:
            raise GuardrailException(verdict.reason)
        return True
