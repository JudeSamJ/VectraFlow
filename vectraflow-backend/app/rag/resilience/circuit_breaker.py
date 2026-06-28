import time
import structlog
from typing import Callable, Any
from enum import Enum

logger = structlog.get_logger(__name__)

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreaker:
    """
    Wraps provider calls to protect against cascading failures and rate limits.
    """
    def __init__(self, failure_threshold: int = 5, recovery_timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_seconds
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    async def call(self, provider_name: str, func: Callable, *args, **kwargs) -> Any:
        """
        Executes the function. If the circuit is OPEN, fails fast or attempts recovery.
        """
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                logger.info("circuit_breaker_half_open", provider=provider_name)
            else:
                logger.warning("circuit_breaker_open_fast_fail", provider=provider_name)
                raise RuntimeError(f"Circuit breaker OPEN for {provider_name}. Failing fast.")

        try:
            result = await func(*args, **kwargs)
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info("circuit_breaker_recovered", provider=provider_name)
                
            return result
            
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            logger.error("provider_call_failed", provider=provider_name, error=str(e), failures=self.failure_count)
            
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.error("circuit_breaker_tripped", provider=provider_name)
                
            raise e
