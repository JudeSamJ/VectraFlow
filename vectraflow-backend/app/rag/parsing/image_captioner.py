import structlog
from app.rag.embeddings.base_provider import BaseLLMProvider
from app.rag.parsing.base_parser import ParsedBlock

logger = structlog.get_logger(__name__)

class ImageCaptioner:
    """
    Uses a vision-capable LLM to generate captions for embedded charts and figures.
    """
    def __init__(self, vision_llm: BaseLLMProvider):
        self.vision_llm = vision_llm
        
    async def caption_image(self, image_bytes: bytes, page_number: int, context_heading: str) -> ParsedBlock:
        """
        Sends image to LLM and returns a ParsedBlock.
        """
        # Mocking the actual vision call for now.
        sys_prompt = "You are a data analyst. Describe this chart in detail."
        messages = [{"role": "system", "content": sys_prompt}, {"role": "user", "content": "<image bytes>"}]
        
        # In a real impl, we'd base64 encode the image.
        caption = await self.vision_llm.generate(messages, temperature=0.1)
        
        logger.info("image_captioned", page=page_number)
        return ParsedBlock(
            block_type="text", # We store it as searchable text
            text=f"[Image Caption]: {caption}",
            page_number=page_number,
            heading_path=[context_heading]
        )
