import fitz  # PyMuPDF
import structlog
from typing import List, Dict, Any, Tuple, Optional
from app.rag.parsing.base_parser import BaseParser, ParsedBlock
from app.rag.parsing.base_captioner import BaseImageCaptioner

logger = structlog.get_logger(__name__)

# Below this many extracted text characters, a page is treated as having no
# real text layer (scanned page, or a design-tool export like Canva/Figma
# that rasterizes everything) and gets OCR'd via the page-image fallback
# instead. A short heading-only page can legitimately have little text, so
# this is intentionally low rather than zero.
MIN_TEXT_CHARS_PER_PAGE = 40

# Cap on genuinely embedded (non-fallback) images captioned per page, so a
# figure-heavy page doesn't alone exhaust the whole document's vision-call budget.
MAX_EMBEDDED_IMAGES_PER_PAGE = 2


class PDFParser(BaseParser):
    """
    Parses PDF files using PyMuPDF.
    Uses font size heuristics to detect headings and builds a hierarchical heading path.

    When a page has little/no extractable text (a scanned page, or a
    design-tool export like Canva/Figma that rasterizes the whole page),
    falls back to rendering the page as an image and transcribing it via a
    vision-capable LLM. Genuinely embedded images (photos, charts, diagrams)
    on otherwise text-bearing pages are also captioned the same way.
    """

    def __init__(self, vision_captioner: Optional[BaseImageCaptioner] = None, max_vision_calls: int = 12):
        self.vision_captioner = vision_captioner
        self.max_vision_calls = max_vision_calls

    async def parse(self, file_content: bytes, metadata: Dict[str, Any]) -> List[ParsedBlock]:
        blocks = []
        heading_stack: List[Tuple[float, str]] = []  # Stack of (font_size, text)
        vision_calls_used = 0

        try:
            doc = fitz.open("pdf", file_content)
        except Exception as e:
            logger.error("pdf_parse_open_failed", error=str(e), filename=metadata.get("filename"))
            raise

        for page_num in range(len(doc)):
            page = doc[page_num]
            # Use dict to extract style info
            page_dict = page.get_text("dict")

            page_text_chars = 0
            page_blocks: List[ParsedBlock] = []

            for b in page_dict.get("blocks", []):
                if b.get("type") == 0: # text block
                    block_text = ""
                    max_size = 0.0
                    bbox = b.get("bbox")

                    for line in b.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            size = span.get("size", 0.0)
                            if text.strip():
                                block_text += text + " "
                                if size > max_size:
                                    max_size = size

                    block_text = block_text.strip()
                    if not block_text:
                        continue

                    page_text_chars += len(block_text)

                    # Heuristic for headings: usually larger than body text (typically ~10-12pt)
                    # We assume anything > 12pt and reasonably short is a heading.
                    is_heading = max_size > 12.0 and len(block_text.split()) < 15

                    if is_heading:
                        # Pop headings from stack that are smaller or equal to current heading size
                        while heading_stack and heading_stack[-1][0] <= max_size:
                            heading_stack.pop()
                        heading_stack.append((max_size, block_text))

                        # Add heading as a block itself, with its parent path
                        current_path = [h[1] for h in heading_stack[:-1]]
                        page_blocks.append(ParsedBlock(
                            text=block_text,
                            block_type="heading",
                            page_number=page_num + 1,
                            heading_path=current_path,
                            bbox=bbox
                        ))
                    else:
                        # Standard paragraph
                        current_path = [h[1] for h in heading_stack]
                        page_blocks.append(ParsedBlock(
                            text=block_text,
                            block_type="paragraph",
                            page_number=page_num + 1,
                            heading_path=current_path,
                            bbox=bbox
                        ))

            if page_text_chars < MIN_TEXT_CHARS_PER_PAGE and self.vision_captioner and vision_calls_used < self.max_vision_calls:
                # No usable text layer on this page — render it and OCR/transcribe
                # it as an image instead of silently indexing nothing for it.
                try:
                    pixmap = page.get_pixmap(dpi=150)
                    image_bytes = pixmap.tobytes("png")
                    heading_context = heading_stack[-1][1] if heading_stack else metadata.get("filename", "")
                    vision_block = await self.vision_captioner.caption_image(
                        image_bytes, page_num + 1, heading_context, mode="transcribe"
                    )
                    vision_calls_used += 1
                    if vision_block:
                        page_blocks.append(vision_block)
                        logger.info("pdf_page_image_fallback_used", page=page_num + 1)
                except Exception as e:
                    logger.warning("pdf_page_image_fallback_failed", page=page_num + 1, error=str(e))
            elif self.vision_captioner and vision_calls_used < self.max_vision_calls:
                # Page has real text — still caption a bounded number of genuinely
                # embedded images (photos/charts/diagrams) so they're searchable too.
                try:
                    image_list = page.get_images(full=True)[:MAX_EMBEDDED_IMAGES_PER_PAGE]
                    for img in image_list:
                        if vision_calls_used >= self.max_vision_calls:
                            break
                        xref = img[0]
                        try:
                            extracted = doc.extract_image(xref)
                        except Exception:
                            continue
                        image_bytes = extracted.get("image")
                        # Skip tiny images (icons, bullets, decorative dividers) — not worth a vision call
                        if not image_bytes or len(image_bytes) < 4000:
                            continue
                        heading_context = heading_stack[-1][1] if heading_stack else ""
                        vision_block = await self.vision_captioner.caption_image(
                            image_bytes, page_num + 1, heading_context, mode="describe"
                        )
                        vision_calls_used += 1
                        if vision_block:
                            page_blocks.append(vision_block)
                except Exception as e:
                    logger.warning("pdf_embedded_image_captioning_failed", page=page_num + 1, error=str(e))

            blocks.extend(page_blocks)

        doc.close()
        return blocks
