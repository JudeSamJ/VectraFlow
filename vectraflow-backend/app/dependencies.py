import os
from functools import lru_cache
from typing import AsyncGenerator
import structlog
from fastapi import Request

from app.database import get_db_session
from app.rag.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.rag.indexing.milvus_index_manager import MilvusIndexManager
from app.rag.retrieval.milvus_retriever import MilvusRetriever
from app.rag.retrieval.cohere_reranker import CohereReranker
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.query_understanding.guardrail_filter import GuardrailFilter
from app.rag.query_understanding.query_classifier import QueryClassifier
from app.rag.query_understanding.query_rewriter import QueryRewriter
from app.rag.query_understanding.query_decomposer import QueryDecomposer
from app.rag.generation.generation_engine import GenerationEngine
from app.rag.pipeline.rag_orchestrator import RAGOrchestrator
from app.rag.pipeline.ingestion_pipeline import IngestionPipeline
from app.rag.parsing.parser_factory import ParserFactory
from app.rag.chunking.semantic_chunker import SemanticChunker

logger = structlog.get_logger(__name__)

# --- Singleton Providers ---

@lru_cache()
def get_embedding_provider() -> OpenAIEmbeddingProvider:
    # We could also read model config from settings here
    api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
    return OpenAIEmbeddingProvider(api_key=api_key)

@lru_cache()
def get_milvus_index_manager() -> MilvusIndexManager:
    return MilvusIndexManager()

@lru_cache()
def get_cohere_reranker() -> CohereReranker:
    api_key = os.getenv("COHERE_API_KEY", "dummy_key")
    return CohereReranker(api_key=api_key)

@lru_cache()
def get_parser_factory() -> ParserFactory:
    return ParserFactory()

@lru_cache()
def get_chunker() -> SemanticChunker:
    # You could return SlidingWindowChunker if preferred
    return SemanticChunker(max_tokens=800, min_chunk_size=100)

# --- Singleton Engines ---

@lru_cache()
def get_retrieval_engine() -> RetrievalEngine:
    retriever = MilvusRetriever(
        embedder=get_embedding_provider(),
        index_manager=get_milvus_index_manager()
    )
    return RetrievalEngine(retriever=retriever, reranker=get_cohere_reranker())

@lru_cache()
def get_generation_engine() -> GenerationEngine:
    # OpenAI provider also implements BaseLLMProvider
    llm = get_embedding_provider()
    return GenerationEngine(llm_provider=llm)

# --- Master Orchestrators ---

@lru_cache()
def get_rag_orchestrator() -> RAGOrchestrator:
    logger.info("instantiating_rag_orchestrator")
    llm = get_embedding_provider()
    
    return RAGOrchestrator(
        guardrail_filter=GuardrailFilter(llm),
        query_classifier=QueryClassifier(llm),
        query_rewriter=QueryRewriter(llm),
        query_decomposer=QueryDecomposer(llm),
        retrieval_engine=get_retrieval_engine(),
        generation_engine=get_generation_engine()
    )

@lru_cache()
def get_ingestion_pipeline() -> IngestionPipeline:
    logger.info("instantiating_ingestion_pipeline")
    return IngestionPipeline(
        parser_factory=get_parser_factory(),
        chunker=get_chunker(),
        embedder=get_embedding_provider(),
        index_manager=get_milvus_index_manager()
    )
