import structlog
import tiktoken
from typing import List
import cohere
from .base_provider import BaseEmbeddingProvider
from app.core.circuit_breakers import get_breaker
from app.core import metrics

logger = structlog.get_logger(__name__)

# Used only to estimate token counts for cost tracking — Cohere's own
# tokenizer differs slightly, but this is close enough for an estimate
# (the metric is explicitly named estimated_daily_cost_usd).
_cost_tokenizer = tiktoken.get_encoding("cl100k_base")


class CohereEmbeddingProvider(BaseEmbeddingProvider):
    """
    Hosted embedding provider using Cohere's Embed API.

    No self-hosted infrastructure required (replaces the previous EC2-hosted
    Hugging Face TEI server). Model defaults to embed-english-light-v3.0,
    which is 384-dim — matching the dimension the rest of the pipeline
    already assumes, so existing Milvus/Zilliz collection schemas keep working.
    """

    def __init__(self, api_key: str, model_name: str = "embed-english-light-v3.0", dimensions: int = 384):
        self.client = cohere.AsyncClient(api_key=api_key)
        self.model_name = model_name
        self.dimensions = dimensions
        self.max_batch_size = 96  # Cohere embed API per-request cap
        self.max_input_tokens = 512

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        safe_texts = [t.strip() if t and t.strip() else "empty" for t in texts]
        all_embeddings: List[List[float]] = []
        for i in range(0, len(safe_texts), self.max_batch_size):
            chunk = safe_texts[i : i + self.max_batch_size]
            try:
                response = await get_breaker("embedding-service").call(
                    "cohere-embed", self.client.embed,
                    texts=chunk, model=self.model_name, input_type="search_document",
                )
                all_embeddings.extend(response.embeddings)
                metrics.record_embed_cost(sum(len(_cost_tokenizer.encode(t)) for t in chunk))
            except Exception as e:
                logger.error("cohere_embed_batch_failed", error=str(e), batch_start=i, batch_size=len(chunk))
                raise
        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        safe = text.strip() or "empty"
        try:
            response = await get_breaker("embedding-service").call(
                "cohere-embed", self.client.embed,
                texts=[safe], model=self.model_name, input_type="search_query",
            )
            metrics.record_embed_cost(len(_cost_tokenizer.encode(safe)))
            return response.embeddings[0]
        except Exception as e:
            logger.error("cohere_embed_query_failed", error=str(e))
            raise

    async def health_check(self) -> bool:
        try:
            await self.client.embed(texts=["health"], model=self.model_name, input_type="search_document")
            return True
        except Exception:
            return False
