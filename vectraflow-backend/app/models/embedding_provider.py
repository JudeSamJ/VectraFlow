import uuid
import enum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Enum, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, UUIDMixin, TimestampMixin

class EmbeddingProviderType(str, enum.Enum):
    openai = "openai"
    cohere = "cohere"
    voyage = "voyage"
    huggingface_tei = "huggingface_tei"
    bedrock = "bedrock"
    local_sentence_transformers = "local_sentence_transformers"

class EmbeddingProvider(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "embedding_providers"

    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    provider_type: Mapped[EmbeddingProviderType] = mapped_column(Enum(EmbeddingProviderType))
    model_name: Mapped[str] = mapped_column(String)
    dimensions: Mapped[int] = mapped_column(Integer)
    api_key_encrypted: Mapped[str | None] = mapped_column(String, nullable=True)
    endpoint_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
