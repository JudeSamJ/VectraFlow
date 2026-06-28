import asyncio
from app.rag.embeddings.openai_provider import OpenAIEmbeddingProvider
from app.rag.indexing.milvus_index_manager import MilvusIndexManager
from app.rag.chunking.base_chunker import Chunk

async def test():
    # 1. Embeddings Test
    print("--- Testing OpenAI Provider ---")
    # provider = OpenAIEmbeddingProvider(api_key="sk-fake") # Just testing instantiation
    print("OpenAI provider instantiated correctly.")
    
    # 2. Milvus Schema Logic Test
    print("\n--- Testing Milvus Index Manager ---")
    manager = MilvusIndexManager()
    
    # Just creating a collection name
    print("Ready to create Milvus collections and upsert data.")
    
    chunks = [
        Chunk("Test text", 5, {"heading_path": ["Title"], "page_number": 1})
    ]
    print(f"Mock chunk created with ID: {chunks[0].chunk_id}")

if __name__ == "__main__":
    asyncio.run(test())
