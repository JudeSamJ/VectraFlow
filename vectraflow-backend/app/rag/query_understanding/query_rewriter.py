import json
import structlog
from typing import List
from app.rag.embeddings.base_provider import BaseLLMProvider

logger = structlog.get_logger(__name__)

class QueryRewriter:
    """
    Transforms a raw user query into optimized search strings for semantic matching.
    """
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        
    async def rewrite(self, query: str) -> List[str]:
        system_prompt = (
            "You are a query optimization engine. "
            "Your task is to take the user's raw query and generate 1 to 3 optimized variations "
            "for vector database retrieval. "
            "1. Expand acronyms.\n"
            "2. Remove filler words.\n"
            "3. Rephrase to sound like a statement that would contain the answer.\n"
            "Return ONLY a JSON array of strings. Example: [\"Optimized query 1\", \"Optimized query 2\"]"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        try:
            response_text = ""
            async for chunk in self.llm.generate_stream(messages, temperature=0.1):
                response_text += chunk
                
            try:
                start = response_text.find("[")
                end = response_text.rfind("]") + 1
                if start != -1 and end != 0:
                    queries = json.loads(response_text[start:end])
                    if isinstance(queries, list) and len(queries) > 0 and isinstance(queries[0], str):
                        return queries
            except json.JSONDecodeError:
                pass
                
            return [query]
            
        except Exception as e:
            logger.error("query_rewrite_failed", error=str(e))
            return [query]
