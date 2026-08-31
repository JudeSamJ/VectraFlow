import io
import docx
import structlog
from typing import List, Dict, Any, Tuple, Optional
from app.rag.parsing.base_parser import BaseParser, ParsedBlock
from app.rag.parsing.image_captioner import VisionCaptioner

logger = structlog.get_logger(__name__)

# Skip tiny embedded images (bullets, icons, decorative dividers) — not worth a vision call.
MIN_IMAGE_BYTES = 4000


class DOCXParser(BaseParser):
    """
    Parses DOCX files using python-docx.
    Uses paragraph styles to detect headings and builds a hierarchical heading path.

    Embedded images (photos, charts, diagrams) are captioned via a
    vision-capable LLM, if one is configured, so their content is searchable too.
    """

    def __init__(self, vision_captioner: Optional[VisionCaptioner] = None, max_vision_calls: int = 12):
        self.vision_captioner = vision_captioner
        self.max_vision_calls = max_vision_calls

    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        blocks = []
        heading_stack: List[Tuple[int, str]] = []  # Stack of (heading_level, text)

        try:
            doc = docx.Document(io.BytesIO(file_content))
        except Exception as e:
            logger.error("docx_parse_open_failed", error=str(e), filename=metadata.get("filename"))
            raise

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            style_name = para.style.name if para.style else ""

            is_heading = style_name.startswith("Heading")
            heading_level = 99 # Not a heading

            if is_heading:
                try:
                    heading_level = int(style_name.split()[-1])
                except ValueError:
                    is_heading = False

            if is_heading:
                # Pop headings from stack that are deeper or at the same level
                while heading_stack and heading_stack[-1][0] >= heading_level:
                    heading_stack.pop()
                heading_stack.append((heading_level, text))

                # Add heading as a block itself, with its parent path
                current_path = [h[1] for h in heading_stack[:-1]]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="heading",
                    page_number=None, # DOCX doesn't have fixed pages easily accessible here
                    heading_path=current_path,
                    bbox=None
                ))
            else:
                # Standard paragraph
                current_path = [h[1] for h in heading_stack]
                blocks.append(ParsedBlock(
                    text=text,
                    block_type="paragraph",
                    page_number=None,
                    heading_path=current_path,
                    bbox=None
                ))

        if self.vision_captioner:
            image_blocks = await self._caption_embedded_images(doc)
            blocks.extend(image_blocks)

        return blocks

    async def _caption_embedded_images(self, doc) -> List[ParsedBlock]:
        blocks: List[ParsedBlock] = []
        vision_calls_used = 0
        try:
            image_parts = [
                part for part in doc.part.related_parts.values()
                if getattr(part, "content_type", "").startswith("image/")
            ]
        except Exception as e:
            logger.warning("docx_image_enumeration_failed", error=str(e))
            return blocks

        for part in image_parts:
            if vision_calls_used >= self.max_vision_calls:
                break
            try:
                image_bytes = part.blob
            except Exception:
                continue
            if not image_bytes or len(image_bytes) < MIN_IMAGE_BYTES:
                continue
            try:
                vision_block = await self.vision_captioner.caption_image(
                    image_bytes, page_number=None, context_heading="", mode="describe"
                )
            except Exception as e:
                logger.warning("docx_image_caption_failed", error=str(e))
                continue
            vision_calls_used += 1
            if vision_block:
                blocks.append(vision_block)

        return blocks
