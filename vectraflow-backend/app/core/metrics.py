import threading
from collections import deque

# Lightweight in-process rolling metrics — same tradeoff as the circuit
# breaker state: resets on restart and doesn't aggregate across multiple
# worker processes, but this app runs a single web worker (WEB_CONCURRENCY=1
# on Render), so that's not a practical limitation here. Real Prometheus/OTel
# export (PROMETHEUS_ENABLED in config.py) was never actually wired up —
# this fills the same gap without that extra infra.

_LOCK = threading.Lock()
_MAX_SAMPLES = 500  # rolling window so memory stays bounded

_retrieval_latencies_ms: deque = deque(maxlen=_MAX_SAMPLES)
_generation_latencies_ms: deque = deque(maxlen=_MAX_SAMPLES)
_had_context: deque = deque(maxlen=_MAX_SAMPLES)


def record_retrieval(latency_ms: float, had_context: bool) -> None:
    """Call once per RAG-path chat turn, right after retrieval+rerank completes."""
    with _LOCK:
        _retrieval_latencies_ms.append(latency_ms)
        _had_context.append(had_context)


def record_generation(latency_ms: float) -> None:
    """Call once per chat turn, after the full generation stream has been consumed."""
    with _LOCK:
        _generation_latencies_ms.append(latency_ms)


def snapshot() -> dict:
    with _LOCK:
        def avg(d: deque) -> float:
            return sum(d) / len(d) if d else 0.0

        no_context_rate = (
            sum(1 for c in _had_context if not c) / len(_had_context)
            if _had_context else 0.0
        )
        return {
            "avg_retrieval_latency_ms": avg(_retrieval_latencies_ms),
            "avg_generation_latency_ms": avg(_generation_latencies_ms),
            "no_context_rate": no_context_rate,
            "sample_count": len(_retrieval_latencies_ms),
        }
