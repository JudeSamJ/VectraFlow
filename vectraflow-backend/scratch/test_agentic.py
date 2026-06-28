import asyncio
from app.rag.agentic.loop_guard import LoopGuard
from app.rag.agentic.retrieval_agent import AgentPlanner, SufficiencyChecker, RetrievalAgent
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.retrieval.retrieval_engine import RetrievalEngine
from app.rag.generation.generation_engine import GenerationEngine

class MockLLM(BaseLLMProvider):
    async def generate(self, messages, temperature=0.7):
        return "mocked step"
        
    async def generate_stream(self, messages, temperature=0.7):
        yield "data: {\"type\": \"text\", \"content\": \"Final answer\"}\n\n"

class MockRetrieverEngine:
    async def run(self, original_query, sub_queries, collection_name, top_k_per_query=20, top_n_final=5):
        return []

async def test():
    llm = MockLLM()
    planner = AgentPlanner(llm)
    checker = SufficiencyChecker(llm)
    retriever = MockRetrieverEngine()
    gen = GenerationEngine(llm)
    guard = LoopGuard()
    
    agent = RetrievalAgent(planner, checker, retriever, gen, guard)
    
    print("--- Running Agentic Loop ---")
    # Will hit the mock sufficiency checker. It needs 3 chunks to return True.
    # Our mock retriever returns 0 chunks.
    # So it should hit the max_steps guard and return a partial answer.
    
    async for event in agent.run_stream("Compare A and B", "test_kb"):
        print(event, end="")

if __name__ == "__main__":
    asyncio.run(test())
