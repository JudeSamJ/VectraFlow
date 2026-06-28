import structlog
from app.redis_client import redis_client

logger = structlog.get_logger(__name__)

class CircuitBreaker:
    """
    Prevents cascading failures when LLM/Embedding providers go down.
    States: CLOSED (normal), OPEN (failing fast), HALF_OPEN (testing recovery)
    Backed by Redis for cross-worker state.
    """
    def __init__(self, service_name: str, failure_threshold: int = 5, recovery_timeout: int = 30):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.redis_key = f"circuit_breaker:{service_name}"

    async def check(self) -> bool:
        # Stub implementation defaults to returning True (closed/healthy)
        return True

    async def record_failure(self):
        pass

    async def record_success(self):
        pass
