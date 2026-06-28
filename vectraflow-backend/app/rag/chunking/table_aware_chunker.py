import structlog
from typing import List
from app.rag.parsing.base_parser import ParsedBlock
from app.core.token_counter import token_counter

logger = structlog.get_logger(__name__)

class TableAwareChunker:
    """
    Chunks tables without splitting mid-row and preserves header context across chunks.
    """
    def __init__(self, max_tokens: int = 800):
        self.max_tokens = max_tokens
        
    def chunk_table(self, table_block: ParsedBlock) -> List[ParsedBlock]:
        """
        Splits a markdown table into multiple blocks if it exceeds max_tokens.
        Repeats the header on every child block.
        """
        lines = table_block.text.strip().split("\n")
        if len(lines) < 3:
            return [table_block] # Too small to split
            
        header = lines[0]
        separator = lines[1]
        rows = lines[2:]
        
        chunks = []
        current_chunk_lines = [header, separator]
        current_tokens = token_counter.count("\n".join(current_chunk_lines))
        
        for row in rows:
            row_tokens = token_counter.count(row)
            # If adding this row exceeds limit (and we have at least one data row), split.
            # We prioritize data integrity: a single massive row might exceed the limit, 
            # but we won't cut it mid-row.
            if current_tokens + row_tokens > self.max_tokens and len(current_chunk_lines) > 2:
                new_text = "\n".join(current_chunk_lines)
                chunks.append(ParsedBlock(
                    block_type="table",
                    text=new_text,
                    page_number=table_block.page_number,
                    heading_path=table_block.heading_path
                ))
                current_chunk_lines = [header, separator, row]
                current_tokens = token_counter.count("\n".join(current_chunk_lines))
            else:
                current_chunk_lines.append(row)
                current_tokens += row_tokens
                
        # Remainder
        if len(current_chunk_lines) > 2:
            new_text = "\n".join(current_chunk_lines)
            chunks.append(ParsedBlock(
                block_type="table",
                text=new_text,
                page_number=table_block.page_number,
                heading_path=table_block.heading_path
            ))
            
        return chunks
