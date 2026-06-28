from typing import List, Dict, Any, Tuple
import structlog
from app.rag.retrieval.base_retriever import RetrievedNode
from app.core.token_counter import token_counter

logger = structlog.get_logger(__name__)

class PromptBuilder:
    """
    Constructs the final prompt with context for the LLM.
    """
    def __init__(self, max_context_tokens: int = 4000):
        self.max_context_tokens = max_context_tokens
        
    def build(self, query: str, nodes: List[RetrievedNode]) -> Tuple[List[Dict[str, Any]], Dict[int, Any]]:
        """
        Returns:
            - The messages list to send to the LLM.
            - A dictionary mapping citation ID (e.g. 1) to the document metadata.
        """
        citations = {}
        context_parts = []
        current_tokens = 0
        
        # Build the context block
        for i, node in enumerate(nodes):
            citation_id = i + 1
            node_text = (
                f"<document id=\"{citation_id}\">\n"
                f"{node.text}\n"
                f"</document>\n"
            )
            node_tokens = token_counter.count(node_text)
            
            if current_tokens + node_tokens > self.max_context_tokens:
                logger.warning("context_window_limit_reached", dropped_nodes=len(nodes)-i)
                break
                
            context_parts.append(node_text)
            current_tokens += node_tokens
            
            # Store metadata for the frontend
            citations[citation_id] = {
                "chunk_id": node.chunk_id,
                "document_id": node.metadata.get("document_id"),
                "page_number": node.metadata.get("page_number"),
                "section_heading": node.metadata.get("section_heading"),
                "score": node.score
            }
            
        context_str = "\n".join(context_parts)
        
        system_prompt = (
            "You are an expert AI knowledge assistant. You will be provided with retrieved context documents.\n"
            "Your task is to answer the user's query based ONLY on the provided documents. "
            "If the answer is not in the documents, state that you do not know. Do not hallucinate.\n"
            "You MUST cite your sources using bracketed markdown notation. "
            "For example, if you use information from <document id=\"1\">, append [1] to the end of the sentence.\n"
            "If you use multiple documents, cite them together like [1][2].\n\n"
            "--- CONTEXT DOCUMENTS ---\n"
            f"{context_str}\n"
            "-------------------------\n"
        )
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        return messages, citations
