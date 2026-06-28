import json
import structlog
from typing import List, Dict, Any, AsyncGenerator
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.retrieval.base_retriever import RetrievedNode
from app.rag.generation.prompt_builder import PromptBuilder

logger = structlog.get_logger(__name__)

class GenerationEngine:
    """
    Generates the final response using the LLM and the retrieved context.
    Yields chunks of text for SSE streaming, followed by a final JSON payload containing citations.
    """
    def __init__(self, llm_provider: BaseLLMProvider, prompt_builder: PromptBuilder = None):
        self.llm = llm_provider
        self.prompt_builder = prompt_builder or PromptBuilder()
        
    async def generate_stream(self, query: str, nodes: List[RetrievedNode], chat_history: List[Dict[str, str]] = None) -> AsyncGenerator[str, None]:
        # 1. Build prompt and get citation mapping
        messages, citations = self.prompt_builder.build(query, nodes)
        
        # 2. Prepend chat history if provided (before the current query)
        if chat_history:
            # Insert chat history between system prompt and the final user query
            messages = [messages[0]] + chat_history + [messages[1]]
            
        logger.info("generation_started", citations_count=len(citations))
        
        # 3. Stream text from LLM
        try:
            async for chunk in self.llm.generate_stream(messages, temperature=0.3):
                # We yield the text chunk as a Server-Sent Event formatted string
                # e.g., data: {"text": "hello"}\n\n
                payload = json.dumps({"type": "text", "content": chunk})
                yield f"data: {payload}\n\n"
                
        except Exception as e:
            logger.error("generation_stream_failed", error=str(e))
            error_payload = json.dumps({"type": "error", "content": "Generation failed."})
            yield f"data: {error_payload}\n\n"
            return
            
        # 4. Stream final citation metadata
        citation_payload = json.dumps({"type": "citations", "metadata": citations})
        yield f"data: {citation_payload}\n\n"
        
        # 5. Signal completion
        yield "data: [DONE]\n\n"
