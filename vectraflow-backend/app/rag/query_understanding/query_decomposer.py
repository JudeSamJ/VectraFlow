import structlog
from typing import List
from app.rag.embeddings.base_provider import BaseLLMProvider

logger = structlog.get_logger(__name__)

class QueryDecomposer:
    """
    Decomposes complex comparative or multi-hop queries into discrete sub-questions.
    Feeds the Agentic path (Module 14).
    """
    def __init__(self, llm: BaseLLMProvider):
        self.llm = llm
        
    async def decompose(self, query: str) -> List[str]:
        """
        Example: "Compare clause X in contract A and contract B" 
        -> ["What does clause X say in contract A?", "What does clause X say in contract B?"]
        """
        sys_prompt = "You decompose complex questions into independent sub-questions. Return them separated by a pipe '|'."
        messages = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": query}]
        
        # Mocking LLM logic for now
        # In reality, this parses the `resp` string splitting by '|'
        if "compare" in query.lower():
            logger.info("query_decomposed", original=query, type="comparative")
            return ["What does contract A say about this?", "What does contract B say about this?"]
            
        return [query]
