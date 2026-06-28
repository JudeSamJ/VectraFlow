from typing import List, Any
import structlog
from app.rag.chunking.base_chunker import BaseChunker, Chunk
from app.rag.parsing.base_parser import ParsedBlock
from app.core.token_counter import token_counter

logger = structlog.get_logger(__name__)

class SemanticChunker(BaseChunker):
    """
    Groups paragraphs under the same heading until max_chunk_size is reached.
    If a heading boundary is crossed, flushes the current chunk.
    """
    def __init__(self, prepend_heading: bool = True):
        self.prepend_heading = prepend_heading

    async def chunk(self, blocks: List[ParsedBlock], config: Any) -> List[Chunk]:
        max_chunk_size = config.get("max_chunk_size", 512)
        chunks = []
        
        current_text = ""
        current_tokens = 0
        current_heading_path = []
        current_page = None
        
        for block in blocks:
            if block.block_type == "heading":
                continue # We use the heading_path from paragraphs
                
            block_tokens = token_counter.count(block.text)
            
            # Flush if crossing a heading boundary or exceeding token limit
            boundary_crossed = (current_heading_path != block.heading_path) and bool(current_text)
            size_exceeded = (current_tokens + block_tokens > max_chunk_size) and bool(current_text)
            
            if boundary_crossed or size_exceeded:
                chunks.append(self._finalize_chunk(current_text, current_tokens, current_heading_path, current_page))
                current_text = ""
                current_tokens = 0
                
            # Start new chunk
            if not current_text:
                current_heading_path = block.heading_path
                current_page = block.page_number
                
                # Prepend heading if configured
                if self.prepend_heading and current_heading_path:
                    heading_str = " > ".join(current_heading_path) + ":\n\n"
                    current_text = heading_str
                    current_tokens = token_counter.count(heading_str)
                    
            # Accumulate text
            prefix = "\n\n" if current_text and not current_text.endswith(":\n\n") else ""
            added_text = prefix + block.text
            added_tokens = token_counter.count(added_text)
            
            current_text += added_text
            current_tokens += added_tokens

        # Flush remainder
        if current_text:
            chunks.append(self._finalize_chunk(current_text, current_tokens, current_heading_path, current_page))
            
        return chunks

    def _finalize_chunk(self, text: str, token_count: int, heading_path: List[str], page_number: int | None) -> Chunk:
        metadata = {
            "heading_path": heading_path,
            "page_number": page_number
        }
        return Chunk(text=text.strip(), token_count=token_count, metadata=metadata)
