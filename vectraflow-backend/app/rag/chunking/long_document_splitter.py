import structlog
from typing import List, Dict, Any
from dataclasses import dataclass, field
from app.core.token_counter import token_counter
from app.rag.parsing.base_parser import ParsedBlock

logger = structlog.get_logger(__name__)

@dataclass
class DocumentSection:
    section_index: int
    blocks: List[ParsedBlock]
    total_tokens: int

class LongDocumentSplitter:
    """
    Splits a massively long parsed document into manageable sections for parallel processing.
    """
    def __init__(self, section_token_limit: int = 50000):
        self.section_token_limit = section_token_limit
        
    def split(self, blocks: List[ParsedBlock]) -> List[DocumentSection]:
        sections = []
        current_blocks = []
        current_tokens = 0
        section_index = 0
        
        for block in blocks:
            # Simple word count approximation if token_counter is heavy, 
            # but we use token_counter for exactness
            block_tokens = token_counter.count(block.text)
            
            # If a single block is larger than the limit, we still append it but then break immediately after
            if current_tokens + block_tokens > self.section_token_limit and current_blocks:
                sections.append(DocumentSection(
                    section_index=section_index,
                    blocks=current_blocks,
                    total_tokens=current_tokens
                ))
                section_index += 1
                current_blocks = []
                current_tokens = 0
                
            current_blocks.append(block)
            current_tokens += block_tokens
            
        if current_blocks:
            sections.append(DocumentSection(
                section_index=section_index,
                blocks=current_blocks,
                total_tokens=current_tokens
            ))
            
        logger.info("document_split_into_sections", total_sections=len(sections))
        return sections
