import uuid
import enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, ARRAY, VARCHAR
from .base import Base, UUIDMixin, TimestampMixin

class PIIAction(str, enum.Enum):
    redact_before_send = "redact_before_send"
    block_ingestion = "block_ingestion"
    flag_only = "flag_only"

class PIIPolicy(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pii_policies"

    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"), unique=True)
    
    detect_categories: Mapped[list[str]] = mapped_column(ARRAY(VARCHAR))
    action: Mapped[PIIAction] = mapped_column(Enum(PIIAction))
    allowed_provider_regions: Mapped[list[str] | None] = mapped_column(ARRAY(VARCHAR), nullable=True)
    restore_in_final_answer: Mapped[bool] = mapped_column(Boolean, default=False)
