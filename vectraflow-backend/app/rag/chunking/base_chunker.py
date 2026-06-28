from abc import ABC, abstractmethod
from typing import List, Any
import uuid
from app.rag.parsing.base_parser import ParsedBlock

class Chunk:
    def __init__(self, text: str, token_count: int, metadata: dict):
        self.chunk_id = str(uuid.uuid4())
        self.text = text
        self.token_count = token_count
        self.metadata = metadata

class BaseChunker(ABC):
    @abstractmethod
    async def chunk(self, blocks: List[ParsedBlock], config: Any) -> List[Chunk]:
        """Convert parsed blocks into embedding-ready chunks"""
        pass
