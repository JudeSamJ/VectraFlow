import threading
from collections import deque
from datetime import datetime, timezone

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

# Approximate list pricing (USD), used only to *estimate* spend — not real
# billing data (Groq/Cohere invoices are the source of truth for that).
# Token counts feeding these are themselves estimated via local tokenizers
# rather than provider-reported usage, since Groq's streaming responses
# (the hot path) don't reliably return usage data. Sources: Groq and Cohere
# pricing pages, checked 2026-08.
GROQ_PRICE_PER_1M_INPUT_TOKENS = 0.15    # openai/gpt-oss-120b
GROQ_PRICE_PER_1M_OUTPUT_TOKENS = 0.60   # openai/gpt-oss-120b
COHERE_EMBED_PRICE_PER_1M_TOKENS = 0.10  # embed v3 family
COHERE_RERANK_PRICE_PER_SEARCH = 0.002   # rerank v3 family (~$2 / 1,000 searches)

_cost_date: str | None = None  # UTC 'YYYY-MM-DD' the accumulator below covers
_cost_total_usd = 0.0


def _roll_cost_bucket_if_new_day() -> None:
    """Must be called while holding _LOCK. Resets the cost total at UTC midnight."""
    global _cost_date, _cost_total_usd
    today = datetime.now(timezone.utc).date().isoformat()
    if _cost_date != today:
        _cost_date = today
        _cost_total_usd = 0.0


def _add_cost(amount_usd: float) -> None:
    global _cost_total_usd
    with _LOCK:
        _roll_cost_bucket_if_new_day()
        _cost_total_usd += amount_usd


def record_retrieval(latency_ms: float, had_context: bool) -> None:
    """Call once per RAG-path chat turn, right after retrieval+rerank completes."""
    with _LOCK:
        _retrieval_latencies_ms.append(latency_ms)
        _had_context.append(had_context)


def record_generation(latency_ms: float) -> None:
    """Call once per chat turn, after the full generation stream has been consumed."""
    with _LOCK:
        _generation_latencies_ms.append(latency_ms)


def record_llm_cost(input_tokens: int, output_tokens: int) -> None:
    _add_cost(
        (input_tokens / 1_000_000) * GROQ_PRICE_PER_1M_INPUT_TOKENS
        + (output_tokens / 1_000_000) * GROQ_PRICE_PER_1M_OUTPUT_TOKENS
    )


def record_embed_cost(tokens: int) -> None:
    _add_cost((tokens / 1_000_000) * COHERE_EMBED_PRICE_PER_1M_TOKENS)


def record_rerank_cost(num_searches: int = 1) -> None:
    _add_cost(num_searches * COHERE_RERANK_PRICE_PER_SEARCH)


def snapshot() -> dict:
    with _LOCK:
        _roll_cost_bucket_if_new_day()

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
            "estimated_daily_cost_usd": _cost_total_usd,
            "sample_count": len(_retrieval_latencies_ms),
        }
