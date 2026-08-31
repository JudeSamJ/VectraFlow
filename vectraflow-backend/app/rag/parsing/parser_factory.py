from typing import Dict, Any, Type, Optional
from app.rag.parsing.base_parser import BaseParser
from app.rag.parsing.pdf_parser import PDFParser
from app.rag.parsing.docx_parser import DOCXParser
from app.rag.parsing.html_parser import HTMLParser
from app.rag.parsing.base_captioner import BaseImageCaptioner

_MIME_AND_EXT_TO_PARSER: Dict[str, Type[BaseParser]] = {
    "application/pdf": PDFParser,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DOCXParser,
    "text/html": HTMLParser,
    "text/plain": HTMLParser, # Treat txt similar to HTML for now (paragraphs)
    ".pdf": PDFParser,
    ".docx": DOCXParser,
    ".html": HTMLParser,
    ".htm": HTMLParser,
}


class ParserFactory:
    """
    Factory to instantiate the appropriate parser based on MIME type or file extension.

    Holds a VisionCaptioner (if image/OCR handling is enabled) and threads it
    into whichever parsers support embedded-image/scanned-page captioning.
    """

    def __init__(self, vision_captioner: Optional[BaseImageCaptioner] = None, max_vision_calls: int = 12):
        self.vision_captioner = vision_captioner
        self.max_vision_calls = max_vision_calls

    def get_parser(self, mime_type: str, filename: str) -> BaseParser:
        # Try MIME type first, then fall back to file extension
        parser_cls = _MIME_AND_EXT_TO_PARSER.get(mime_type)
        if not parser_cls:
            ext = filename[filename.rfind("."):].lower() if "." in filename else ""
            parser_cls = _MIME_AND_EXT_TO_PARSER.get(ext)
        if not parser_cls:
            raise ValueError(f"No parser available for mime_type: {mime_type} or file: {filename}")

        if parser_cls in (PDFParser, DOCXParser):
            return parser_cls(vision_captioner=self.vision_captioner, max_vision_calls=self.max_vision_calls)
        return parser_cls()
