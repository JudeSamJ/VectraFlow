import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, UUIDMixin, TimestampMixin


class D365SyncState(Base, UUIDMixin, TimestampMixin):
    """
    Tracks incremental-sync progress for one (knowledge base, D365 entity)
    pair, so `sync_d365_entity` only re-embeds records changed since the
    last successful run instead of re-fetching everything each time.
    """
    __tablename__ = "d365_sync_states"
    __table_args__ = (
        UniqueConstraint("knowledge_base_id", "entity_name", name="uq_d365_sync_kb_entity"),
    )

    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_bases.id"), index=True
    )
    entity_name: Mapped[str] = mapped_column(String)

    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sync_status: Mapped[str] = mapped_column(String, default="never_run")
    last_sync_error: Mapped[str | None] = mapped_column(String, nullable=True)
    records_synced_last_run: Mapped[int] = mapped_column(Integer, default=0)
    records_synced_total: Mapped[int] = mapped_column(Integer, default=0)

    knowledge_base = relationship("KnowledgeBase")
