from bs4 import BeautifulSoup
import structlog
from typing import List, Dict, Any, Tuple
from app.rag.parsing.base_parser import BaseParser, ParsedBlock

logger = structlog.get_logger(__name__)

class HTMLParser(BaseParser):
    """
    Parses HTML files using BeautifulSoup.
    Tracks heading levels h1-h6 to build a hierarchical heading path.
    """
    
    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        blocks = []
        heading_stack: List[Tuple[int, str]] = []  # Stack of (heading_level, text)
        
        try:
            soup = BeautifulSoup(file_content, "lxml")
        except Exception as e:
            logger.error("html_parse_open_failed", error=str(e), filename=metadata.get("filename"))
            raise
            
        # Iterate over all elements in the body
        if soup.body:
            content_tags = soup.body.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'div', 'span'])
        else:
            content_tags = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'div', 'span'])
            
        for tag in content_tags:
            text = tag.get_text(separator=" ", strip=True)
            if not text:
                continue
                
            tag_name = tag.name.lower()
            
            if tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                heading_level = int(tag_name[1])
                
                # Pop headings from stack that are deeper or at the same level
                while heading_stack and heading_stack[-1][0] >= heading_level:
                    heading_stack.pop()
                heading_stack.append((heading_level, text))
                
                # Add heading as a block itself, with its parent path
                current_path = [h[1] for h in heading_stack[:-1]]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="heading",
                    page_number=None,
                    heading_path=current_path,
                    bbox=None
                ))
            elif tag_name in ['p', 'li']:
                # Standard paragraph or list item
                current_path = [h[1] for h in heading_stack]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="paragraph",
                    page_number=None,
                    heading_path=current_path,
                    bbox=None
                ))
                
        return blocks
