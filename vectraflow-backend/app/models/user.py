from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, Enum, ForeignKey
from .base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user)
    
    knowledge_bases = relationship("KnowledgeBase", back_populates="owner")
    api_keys = relationship("APIKey", back_populates="user")

class APIKey(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "api_keys"
    
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    hashed_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    
    user = relationship("User", back_populates="api_keys")
