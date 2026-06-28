import os
import structlog
from typing import List
import cohere
from app.rag.retrieval.base_retriever import BaseReranker, RetrievedNode

logger = structlog.get_logger(__name__)

class CohereReranker(BaseReranker):
    """
    Reranks a list of retrieved nodes using Cohere's Rerank API.
    """
    def __init__(self, api_key: str = None, model_name: str = "rerank-english-v3.0"):
        api_key = api_key or os.getenv("COHERE_API_KEY", "dummy_key")
        # In a real environment, we'd use cohere.AsyncClient(api_key=api_key)
        # Using sync client wrapper or async depending on the SDK version
        self.client = cohere.AsyncClient(api_key=api_key)
        self.model_name = model_name
        
    async def rerank(self, query: str, nodes: List[RetrievedNode], top_n: int = 5) -> List[RetrievedNode]:
        if not nodes:
            return []
            
        # Deduplicate nodes by chunk_id just in case
        unique_nodes = {n.chunk_id: n for n in nodes}
        node_list = list(unique_nodes.values())
        
        docs = [node.text for node in node_list]
        
        try:
            # Cohere Rerank API call
            response = await self.client.rerank(
                query=query,
                documents=docs,
                top_n=top_n,
                model=self.model_name
            )
            
            reranked_nodes = []
            for result in response.results:
                original_node = node_list[result.index]
                # Update the score with the new cross-encoder score
                original_node.score = result.relevance_score
                reranked_nodes.append(original_node)
                
            return reranked_nodes
        except Exception as e:
            logger.error("cohere_rerank_failed", error=str(e), node_count=len(node_list))
            # Fallback: return original nodes sorted by their initial vector score
            sorted_nodes = sorted(node_list, key=lambda x: x.score, reverse=True)
            return sorted_nodes[:top_n]
