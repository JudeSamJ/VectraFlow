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
    def __init__(self, chunker: BaseChunker, embedder: BaseEmbeddingProvider, indexer: MilvusIndexManager):
        self.chunker = chunker
        self.embedder = embedder
        self.indexer = indexer
        self.splitter = LongDocumentSplitter()

    async def run(self, document: Document, kb: KnowledgeBase, file_content: bytes) -> dict:
        logger.info("ingestion_pipeline_started", document_id=str(document.id))
        
        # 1. PARSE
        parser = ParserFactory.get_parser(document.mime_type, document.filename)
        raw_blocks = await parser.parse(file_content, {"filename": document.filename, "mime_type": document.mime_type})
        
        # 2. SPLIT (Long Documents)
        sections = self.splitter.split(raw_blocks)
        
        total_chunks = 0
        for section_blocks in sections:
            # 3. CHUNK
            chunks = await self.chunker.chunk(section_blocks, kb.pipeline_config.get("chunking", {}))
            if not chunks:
                continue
                
            # 4. EMBED
            embeddings = await self.embedder.embed_batch([c.text for c in chunks])
            
            # 5. INDEX
            await self.indexer.upsert(kb.milvus_collection_name, str(document.id), chunks, embeddings)
            total_chunks += len(chunks)
        
        # 6. POST-PROCESS
        logger.info("ingestion_pipeline_completed", document_id=str(document.id), chunk_count=total_chunks)
        return {"status": "success", "chunks_indexed": total_chunks}
