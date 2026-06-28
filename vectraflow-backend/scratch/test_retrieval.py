import asyncio
from app.rag.retrieval.base_retriever import BaseRetriever, RetrievedNode, BaseReranker
from app.rag.retrieval.retrieval_engine import RetrievalEngine

class MockRetriever(BaseRetriever):
    async def retrieve(self, query, collection_name, top_k=20, filters=None):
        print(f"Mocking vector search for query: '{query}'")
        await asyncio.sleep(0.1) # Simulate network IO
        if "X" in query:
            return [
                RetrievedNode("chunk_1", "Text about X", 0.7, {}),
                RetrievedNode("chunk_shared", "Text about X and Y", 0.8, {})
            ]
        elif "Y" in query:
            return [
                RetrievedNode("chunk_2", "Text about Y", 0.75, {}),
                RetrievedNode("chunk_shared", "Text about X and Y", 0.6, {})
            ]
        return []

class MockReranker(BaseReranker):
    async def rerank(self, query, nodes, top_n=5):
        print(f"Reranking {len(nodes)} unique nodes against original query: '{query}'")
        # Just reverse them for testing
        return list(reversed(nodes))[:top_n]

async def test():
    retriever = MockRetriever()
    reranker = MockReranker()
    engine = RetrievalEngine(retriever, reranker)
    
    # Simulate a decomposed query
    original = "Compare X and Y"
    subs = ["What is X?", "What is Y?"]
    
    results = await engine.run(original, subs, "test_collection", top_k_per_query=2, top_n_final=2)
    
    print("\n--- Final Results ---")
    for r in results:
        print(f"[{r.score}] {r.chunk_id}: {r.text}")

if __name__ == "__main__":
    asyncio.run(test())
