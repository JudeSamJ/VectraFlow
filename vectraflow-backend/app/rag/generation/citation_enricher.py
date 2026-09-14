"""
Turns the raw per-chunk citation dicts PromptBuilder attaches to a RAG
answer (chunk_id/document_id/page_number/section_heading/source_type/
excerpt/score — see prompt_builder.py) into the structured citation shape
the API response and frontend render: source_type, source_name, and
source_reference, alongside the existing fields.

Kept separate from prompt_builder.py because resolving a real document
filename needs a DB lookup, and prompt_builder has no DB session — this
module is the one place (called from kb_chat.py, which already has `db`)
that does that enrichment. Nothing here changes the retrieval/generation
path itself; it only reshapes citation metadata that was already being
produced.
"""
from typing import Any, Dict, List

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.document import Document
from app.integrations.d365.entity_config import BUILTIN_ENTITIES

logger = structlog.get_logger(__name__)

# Reverse lookup: the human-readable heading a D365 chunk's section_heading
# starts with (see entity_record_chunker.py / d365_sync_tasks.py, which key
# each chunk's heading_path as [entity_config.heading, record_id]) back to
# the real OData entity set name, so a citation can link straight to the
# record. Built once from the same BUILTIN_ENTITIES registry the sync task
# uses, so it can never drift out of sync with it.
_HEADING_TO_ENTITY_NAME: Dict[str, str] = {
    (cfg.heading or cfg.entity_name): cfg.entity_name for cfg in BUILTIN_ENTITIES.values()
}


def _d365_source_name_and_reference(section_heading: str) -> tuple[str, str | None]:
    heading, _, record_id = (section_heading or "").partition(" > ")
    heading = heading.strip()
    record_id = record_id.strip()
    entity_name = _HEADING_TO_ENTITY_NAME.get(heading)

    source_name = f"{heading or entity_name or 'D365 record'}" + (f" · {record_id}" if record_id else "")

    source_reference = None
    if entity_name and record_id and settings.D365_BASE_URL:
        source_reference = f"{settings.D365_BASE_URL.rstrip('/')}/data/{entity_name}('{record_id}')"

    return source_name, source_reference


async def enrich_citations(raw_citations: List[Dict[str, Any]], db: AsyncSession) -> List[Dict[str, Any]]:
    """
    raw_citations: the list PromptBuilder produced (one dict per cited
    chunk, already carrying index/chunk_id/document_id/page_number/
    section_heading/source_type/excerpt/score).

    Returns the same citations with source_type normalized to "document" |
    "d365_record", plus source_name and source_reference filled in —
    additively; every original key is preserved.
    """
    if not raw_citations:
        return []

    # Batch-resolve filenames for every distinct document-type citation in
    # one query instead of one per citation.
    doc_ids = {
        c.get("document_id")
        for c in raw_citations
        if c.get("source_type") != "structured_record" and c.get("document_id")
    }
    filenames: Dict[str, str] = {}
    if doc_ids:
        try:
            result = await db.execute(select(Document.id, Document.filename).where(Document.id.in_(doc_ids)))
            filenames = {str(doc_id): filename for doc_id, filename in result.all()}
        except Exception as exc:
            # A citation missing its filename still degrades gracefully
            # (falls back to the section heading below) — never fail the
            # whole chat response over a lookup issue here.
            logger.warning("citation_filename_lookup_failed", error=str(exc))

    enriched: List[Dict[str, Any]] = []
    for c in raw_citations:
        is_d365 = c.get("source_type") == "structured_record"
        section_heading = c.get("section_heading") or ""

        if is_d365:
            source_name, source_reference = _d365_source_name_and_reference(section_heading)
            enriched.append({
                **c,
                "source_type": "d365_record",
                "source_name": source_name,
                "source_reference": source_reference,
            })
        else:
            document_id = c.get("document_id")
            source_name = filenames.get(str(document_id)) or section_heading or "Document"
            page_number = c.get("page_number")
            source_reference = str(page_number) if page_number else None
            enriched.append({
                **c,
                "source_type": "document",
                "source_name": source_name,
                "source_reference": source_reference,
            })

    return enriched
