import time
import structlog
from dataclasses import dataclass
from typing import Optional

logger = structlog.get_logger(__name__)

@dataclass
class LoopGuardConfig:
    max_steps: int = 4
    max_total_tokens: int = 16000
    max_estimated_cost_usd: float = 0.50
    max_wall_clock_seconds: int = 60

class LoopGuard:
    """
    Mandatory limits for agentic retrieval loops.
    No run may exceed steps, token limit, cost, or wall clock time.
    """
    def __init__(self, config: Optional[LoopGuardConfig] = None):
        self.config = config or LoopGuardConfig()
        
    def check(self, step_count: int, tokens_used: int, cost_usd: float, start_time: float) -> tuple[bool, str]:
        """
        Returns (True, reason) if any limit has been exceeded, else (False, "").
        """
        elapsed = time.time() - start_time
        
        if step_count >= self.config.max_steps:
            logger.warning("loop_guard_tripped", reason="max_steps", limit=self.config.max_steps, current=step_count)
            return True, "max_steps"
            
        if tokens_used >= self.config.max_total_tokens:
            logger.warning("loop_guard_tripped", reason="max_total_tokens", limit=self.config.max_total_tokens, current=tokens_used)
            return True, "max_total_tokens"
            
        if cost_usd >= self.config.max_estimated_cost_usd:
            logger.warning("loop_guard_tripped", reason="max_cost", limit=self.config.max_estimated_cost_usd, current=cost_usd)
            return True, "max_cost_usd"
            
        if elapsed >= self.config.max_wall_clock_seconds:
            logger.warning("loop_guard_tripped", reason="max_wall_clock", limit=self.config.max_wall_clock_seconds, current=elapsed)
            return True, "max_wall_clock"
            
        return False, ""
