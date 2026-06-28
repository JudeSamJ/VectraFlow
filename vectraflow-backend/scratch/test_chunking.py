import asyncio
from app.rag.parsing.base_parser import ParsedBlock
from app.rag.chunking.semantic_chunker import SemanticChunker
from app.rag.chunking.sliding_window_chunker import SlidingWindowChunker

async def test():
    blocks = [
        ParsedBlock("Introduction to the system.", "paragraph", 1, ["Chapter 1"]),
        ParsedBlock("The system does things.", "paragraph", 1, ["Chapter 1"]),
        ParsedBlock("Advanced things.", "paragraph", 2, ["Chapter 1", "Section A"]),
        ParsedBlock("More advanced things.", "paragraph", 2, ["Chapter 1", "Section A"]),
    ]
    
    print("--- Semantic Chunker ---")
    chunker = SemanticChunker(prepend_heading=True)
    chunks = await chunker.chunk(blocks, {"max_chunk_size": 20})
    for c in chunks:
        print(f"[{c.token_count} tokens] Metadata: {c.metadata}")
        print(c.text)
        print("-" * 20)
        
    print("\n--- Sliding Window Chunker ---")
    sw_chunker = SlidingWindowChunker()
    sw_chunks = await sw_chunker.chunk(blocks, {"window_size": 10, "overlap": 2})
    for c in sw_chunks:
        print(f"[{c.token_count} tokens]")
        print(c.text)
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(test())
