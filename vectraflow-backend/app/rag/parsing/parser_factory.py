from typing import Dict, Any, Type
from app.rag.parsing.base_parser import BaseParser
from app.rag.parsing.pdf_parser import PDFParser
from app.rag.parsing.docx_parser import DOCXParser
from app.rag.parsing.html_parser import HTMLParser

class ParserFactory:
    """
    Factory to instantiate the appropriate parser based on MIME type or file extension.
    """
    _parsers: Dict[str, Type[BaseParser]] = {
        "application/pdf": PDFParser,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DOCXParser,
        "text/html": HTMLParser,
        "text/plain": HTMLParser, # Treat txt similar to HTML for now (paragraphs)
        ".pdf": PDFParser,
        ".docx": DOCXParser,
        ".html": HTMLParser,
        ".htm": HTMLParser,
    }

    @classmethod
    def get_parser(cls, mime_type: str, filename: str) -> BaseParser:
        # Try MIME type first
        parser_cls = cls._parsers.get(mime_type)
        if parser_cls:
            return parser_cls()
            
        # Fallback to extension
        ext = ""
        if "." in filename:
            ext = filename[filename.rfind(".") :].lower()
            
        parser_cls = cls._parsers.get(ext)
        if parser_cls:
            return parser_cls()
            
        raise ValueError(f"No parser available for mime_type: {mime_type} or file extension: {ext}")
