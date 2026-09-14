import structlog
from typing import Any, Dict, List, Tuple

from app.rag.parsing.base_parser import ParsedBlock
from app.rag.chunking.base_chunker import BaseChunker, Chunk
from app.core.token_counter import token_counter

logger = structlog.get_logger(__name__)


class EntityRecordChunker(BaseChunker):
    """
    Chunking strategy for structured records (e.g. D365 F&O entities) —
    entirely separate from SemanticChunker, which groups document
    paragraphs by heading boundaries. That grouping logic doesn't fit
    structured records: each input ParsedBlock here is already one
    complete, self-contained "Item X, named Y, ..." sentence (see
    entity_record_to_block() below), not a document paragraph that only
    makes sense alongside its surrounding heading context.

    Groups blocks by heading_path and only ever merges blocks that share
    the same heading_path into one Chunk, splitting on max_chunk_size
    tokens within a group. Callers that need one Milvus document_id per
    source record (e.g. for precise incremental re-sync — see
    app/tasks/d365_sync_tasks.py) should give each record's block a
    heading_path that includes its own record id, so this chunker never
    merges two different records into the same chunk.
    """

    async def chunk(self, blocks: List[ParsedBlock], config: Any) -> List[Chunk]:
        max_chunk_size = (config or {}).get("max_chunk_size", 512)

        groups: Dict[Tuple[str, ...], List[ParsedBlock]] = {}
        order: List[Tuple[str, ...]] = []
        for block in blocks:
            key = tuple(block.heading_path)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(block)

        chunks: List[Chunk] = []
        for key in order:
            current_texts: List[str] = []
            current_tokens = 0

            for block in groups[key]:
                block_tokens = token_counter.count(block.text)
                if current_texts and current_tokens + block_tokens > max_chunk_size:
                    chunks.append(self._finalize(current_texts, current_tokens, key))
                    current_texts, current_tokens = [], 0
                current_texts.append(block.text)
                current_tokens += block_tokens

            if current_texts:
                chunks.append(self._finalize(current_texts, current_tokens, key))

        return chunks

    def _finalize(self, texts: List[str], token_count: int, heading_path: Tuple[str, ...]) -> Chunk:
        return Chunk(
            text="\n".join(texts),
            token_count=token_count,
            metadata={
                "heading_path": list(heading_path),
                "page_number": None,
                "type": "structured_record",
                "tags": list(heading_path),
            },
        )


def entity_record_to_block(text: str, heading_path: List[str]) -> ParsedBlock:
    """
    Wraps an already-templated record sentence (see
    app.integrations.d365.text_templater.entity_record_to_text) as a
    ParsedBlock this chunker can consume — keeps the "turn structured
    fields into a sentence" concern (the templater) separate from the
    "group sentences into embedding-sized chunks" concern (this chunker).
    """
    return ParsedBlock(text=text, block_type="paragraph", page_number=None, heading_path=heading_path)
