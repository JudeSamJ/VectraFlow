import asyncio
import structlog
from typing import List, Dict, Any
from app.rag.retrieval.base_retriever import BaseRetriever, BaseReranker, RetrievedNode

logger = structlog.get_logger(__name__)

class RetrievalEngine:
    """
    Orchestrates the retrieval process:
    1. Executes vector searches for multiple sub-queries in parallel.
    2. Deduplicates the results.
    3. Re-ranks the unified result set.
    """
    def __init__(self, retriever: BaseRetriever, reranker: BaseReranker):
        self.retriever = retriever
        self.reranker = reranker
        
    async def run(self, original_query: str, sub_queries: List[str], collection_name: str, top_k_per_query: int = 20, top_n_final: int = 5, filters: Dict[str, Any] = None) -> List[RetrievedNode]:
        if not sub_queries:
            sub_queries = [original_query]
            
        logger.info("retrieval_engine_started", original_query=original_query, sub_queries_count=len(sub_queries))
        
        # 1. Parallel Retrieval
        tasks = [
            self.retriever.retrieve(query=sq, collection_name=collection_name, top_k=top_k_per_query, filters=filters)
            for sq in sub_queries
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 2. Deduplication
        unique_nodes: Dict[str, RetrievedNode] = {}
        for query_result in results:
            if isinstance(query_result, Exception):
                logger.error("retrieval_task_failed", error=str(query_result))
                continue
                
            for node in query_result:
                # If a node is found multiple times, we keep the one with the highest initial score
                if node.chunk_id in unique_nodes:
                    if node.score > unique_nodes[node.chunk_id].score:
                        unique_nodes[node.chunk_id] = node
                else:
                    unique_nodes[node.chunk_id] = node
                    
        unified_nodes = list(unique_nodes.values())
        logger.info("retrieval_deduplicated", total_unique=len(unified_nodes))
        
        if not unified_nodes:
            return []
            
        # 3. Reranking
        # We rerank the unified nodes against the *original* user query, not the sub-queries
        reranked_nodes = await self.reranker.rerank(original_query, unified_nodes, top_n=top_n_final)
        
        logger.info("retrieval_engine_completed", final_count=len(reranked_nodes))
        return reranked_nodes
