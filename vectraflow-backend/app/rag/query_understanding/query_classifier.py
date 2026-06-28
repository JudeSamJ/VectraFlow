import json
import structlog
from typing import List, Any
from app.rag.embeddings.base_provider import BaseLLMProvider
import enum

logger = structlog.get_logger(__name__)

class QueryIntent(str, enum.Enum):
    rag = "rag"
    chit_chat = "chit_chat"

class QueryClassifier:
    """
    Classifies a user query as either requiring retrieval ('rag') or just conversational ('chit-chat').
    """
    def __init__(self, llm_provider: BaseLLMProvider):
        self.llm = llm_provider
        
    async def classify(self, query: str, history: List[Any] = None) -> QueryIntent:
        system_prompt = (
            "You are a query classifier for a knowledge assistant. "
            "Determine if the user's query requires searching a knowledge base for facts/documents ('rag') "
            "or if it is just a conversational greeting/pleasantry ('chit-chat'). "
            "Return ONLY a JSON object with a single key 'intent' and value 'rag' or 'chit-chat'."
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        try:
            response_text = ""
            async for chunk in self.llm.generate_stream(messages, temperature=0.0):
                response_text += chunk
                
            try:
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start != -1 and end != 0:
                    data = json.loads(response_text[start:end])
                    intent = data.get("intent", "rag").lower()
                    if intent == "chit-chat" or intent == "chit_chat":
                        return QueryIntent.chit_chat
                    return QueryIntent.rag
            except json.JSONDecodeError:
                pass
                
            if "chit-chat" in response_text.lower() or "chit_chat" in response_text.lower():
                return QueryIntent.chit_chat
            return QueryIntent.rag
            
        except Exception as e:
            logger.error("query_classification_failed", error=str(e))
            return QueryIntent.rag
