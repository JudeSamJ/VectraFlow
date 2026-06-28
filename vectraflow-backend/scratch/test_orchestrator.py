import asyncio
import json
from typing import AsyncGenerator
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.retrieval.base_retriever import BaseRetriever, BaseReranker, RetrievedNode
from app.rag.query_understanding.guardrail_filter import GuardrailFilter
from app.rag.query_understanding.query_classifier import QueryClassifier, QueryIntent
from app.rag.query_understanding.query_rewriter import QueryRewriter
from app.rag.query_understanding.query_decomposer import QueryDecomposer
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.generation.generation_engine import GenerationEngine
from app.rag.pipeline.rag_orchestrator import RAGOrchestrator

class MockLLM(BaseLLMProvider):
    async def generate_stream(self, messages, temperature=0.7):
        sys_prompt = messages[0]["content"] if messages else ""
        if "query classifier" in sys_prompt:
            if "hello" in messages[-1]["content"].lower():
                yield json.dumps({"intent": "chit-chat"})
            else:
                yield json.dumps({"intent": "rag"})
        elif "query optimization engine" in sys_prompt:
            yield json.dumps([messages[-1]["content"]])
        elif "query decomposition engine" in sys_prompt:
            yield json.dumps([messages[-1]["content"]])
        elif "security filter" in sys_prompt:
            yield json.dumps({"safe": True})
        else:
            yield "Mock "
            yield "response."
            
    async def generate(self, messages, temperature=0.7):
        pass

class MockRetriever(BaseRetriever):
    async def retrieve(self, query, collection_name, top_k=20, filters=None):
        return [RetrievedNode("chunk_1", "Mock doc", 0.9, {"document_id": "doc_1"})]
        
class MockReranker(BaseReranker):
    async def rerank(self, query, nodes, top_n=5):
        return nodes

async def test():
    llm = MockLLM()
    orchestrator = RAGOrchestrator(
        guardrail_filter=GuardrailFilter(llm),
        query_classifier=QueryClassifier(llm),
        query_rewriter=QueryRewriter(llm),
        query_decomposer=QueryDecomposer(llm),
        retrieval_engine=RetrievalEngine(MockRetriever(), MockReranker()),
        generation_engine=GenerationEngine(llm)
    )
    
    print("--- Testing Chit-Chat ---")
    async for chunk in orchestrator.chat("Hello there!", "test_collection"):
        print(chunk, end="")
        
    print("\n\n--- Testing RAG ---")
    async for chunk in orchestrator.chat("What is X?", "test_collection"):
        print(chunk, end="")

if __name__ == "__main__":
    asyncio.run(test())
