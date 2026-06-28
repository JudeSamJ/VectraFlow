import json
import structlog
from typing import List, Dict, AsyncGenerator
from app.rag.query_understanding.guardrail_filter import GuardrailFilter, GuardrailException
from app.rag.query_understanding.query_classifier import QueryClassifier, QueryIntent
from app.rag.query_understanding.query_rewriter import QueryRewriter
from app.rag.query_understanding.query_decomposer import QueryDecomposer
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.generation.generation_engine import GenerationEngine

logger = structlog.get_logger(__name__)

class RAGOrchestrator:
    """
    The master orchestrator for the RAG pipeline.
    Combines query understanding, retrieval, and generation.
    """
    def __init__(
        self,
        guardrail_filter: GuardrailFilter,
        query_classifier: QueryClassifier,
        query_rewriter: QueryRewriter,
        query_decomposer: QueryDecomposer,
        retrieval_engine: RetrievalEngine,
        generation_engine: GenerationEngine
    ):
        self.guardrail = guardrail_filter
        self.classifier = query_classifier
        self.rewriter = query_rewriter
        self.decomposer = query_decomposer
        self.retriever = retrieval_engine
        self.generator = generation_engine

    async def chat(self, query: str, collection_name: str, chat_history: List[Dict[str, str]] = None) -> AsyncGenerator[str, None]:
        """
        Main entry point for conversational RAG.
        Yields SSE formatted strings.
        """
        logger.info("rag_chat_started", query=query)
        
        # 1. Guardrails
        try:
            is_safe = await self.guardrail.validate(query)
            if not is_safe:
                logger.warning("rag_chat_blocked_by_guardrails")
                yield f"data: {json.dumps({'type': 'error', 'content': 'Query blocked by security policies.'})}\n\n"
                yield "data: [DONE]\n\n"
                return
        except GuardrailException:
            logger.warning("rag_chat_guardrail_exception")
            yield f"data: {json.dumps({'type': 'error', 'content': 'Query blocked by security policies.'})}\n\n"
            yield "data: [DONE]\n\n"
            return
            
        # 2. Intent Classification
        intent = await self.classifier.classify(query, chat_history)
        logger.info("rag_chat_intent_classified", intent=intent.value)
        
        if intent == QueryIntent.chit_chat:
            # Bypass retrieval, stream directly from LLM
            logger.info("rag_chat_bypassing_retrieval")
            async for chunk in self.generator.generate_stream(query, nodes=[], chat_history=chat_history):
                yield chunk
            return
            
        # 3. Query Rewriting & Decomposition
        # Rewrite to optimize for vector search
        rewritten_queries = await self.rewriter.rewrite(query)
        primary_search_query = rewritten_queries[0] if rewritten_queries else query
        
        # Decompose for multi-hop
        sub_queries = await self.decomposer.decompose(primary_search_query)
        logger.info("rag_chat_query_prepared", original=query, sub_queries=sub_queries)
        
        # 4. Retrieval & Reranking
        retrieved_nodes = await self.retriever.run(
            original_query=primary_search_query,
            sub_queries=sub_queries,
            collection_name=collection_name,
            top_k_per_query=20,
            top_n_final=5
        )
        
        # 5. Generation with Citations
        async for chunk in self.generator.generate_stream(query, nodes=retrieved_nodes, chat_history=chat_history):
            yield chunk
