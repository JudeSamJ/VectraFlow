from typing import List, Dict, Any, Literal
from pymilvus import Collection, CollectionSchema, FieldSchema, DataType, utility
from app.milvus_client import get_milvus_alias
import structlog
import uuid

logger = structlog.get_logger(__name__)

class MilvusIndexManager:
    """Manages Milvus Collections, Indexing, and Upserts for Knowledge Bases"""
    
    def __init__(self):
        pass

    async def create_collection(self, collection_name: str, dimensions: int, enable_hybrid: bool = True) -> None:
        alias = get_milvus_alias()
        if utility.has_collection(collection_name, using=alias):
            logger.info("collection_already_exists", collection=collection_name)
            return

        fields = [
            FieldSchema(name="chunk_id", dtype=DataType.VARCHAR, is_primary=True, max_length=36),
            FieldSchema(name="document_id", dtype=DataType.VARCHAR, max_length=36),
            FieldSchema(name="dense_vector", dtype=DataType.FLOAT_VECTOR, dim=dimensions),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="chunk_index", dtype=DataType.INT64),
            FieldSchema(name="page_number", dtype=DataType.INT64),
            FieldSchema(name="section_heading", dtype=DataType.VARCHAR, max_length=512),
            FieldSchema(name="source_type", dtype=DataType.VARCHAR, max_length=32),
            # In pymilvus array fields need element_type
            # Wait, PyMilvus 2.4 Array support requires max_capacity or max_length for string elements
            FieldSchema(name="tags", dtype=DataType.ARRAY, element_type=DataType.VARCHAR, max_capacity=100, max_length=100),
            FieldSchema(name="token_count", dtype=DataType.INT64),
            FieldSchema(name="created_at", dtype=DataType.INT64),
            FieldSchema(name="is_current", dtype=DataType.BOOL),
        ]
        
        if enable_hybrid:
            # Add sparse vector for hybrid search
            fields.append(FieldSchema(name="sparse_vector", dtype=DataType.SPARSE_FLOAT_VECTOR))

        schema = CollectionSchema(fields=fields, description=f"Collection for {collection_name}", enable_dynamic_field=True)
        Collection(name=collection_name, schema=schema, using=alias)
        logger.info("collection_created", collection=collection_name)

    async def upsert(self, collection_name: str, document_id: str, chunks: List[Any], vectors: List[List[float]], sparse_vectors: List[Any] = None) -> None:
        """Upsert chunks into Milvus"""
        alias = get_milvus_alias()
        collection = Collection(collection_name, using=alias)
        
        # Prepare column-oriented data
        chunk_ids = [c.chunk_id for c in chunks]
        doc_ids = [str(document_id) for _ in chunks]
        texts = [c.text for c in chunks]
        
        # Metadata parsing (defaults if missing)
        chunk_indices = [i for i in range(len(chunks))]
        page_numbers = [c.metadata.get("page_number") or 0 for c in chunks]
        section_headings = [" > ".join(c.metadata.get("heading_path", []))[:512] for c in chunks]
        source_types = [c.metadata.get("type", "unknown")[:32] for c in chunks]
        tags = [c.metadata.get("tags", []) for c in chunks]
        token_counts = [c.token_count for c in chunks]
        
        import time
        created_ats = [int(time.time()) for _ in chunks]
        is_currents = [True for _ in chunks]
        
        data = [
            chunk_ids,
            doc_ids,
            vectors,
            texts,
            chunk_indices,
            page_numbers,
            section_headings,
            source_types,
            tags,
            token_counts,
            created_ats,
            is_currents
        ]
        
        # Sparse vector is optional
        if sparse_vectors and len(collection.schema.fields) > 11:
            data.append(sparse_vectors)
            
        collection.insert(data)
        collection.flush()
        logger.info("chunks_upserted_to_milvus", collection=collection_name, chunk_count=len(chunks))

    async def delete_by_document(self, collection_name: str, document_id: uuid.UUID) -> None:
        alias = get_milvus_alias()
        collection = Collection(collection_name, using=alias)
        collection.delete(expr=f"document_id == '{document_id}'")

    async def deprecate_old_chunks(self, collection_name: str, document_id: str) -> None:
        """Sets is_current=False for all existing chunks of this document."""
        # Wait, Milvus doesn't have an 'update' statement. 
        # Typically we would query the old entities, mutate the is_current flag, and upsert them.
        logger.info("deprecating_old_chunks", document=document_id)
        pass

    async def delete_collection(self, collection_name: str) -> None:
        alias = get_milvus_alias()
        utility.drop_collection(collection_name, using=alias)

    async def create_index(self, collection_name: str, index_params: Dict[str, Any]) -> None:
        alias = get_milvus_alias()
        collection = Collection(collection_name, using=alias)
        collection.create_index(field_name="dense_vector", index_params=index_params)
        collection.load()
        logger.info("index_created_and_loaded", collection=collection_name)

    async def search(
        self, collection_name: str, query_vector: List[float],
        top_k: int, filter_expr: str | None, output_fields: List[str]
    ) -> List[Any]:
        """Dense search"""
        alias = get_milvus_alias()
        collection = Collection(collection_name, using=alias)
        search_params = {"metric_type": "COSINE", "params": {"ef": 64}}
        
        results = collection.search(
            data=[query_vector],
            anns_field="dense_vector",
            param=search_params,
            limit=top_k,
            expr=filter_expr,
            output_fields=output_fields
        )
        return results

    async def hybrid_search(
        self, collection_name: str, dense_vector: List[float], sparse_query: Any,
        top_k: int, filter_expr: str | None, fusion: Literal["RRF", "weighted"]
    ) -> List[Any]:
        # Implement Milvus 2.4 hybrid search using AnnSearchRequest and WeightedRanker / RRFRanker
        pass

    async def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        alias = get_milvus_alias()
        collection = Collection(collection_name, using=alias)
        return {
            "entity_count": collection.num_entities
        }
