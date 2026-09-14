import enum
import uuid
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB

from .base import Base, UUIDMixin, TimestampMixin


class D365ActionStatus(str, enum.Enum):
    pending_confirmation = "pending_confirmation"
    executed = "executed"
    failed = "failed"
    cancelled = "cancelled"


class D365ActionLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit trail for the D365 write "action layer" (app/services/action_handler.py)
    — separate from the generic AuditLog table (audit_log.py), which is a
    flat fire-and-forget event log with no lifecycle. Every action a user
    asks the chatbot to take is staged here as pending_confirmation *before*
    anything is sent to D365, then updated in place once the user confirms
    (or cancels) it — so this table is both the confirmation record and the
    execution audit log the user/timestamp/action/parameters/result Step 2
    requirement asks for.
    """
    __tablename__ = "d365_action_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    knowledge_base_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_bases.id"), nullable=True, index=True
    )
    action_name: Mapped[str] = mapped_column(String(64), index=True)
    parameters: Mapped[dict] = mapped_column(JSONB)
    status: Mapped[D365ActionStatus] = mapped_column(
        Enum(D365ActionStatus), default=D365ActionStatus.pending_confirmation, index=True
    )
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
