import uuid
import structlog
from app.models.knowledge_base import KnowledgeBase
from app.models.document import Document
from app.rag.parsing.parser_factory import ParserFactory
from app.rag.chunking.base_chunker import BaseChunker
from app.rag.embeddings.base_provider import BaseEmbeddingProvider
from app.rag.indexing.milvus_index_manager import MilvusIndexManager
from app.rag.parsing.long_document_splitter import LongDocumentSplitter

logger = structlog.get_logger(__name__)

class IngestionPipeline:
    def __init__(
        self,
        chunker: BaseChunker,
        embedder: BaseEmbeddingProvider,
        index_manager: MilvusIndexManager,
        parser_factory: ParserFactory = None,
    ):
        self.chunker = chunker
        self.embedder = embedder
        self.indexer = index_manager
        self.parser_factory = parser_factory or ParserFactory()
        self.splitter = LongDocumentSplitter()

    async def run(self, document, kb, file_content: bytes) -> dict:
        """
        document: any object with .id, .mime_type, .filename
        kb: any object with .milvus_collection_name, .pipeline_config (dict or None)
        """
        logger.info("ingestion_pipeline_started", document_id=str(document.id))

        pipeline_config = getattr(kb, "pipeline_config", None) or {}

        # 1. PARSE
        parser = ParserFactory.get_parser(
            getattr(document, "mime_type", "text/plain"),
            getattr(document, "filename", getattr(document, "file_name", "file.txt")),
        )
        raw_blocks = await parser.parse(
            file_content,
            {
                "filename": getattr(document, "filename", getattr(document, "file_name", "")),
                "mime_type": getattr(document, "mime_type", "text/plain"),
            },
        )

        # 2. SPLIT (Long Documents)
        sections = self.splitter.split(raw_blocks)

        # 3. Ensure Milvus collection exists
        dimensions = getattr(kb, "embedding_dimensions", 384)
        await self.indexer.create_collection(kb.milvus_collection_name, dimensions=dimensions)

        total_chunks = 0
        for section_blocks in sections:
            # 4. CHUNK
            chunks = await self.chunker.chunk(section_blocks, pipeline_config.get("chunking", {}))
            if not chunks:
                continue

            # 5. EMBED
            embeddings = await self.embedder.embed_batch([c.text for c in chunks])

            # 6. INDEX
            await self.indexer.upsert(kb.milvus_collection_name, str(document.id), chunks, embeddings)
            total_chunks += len(chunks)

        logger.info("ingestion_pipeline_completed", document_id=str(document.id), chunk_count=total_chunks)
        return {"status": "success", "chunks_indexed": total_chunks}
