import os
from functools import lru_cache
import structlog

from app.config import settings
from app.rag.embeddings.base_provider import BaseEmbeddingProvider
from app.rag.embeddings.tei_provider import TEIEmbeddingProvider
from app.rag.embeddings.cohere_provider import CohereEmbeddingProvider
from app.rag.generation.groq_llm_provider import GroqLLMProvider
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


@lru_cache()
def get_embedding_provider() -> BaseEmbeddingProvider:
    """
    Default: Cohere's hosted Embed API (COHERE_API_KEY) — no self-hosted
    infrastructure needed, so there's no EC2/Docker box to keep running.

    If HUGGINGFACE_TEI_ENDPOINT is explicitly set, that self-hosted TEI
    server is used instead (kept for anyone who still wants to self-host).
    """
    endpoint = settings.HUGGINGFACE_TEI_ENDPOINT
    if endpoint:
        return TEIEmbeddingProvider(endpoint=endpoint, dimensions=384)

    if not settings.COHERE_API_KEY:
        raise RuntimeError(
            "No embedding provider configured. Set COHERE_API_KEY (recommended — "
            "hosted, no server to run) or HUGGINGFACE_TEI_ENDPOINT to self-host TEI."
        )
    return CohereEmbeddingProvider(api_key=settings.COHERE_API_KEY, dimensions=384)


@lru_cache()
def get_llm_provider() -> GroqLLMProvider:
    """
    Groq Cloud — free hosted inference for open-source models.
    Default model: llama-3.3-70b-versatile.
    Set GROQ_API_KEY in .env.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set.")
    model = settings.GROQ_MODEL
    return GroqLLMProvider(api_key=api_key, model_name=model)


@lru_cache()
def get_milvus_index_manager() -> MilvusIndexManager:
    return MilvusIndexManager()


@lru_cache()
def get_cohere_reranker() -> CohereReranker:
    api_key = settings.COHERE_RERANK_API_KEY or settings.COHERE_API_KEY or ""
    return CohereReranker(api_key=api_key)


@lru_cache()
def get_parser_factory() -> ParserFactory:
    return ParserFactory()


@lru_cache()
def get_chunker() -> SemanticChunker:
    return SemanticChunker()


@lru_cache()
def get_retrieval_engine() -> RetrievalEngine:
    retriever = MilvusRetriever(
        embedder=get_embedding_provider(),
        index_manager=get_milvus_index_manager(),
    )
    return RetrievalEngine(retriever=retriever, reranker=get_cohere_reranker())


@lru_cache()
def get_generation_engine() -> GenerationEngine:
    return GenerationEngine(llm_provider=get_llm_provider())


@lru_cache()
def get_rag_orchestrator() -> RAGOrchestrator:
    logger.info("instantiating_rag_orchestrator")
    llm = get_llm_provider()
    return RAGOrchestrator(
        guardrail_filter=GuardrailFilter(llm),
        query_classifier=QueryClassifier(llm),
        query_rewriter=QueryRewriter(llm),
        query_decomposer=QueryDecomposer(llm),
        retrieval_engine=get_retrieval_engine(),
        generation_engine=get_generation_engine(),
    )


@lru_cache()
def get_ingestion_pipeline() -> IngestionPipeline:
    logger.info("instantiating_ingestion_pipeline")
    return IngestionPipeline(
        parser_factory=get_parser_factory(),
        chunker=get_chunker(),
        embedder=get_embedding_provider(),
        index_manager=get_milvus_index_manager(),
    )
