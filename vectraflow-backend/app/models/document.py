import uuid
import enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, ForeignKey, Integer, BigInteger
from sqlalchemy.dialects.postgresql import JSONB, UUID
from .base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin

class SourceType(str, enum.Enum):
    upload = "upload"
    url = "url"
    webhook = "webhook"
    api = "api"

class DocumentStatus(str, enum.Enum):
    pending = "pending"
    parsing = "parsing"
    chunking = "chunking"
    embedding = "embedding"
    indexing = "indexing"
    ready = "ready"
    failed = "failed"

class Document(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"))
    filename: Mapped[str] = mapped_column(String)
    mime_type: Mapped[str] = mapped_column(String)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType))
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    storage_path: Mapped[str] = mapped_column(String)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger)
    content_hash: Mapped[str] = mapped_column(String)
    
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), default=DocumentStatus.pending)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    parsed_page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    extracted_title: Mapped[str | None] = mapped_column(String, nullable=True)
    extracted_summary: Mapped[str | None] = mapped_column(String, nullable=True)
    language_detected: Mapped[str | None] = mapped_column(String, nullable=True)
    ingestion_job_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    knowledge_base = relationship("KnowledgeBase", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
