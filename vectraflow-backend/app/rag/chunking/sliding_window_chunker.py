from typing import List, Any
import structlog
from app.rag.chunking.base_chunker import BaseChunker, Chunk
from app.rag.parsing.base_parser import ParsedBlock
from app.core.token_counter import token_counter

logger = structlog.get_logger(__name__)

class SlidingWindowChunker(BaseChunker):
    """
    Fallback chunker for unstructured text blobs.
    Chunks purely by token length with overlap.
    """
    async def chunk(self, blocks: List[ParsedBlock], config: Any) -> List[Chunk]:
        window_size = config.get("window_size", 512)
        overlap = config.get("overlap", 50)
        
        # Combine all blocks into one giant text
        full_text = "\n\n".join([b.text for b in blocks if b.text.strip()])
        tokens = token_counter.encode(full_text)
        
        chunks = []
        start = 0
        while start < len(tokens):
            end = min(start + window_size, len(tokens))
            chunk_tokens = tokens[start:end]
            chunk_text = token_counter.decode(chunk_tokens)
            
            chunks.append(Chunk(
                text=chunk_text,
                token_count=len(chunk_tokens),
                metadata={"type": "sliding_window"}
            ))
            
            if end == len(tokens):
                break
                
            start += (window_size - overlap)
            
        return chunks
