from abc import ABC, abstractmethod
from typing import List

class BaseEmbeddingProvider(ABC):
    dimensions: int
    max_batch_size: int
    max_input_tokens: int

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of documents/chunks"""
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """
        Embed a single search query.
        Some providers (e.g. asymmetric models) need different instructions for queries vs documents.
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider API is accessible"""
        pass

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_stream(self, messages: List[dict], temperature: float = 0.7):
        """Generate response stream from LLM"""
        pass
        
    @abstractmethod
    async def generate(self, messages: List[dict], temperature: float = 0.7) -> str:
        """Generate full response from LLM"""
        pass
