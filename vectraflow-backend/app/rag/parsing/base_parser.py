from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class ParsedBlock:
    def __init__(self, text: str, block_type: str, page_number: Optional[int], heading_path: List[str], bbox: Optional[List[float]] = None):
        self.text = text
        self.block_type = block_type
        self.page_number = page_number
        self.heading_path = heading_path
        self.bbox = bbox

class BaseParser(ABC):
    @abstractmethod
    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        """Parse raw file content into structured blocks"""
        pass
