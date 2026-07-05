import httpx
from typing import List
from .base_provider import BaseEmbeddingProvider
import structlog

logger = structlog.get_logger(__name__)


class TEIEmbeddingProvider(BaseEmbeddingProvider):
    """
    Embedding provider for Hugging Face Text Embeddings Inference (TEI).

    TEI is a high-performance embedding server you self-host (Docker on EC2/ECS).
    It exposes an OpenAI-compatible /embed endpoint.

    Model: BAAI/bge-small-en-v1.5  (384-dim, English, fits t2.micro free tier)
    """

    def __init__(self, endpoint: str, dimensions: int = 384):
        # endpoint e.g. http://your-ec2-ip:8080
        self.endpoint = endpoint.rstrip("/")
        self.dimensions = dimensions
        self.max_batch_size = 32
        self.max_input_tokens = 512
        self._client = httpx.AsyncClient(timeout=30.0)

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # TEI rejects empty strings — replace them with a placeholder
        safe_texts = [t.strip() if t and t.strip() else "empty" for t in texts]
        # Send in sub-batches to stay within TEI's per-request limit
        all_embeddings: List[List[float]] = []
        batch_size = self.max_batch_size
        for i in range(0, len(safe_texts), batch_size):
            chunk = safe_texts[i : i + batch_size]
            try:
                response = await self._client.post(
                    f"{self.endpoint}/embed",
                    json={"inputs": chunk, "truncate": True},
                )
                response.raise_for_status()
                result = response.json()
                all_embeddings.extend(result)
            except Exception as e:
                logger.error("tei_embed_batch_failed", error=str(e), batch_start=i, batch_size=len(chunk))
                raise
        return all_embeddings

    async def embed_query(self, text: str) -> List[float]:
        safe = text.strip() or "empty"
        try:
            response = await self._client.post(
                f"{self.endpoint}/embed",
                json={"inputs": safe, "truncate": True},
            )
            response.raise_for_status()
            result = response.json()
            # TEI returns [[...]] for a single string input
            return result[0] if isinstance(result[0], list) else result
        except Exception as e:
            logger.error("tei_embed_query_failed", error=str(e))
            raise

    async def health_check(self) -> bool:
        try:
            response = await self._client.get(f"{self.endpoint}/health")
            return response.status_code == 200
        except Exception:
            return False
