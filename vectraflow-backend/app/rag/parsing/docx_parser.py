import io
import docx
import structlog
from typing import List, Dict, Any, Tuple
from app.rag.parsing.base_parser import BaseParser, ParsedBlock

logger = structlog.get_logger(__name__)

class DOCXParser(BaseParser):
    """
    Parses DOCX files using python-docx.
    Uses paragraph styles to detect headings and builds a hierarchical heading path.
    """
    
    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        blocks = []
        heading_stack: List[Tuple[int, str]] = []  # Stack of (heading_level, text)
        
        try:
            doc = docx.Document(io.BytesIO(file_content))
        except Exception as e:
            logger.error("docx_parse_open_failed", error=str(e), filename=metadata.get("filename"))
            raise
            
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            style_name = para.style.name if para.style else ""
            
            is_heading = style_name.startswith("Heading")
            heading_level = 99 # Not a heading
            
            if is_heading:
                try:
                    heading_level = int(style_name.split()[-1])
                except ValueError:
                    is_heading = False
                    
            if is_heading:
                # Pop headings from stack that are deeper or at the same level
                while heading_stack and heading_stack[-1][0] >= heading_level:
                    heading_stack.pop()
                heading_stack.append((heading_level, text))
                
                # Add heading as a block itself, with its parent path
                current_path = [h[1] for h in heading_stack[:-1]]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="heading",
                    page_number=None, # DOCX doesn't have fixed pages easily accessible here
                    heading_path=current_path,
                    bbox=None
                ))
            else:
                # Standard paragraph
                current_path = [h[1] for h in heading_stack]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="paragraph",
                    page_number=None,
                    heading_path=current_path,
                    bbox=None
                ))
                
        return blocks
