import openai
import tiktoken
from typing import AsyncGenerator
from .base_llm_provider import BaseLLMProvider
import structlog

logger = structlog.get_logger(__name__)

# Free open-source models on Groq (as of 2026)
GROQ_MODELS = {
    "llama-3.3-70b": "llama-3.3-70b-versatile",     # best quality
    "llama-3.1-8b":  "llama-3.1-8b-instant",          # fastest / cheapest
    "mixtral-8x7b":  "mixtral-8x7b-32768",             # long context
    "gemma2-9b":     "gemma2-9b-it",                   # Google Gemma 2
}


class GroqLLMProvider(BaseLLMProvider):
    """
    LLM provider backed by Groq Cloud — free hosted inference for
    open-source models (Llama 3.3 70B, Mixtral 8x7B, Gemma2 9B).

    Groq's API is OpenAI-compatible so we reuse the openai SDK
    with a custom base_url.
    """

    def __init__(self, api_key: str, model_name: str = "llama-3.3-70b-versatile"):
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

        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                **kwargs,
            )
            return response.choices[0].message.content
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
