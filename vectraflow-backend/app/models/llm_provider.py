import uuid
import enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, UUIDMixin, TimestampMixin

class LLMProviderType(str, enum.Enum):
    openai = "openai"
    anthropic = "anthropic"
    gemini = "gemini"
    bedrock = "bedrock"
    azure_openai = "azure_openai"
    local_vllm = "local_vllm"

class LLMProvider(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "llm_providers"

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    provider_type: Mapped[LLMProviderType] = mapped_column(Enum(LLMProviderType))
    model_name: Mapped[str] = mapped_column(String)
    api_key_encrypted: Mapped[str | None] = mapped_column(String, nullable=True)
    endpoint_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
