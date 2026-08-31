import base64
import structlog
from typing import Optional
from app.rag.parsing.base_parser import ParsedBlock
from app.rag.parsing.base_captioner import BaseImageCaptioner

logger = structlog.get_logger(__name__)


class VisionCaptioner(BaseImageCaptioner):
    """
    Uses a vision-capable LLM to turn page images / embedded figures into
    searchable text — either a literal transcription (for a scanned or
    design-tool-exported page with no real text layer) or a description
    (for a photo/chart/diagram).

    Backed by Groq's OpenAI-compatible API using a multimodal model
    (GROQ_VISION_MODEL), since that's the LLM provider this app already
    requires — no separate OCR engine or vision API account needed.
    """

    def __init__(self, api_key: str, model_name: str):
        import openai
        self.client = openai.AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        self.model_name = model_name

    async def caption_image(
        self,
        image_bytes: bytes,
        page_number: Optional[int],
        context_heading: str = "",
        mode: str = "describe",
    ) -> Optional[ParsedBlock]:
        """
        mode="transcribe": the image IS the page (scanned/rasterized/design-tool
        export with no extractable text layer) — ask the model to read out
        everything on it verbatim, as if OCR'ing it.
        mode="describe": the image is an embedded figure/chart/photo inside an
        otherwise text-bearing page — ask for a descriptive caption instead.
        Returns None if the model finds nothing worth indexing (e.g. a blank
        or purely decorative image), so callers can skip adding empty blocks.
        """
        b64 = base64.b64encode(image_bytes).decode("ascii")

        if mode == "transcribe":
            prompt = (
                "Transcribe every piece of text visible in this document page image, "
                "preserving reading order (e.g. name/title, then sections, then details). "
                "Include headings, labels, and any text in tables or sidebars. "
                "If the page is blank or has no legible text, reply with exactly: NONE."
            )
        else:
            prompt = (
                "Describe this image in detail as it would be useful for someone searching "
                "a knowledge base — what it shows, key data points, labels, and any text "
                "visible in it (charts, diagrams, photos, tables, etc). "
                "If it's purely decorative with no informational content, reply with exactly: NONE."
            )

        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                }],
                temperature=0.1,
                max_tokens=1024,
            )
            caption = (response.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning("vision_caption_failed", page=page_number, error=str(e))
            return None

        if not caption or caption.upper() == "NONE":
            return None

        logger.info("image_captioned", page=page_number, mode=mode, chars=len(caption))
        prefix = "[Page content]" if mode == "transcribe" else "[Image]"
        return ParsedBlock(
            text=f"{prefix} {caption}",
            block_type="paragraph",
            page_number=page_number,
            heading_path=[context_heading] if context_heading else [],
        )
