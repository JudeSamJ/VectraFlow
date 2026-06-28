import structlog
from app.rag.parsing.base_parser import ParsedBlock

logger = structlog.get_logger(__name__)

class ImageOCRParser:
    """
    Parses scanned documents (images) using OCR.
    Flags low confidence scores so the retrieval engine can penalize them.
    """
    def __init__(self):
        pass
        
    def parse(self, image_bytes: bytes, page_number: int) -> ParsedBlock:
        """
        Mock OCR implementation.
        """
        # In reality, this would use Tesseract or cloud OCR and return a confidence score.
        confidence = 0.85
        extracted_text = "This is text extracted from a scanned document."
        
        if confidence < 0.6:
            logger.warning("ocr_low_confidence", page=page_number, score=confidence)
            
        block = ParsedBlock(
            block_type="text",
            text=extracted_text,
            page_number=page_number,
            heading_path=["OCR Scan"]
        )
        # We append a custom field to the block's metadata
        # which will eventually propagate to Milvus.
        block.metadata = {"ocr_confidence_score": confidence}
        return block
