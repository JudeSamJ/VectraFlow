import fitz  # PyMuPDF
import structlog
from typing import List, Dict, Any, Tuple
from app.rag.parsing.base_parser import BaseParser, ParsedBlock

logger = structlog.get_logger(__name__)

class PDFParser(BaseParser):
    """
    Parses PDF files using PyMuPDF.
    Uses font size heuristics to detect headings and builds a hierarchical heading path.
    """
    
    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        blocks = []
        heading_stack: List[Tuple[float, str]] = []  # Stack of (font_size, text)
        
        try:
            doc = fitz.open("pdf", file_content)
        except Exception as e:
            logger.error("pdf_parse_open_failed", error=str(e), filename=metadata.get("filename"))
            raise
            
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Use dict to extract style info
            page_dict = page.get_text("dict")
            
            for b in page_dict.get("blocks", []):
                if b.get("type") == 0: # text block
                    block_text = ""
                    max_size = 0.0
                    bbox = b.get("bbox")
                    
                    for line in b.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            size = span.get("size", 0.0)
                            if text.strip():
                                block_text += text + " "
                                if size > max_size:
                                    max_size = size
                                    
                    block_text = block_text.strip()
                    if not block_text:
                        continue
                        
                    # Heuristic for headings: usually larger than body text (typically ~10-12pt)
                    # We assume anything > 12pt and reasonably short is a heading.
                    is_heading = max_size > 12.0 and len(block_text.split()) < 15
                    
                    if is_heading:
                        # Pop headings from stack that are smaller or equal to current heading size
                        while heading_stack and heading_stack[-1][0] <= max_size:
                            heading_stack.pop()
                        heading_stack.append((max_size, block_text))
                        
                        # Add heading as a block itself, with its parent path
                        current_path = [h[1] for h in heading_stack[:-1]]
                        blocks.append(ParsedBlock(
                            text=block_text,
                            block_type="heading",
                            page_number=page_num + 1,
                            heading_path=current_path,
                            bbox=bbox
                        ))
                    else:
                        # Standard paragraph
                        current_path = [h[1] for h in heading_stack]
                        blocks.append(ParsedBlock(
                            text=block_text,
                            block_type="paragraph",
                            page_number=page_num + 1,
                            heading_path=current_path,
                            bbox=bbox
                        ))
                        
        return blocks
