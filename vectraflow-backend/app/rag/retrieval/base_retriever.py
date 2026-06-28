from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class RetrievedNode:
    chunk_id: str
    text: str
    score: float
    metadata: Dict[str, Any]

class BaseRetriever(ABC):
    @abstractmethod
    async def retrieve(self, query: str, collection_name: str, top_k: int = 20, filters: Dict[str, Any] = None) -> List[RetrievedNode]:
        """Retrieve top_k chunks matching the query from the collection"""
        pass

class BaseReranker(ABC):
    @abstractmethod
    async def rerank(self, query: str, nodes: List[RetrievedNode], top_n: int = 5) -> List[RetrievedNode]:
        """Rerank the retrieved nodes based on the query"""
        pass
