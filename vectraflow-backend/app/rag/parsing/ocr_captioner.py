import structlog
from io import BytesIO
from typing import Optional
from app.rag.parsing.base_parser import ParsedBlock
from app.rag.parsing.base_captioner import BaseImageCaptioner

logger = structlog.get_logger(__name__)

# Below this many characters, treat the OCR result as noise/nothing found
# (Tesseract often emits a handful of stray characters on blank/decorative images).
MIN_OCR_CHARS = 8


class TesseractOCR(BaseImageCaptioner):
    """
    Local OCR via Tesseract (pytesseract) — reads text out of page images
    directly, with no external API, no API key, and no model-availability
    risk (unlike a hosted vision LLM, which can change or restrict which
    models an account can use at any time).

    This only extracts literal text — it can't describe a purely visual
    figure the way a vision-LLM caption would (e.g. "a bar chart showing
    revenue by quarter"), but it reliably solves the main failure mode this
    exists for: a PDF page with no real text layer (a scanned page, or a
    design-tool export like Canva/Figma that rasterizes the whole page) —
    which is exactly a page full of text that just isn't machine-readable
    without OCR. For an embedded photo/chart with no legible text on it,
    caption_image() just returns None (nothing to add) rather than guessing.
    """

    def __init__(self, lang: str = "eng"):
        self.lang = lang

    async def caption_image(
        self,
        image_bytes: bytes,
        page_number: Optional[int],
        context_heading: str = "",
        mode: str = "describe",
    ) -> Optional[ParsedBlock]:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            logger.warning("tesseract_ocr_dependencies_missing")
            return None

        try:
            image = Image.open(BytesIO(image_bytes))
            text = pytesseract.image_to_string(image, lang=self.lang).strip()
        except Exception as e:
            logger.warning("tesseract_ocr_failed", page=page_number, error=str(e))
            return None

        if len(text) < MIN_OCR_CHARS:
            return None

        logger.info("image_ocred", page=page_number, mode=mode, chars=len(text))
        prefix = "[Page content]" if mode == "transcribe" else "[Image text]"
        return ParsedBlock(
            text=f"{prefix} {text}",
            block_type="paragraph",
            page_number=page_number,
            heading_path=[context_heading] if context_heading else [],
        )
