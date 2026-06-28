import openai
import tiktoken
from typing import AsyncGenerator
from .base_llm_provider import BaseLLMProvider
import structlog

logger = structlog.get_logger(__name__)

class OpenAILLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model_name: str = "gpt-4o"):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model_name = model_name
        try:
            self.tokenizer = tiktoken.encoding_for_model(model_name)
        except KeyError:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")

    async def generate(self, prompt: str, system_prompt: str | None = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                **kwargs
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error("openai_generate_failed", error=str(e))
            raise

    async def stream(self, prompt: str, system_prompt: str | None = None, **kwargs) -> AsyncGenerator[str, None]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                stream=True,
                **kwargs
            )
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
        except Exception as e:
            logger.error("openai_stream_failed", error=str(e))
            raise

    def count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    async def health_check(self) -> bool:
        try:
            await self.client.models.retrieve(self.model_name)
            return True
        except Exception:
            return False
