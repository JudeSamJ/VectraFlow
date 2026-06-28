import asyncio
from app.dependencies import get_rag_orchestrator, get_ingestion_pipeline, get_embedding_provider

async def test():
    print("Fetching dependencies...")
    
    # 1. Fetch singleton multiple times
    embed_1 = get_embedding_provider()
    embed_2 = get_embedding_provider()
    
    print(f"Are embedding providers the same instance? {embed_1 is embed_2}")
    
    rag_1 = get_rag_orchestrator()
    rag_2 = get_rag_orchestrator()
    
    print(f"Are RAG orchestrators the same instance? {rag_1 is rag_2}")
    
    pipeline = get_ingestion_pipeline()
    print("Successfully instantiated all heavy dependencies.")

if __name__ == "__main__":
    asyncio.run(test())
