import uuid
import enum
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, ForeignKey, Integer, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import JSONB, UUID
from .base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin

class IndexStatus(str, enum.Enum):
    empty = "empty"
    indexing = "indexing"
    ready = "ready"
    degraded = "degraded"
    error = "error"

class KnowledgeBase(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "knowledge_bases"

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    milvus_collection_name: Mapped[str] = mapped_column(String, unique=True)
    
    pipeline_config: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    document_count: Mapped[int] = mapped_column(Integer, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens_indexed: Mapped[int] = mapped_column(BigInteger, default=0)
    storage_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    last_ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    index_status: Mapped[IndexStatus] = mapped_column(Enum(IndexStatus), default=IndexStatus.empty)
    
    owner = relationship("User", back_populates="knowledge_bases")
    documents = relationship("Document", back_populates="knowledge_base", cascade="all, delete-orphan")
