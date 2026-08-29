import openai
import tiktoken
from typing import AsyncGenerator
from .base_llm_provider import BaseLLMProvider
from app.core.circuit_breakers import get_breaker
import structlog

logger = structlog.get_logger(__name__)

# Free open-source models on Groq. llama-3.3-70b-versatile and
# llama-3.1-8b-instant were deprecated by Groq — use the gpt-oss models
# below instead (see console.groq.com/docs/deprecations for the current list).
GROQ_MODELS = {
    "gpt-oss-120b":  "openai/gpt-oss-120b",  # best quality (replaces llama-3.3-70b-versatile)
    "gpt-oss-20b":   "openai/gpt-oss-20b",   # fastest / cheapest (replaces llama-3.1-8b-instant)
    "qwen3-32b":     "qwen/qwen3-32b",       # long context alternative
}


class GroqLLMProvider(BaseLLMProvider):
    """
    LLM provider backed by Groq Cloud — free hosted inference for
    open-source models (openai/gpt-oss-120b by default).

    Groq's API is OpenAI-compatible so we reuse the openai SDK
    with a custom base_url.
    """

    def __init__(self, api_key: str, model_name: str = "openai/gpt-oss-120b"):
        self.client = openai.AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        self.model_name = model_name
        # Groq models use cl100k tokenizer for counting (close enough)
        self.tokenizer = tiktoken.get_encoding("cl100k_base")

    async def generate(self, prompt: str, system_prompt: str | None = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Groq doesn't support some OpenAI-only kwargs
        kwargs.pop("response_format", None)

        async def _call():
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                **kwargs,
            )
            return response.choices[0].message.content

        try:
            return await get_breaker("llm-provider").call("groq", _call)
        except Exception as e:
            logger.error("groq_generate_failed", model=self.model_name, error=str(e))
            raise

    async def stream(self, prompt: str, system_prompt: str | None = None, **kwargs) -> AsyncGenerator[str, None]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs.pop("response_format", None)

        try:
            stream = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                stream=True,
                **kwargs,
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error("groq_stream_failed", model=self.model_name, error=str(e))
            raise

    async def generate_stream(self, messages: list, **kwargs) -> "AsyncGenerator[str, None]":
        """Stream tokens from a pre-built messages list (used by GenerationEngine)."""
        kwargs.pop("response_format", None)

        async def _stream():
            stream = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                stream=True,
                **kwargs,
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content

        try:
            async for token in get_breaker("llm-provider").call_stream("groq", _stream):
                yield token
        except Exception as e:
            logger.error("groq_generate_stream_failed", model=self.model_name, error=str(e))
            raise

    def count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    async def health_check(self) -> bool:
        try:
            models = await self.client.models.list()
            return any(m.id == self.model_name for m in models.data)
        except Exception:
            return False
