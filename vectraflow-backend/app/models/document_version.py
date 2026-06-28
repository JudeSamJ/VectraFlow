import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from .base import Base, UUIDMixin, TimestampMixin

class DocumentVersion(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_versions"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"))
    version_number: Mapped[int] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(String)
    storage_path: Mapped[str] = mapped_column(String)
    chunk_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), default=list)
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="versions")
