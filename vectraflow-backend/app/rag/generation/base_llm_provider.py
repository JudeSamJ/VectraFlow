from abc import ABC, abstractmethod
from typing import List, Dict, AsyncGenerator, Any

class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str | None = None, **kwargs) -> str:
        """Generate a complete response"""
        pass

    @abstractmethod
    async def stream(self, prompt: str, system_prompt: str | None = None, **kwargs) -> AsyncGenerator[str, None]:
        """Stream the response tokens"""
        pass

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Count tokens using the provider's specific tokenizer"""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider API is accessible"""
        pass
