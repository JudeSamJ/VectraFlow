import uuid
import enum
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, UUIDMixin, TimestampMixin

class PrincipalType(str, enum.Enum):
    user = "user"
    tag_based = "tag_based"

class AccessScope(str, enum.Enum):
    knowledge_base = "knowledge_base"
    document = "document"
    tag = "tag"

class AccessPermission(str, enum.Enum):
    read = "read"
    admin = "admin"

class AccessGrant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "access_grants"

    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id"))
    
    principal_type: Mapped[PrincipalType] = mapped_column(Enum(PrincipalType))
    principal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    scope: Mapped[AccessScope] = mapped_column(Enum(AccessScope))
    resource_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    tag_expression: Mapped[str | None] = mapped_column(String, nullable=True)
    
    permission: Mapped[AccessPermission] = mapped_column(Enum(AccessPermission))
    
    granted_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
