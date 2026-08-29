from app.config import settings
from app.rag.resilience.circuit_breaker import CircuitBreaker

# Shared, named breaker instances — one per external dependency this app
# calls directly. Provider code (Groq, Cohere embeddings/rerank, Milvus)
# routes its real calls through these via .call()/.call_stream(), so a
# struggling provider fails fast instead of piling up slow/hanging
# requests, and the Admin/Analytics UI reflects genuine live state instead
# of a hardcoded "closed".
breakers: dict[str, CircuitBreaker] = {
    name: CircuitBreaker(
        failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        recovery_timeout_seconds=settings.CIRCUIT_BREAKER_WINDOW_SECONDS,
    )
    for name in ("embedding-service", "llm-provider", "milvus", "reranker")
}


def get_breaker(name: str) -> CircuitBreaker:
    return breakers[name]
