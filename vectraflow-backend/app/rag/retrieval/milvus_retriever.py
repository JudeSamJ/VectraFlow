from typing import List, Dict, Any
import structlog
from app.rag.retrieval.base_retriever import BaseRetriever, RetrievedNode
from app.rag.embeddings.base_provider import BaseEmbeddingProvider
from app.rag.indexing.milvus_index_manager import MilvusIndexManager

logger = structlog.get_logger(__name__)

class MilvusRetriever(BaseRetriever):
    def __init__(self, embedder: BaseEmbeddingProvider, index_manager: MilvusIndexManager):
        self.embedder = embedder
        self.indexer = index_manager
        
    async def retrieve(self, query: str, collection_name: str, top_k: int = 20, filters: Dict[str, Any] = None) -> List[RetrievedNode]:
        try:
            # 1. Embed query
            query_vector = await self.embedder.embed_query(query)
            
            # 2. Build filter expression (stub)
            filter_expr = None
            if filters:
                # Basic mock logic for filter expression
                # e.g., if {"document_id": "123"}, expr = "document_id == '123'"
                conditions = []
                for k, v in filters.items():
                    if isinstance(v, str):
                        conditions.append(f"{k} == '{v}'")
                    else:
                        conditions.append(f"{k} == {v}")
                if conditions:
                    filter_expr = " and ".join(conditions)
                    
            # 3. Search Milvus
            output_fields = ["chunk_id", "text", "document_id", "page_number", "section_heading", "source_type", "tags"]
            raw_results = await self.indexer.search(
                collection_name=collection_name,
                query_vector=query_vector,
                top_k=top_k,
                filter_expr=filter_expr,
                output_fields=output_fields
            )
            
            nodes = []
            # raw_results from PyMilvus search is typically a SearchResult object containing Hits
            for hits in raw_results:
                for hit in hits:
                    metadata = {
                        "document_id": hit.entity.get("document_id"),
                        "page_number": hit.entity.get("page_number"),
                        "section_heading": hit.entity.get("section_heading"),
                        "source_type": hit.entity.get("source_type"),
                        "tags": hit.entity.get("tags")
                    }
                    nodes.append(RetrievedNode(
                        chunk_id=hit.entity.get("chunk_id"),
                        text=hit.entity.get("text"),
                        score=hit.score,
                        metadata=metadata
                    ))
                    
            return nodes
        except Exception as e:
            logger.error("milvus_retrieval_failed", error=str(e), collection=collection_name)
            return []
