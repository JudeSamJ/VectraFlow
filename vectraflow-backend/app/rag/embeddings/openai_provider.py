from typing import List
import openai
from .base_provider import BaseEmbeddingProvider
import structlog

logger = structlog.get_logger(__name__)

class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: str, model_name: str = "text-embedding-3-small", dimensions: int = 1536):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model_name = model_name
        self.dimensions = dimensions
        self.max_batch_size = 100
        self.max_input_tokens = 8191

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        try:
            response = await self.client.embeddings.create(
                input=texts,
                model=self.model_name,
                dimensions=self.dimensions
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            logger.error("openai_embed_batch_failed", error=str(e))
            raise

    async def embed_query(self, text: str) -> List[float]:
        # OpenAI text-embedding-3 is symmetric
        batch = await self.embed_batch([text])
        return batch[0]

    async def health_check(self) -> bool:
        try:
            await self.client.embeddings.create(input=["health"], model=self.model_name, dimensions=self.dimensions)
            return True
        except Exception:
            return False
