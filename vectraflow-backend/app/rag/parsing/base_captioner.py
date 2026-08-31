from abc import ABC, abstractmethod
from typing import Optional
from app.rag.parsing.base_parser import ParsedBlock


class BaseImageCaptioner(ABC):
    """
    Common interface for anything that turns a page/figure image into a
    searchable ParsedBlock — whether that's local OCR (no network/API
    needed) or a hosted vision-capable LLM.
    """

    @abstractmethod
    async def caption_image(
        self,
        image_bytes: bytes,
        page_number: Optional[int],
        context_heading: str = "",
        mode: str = "describe",
    ) -> Optional[ParsedBlock]:
        """
        mode="transcribe": the image IS the page (scanned/rasterized/design-tool
        export with no extractable text layer) — read out everything on it.
        mode="describe": the image is an embedded figure/chart/photo inside an
        otherwise text-bearing page.
        Returns None if there's nothing worth indexing (blank/no legible text).
        """
        raise NotImplementedError
