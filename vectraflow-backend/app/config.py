from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Synapse RAG API"
    ENVIRONMENT: str = "production"
    SECRET_KEY: str
    DEBUG: bool = False

    # Database — Neon serverless Postgres
    DATABASE_URL: str

    # Redis — Upstash
    REDIS_URL: str

    # Milvus / Zilliz Cloud
    MILVUS_URI: Optional[str] = None
    MILVUS_TOKEN: Optional[str] = None
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_USER: Optional[str] = None
    MILVUS_PASSWORD: Optional[str] = None

    # AWS
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str = "synapse-documents"
    AWS_S3_ENDPOINT_URL: Optional[str] = None

    # Auth / JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption
    ENCRYPTION_KEY: str

    # Groq Cloud
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Hugging Face TEI
    HUGGINGFACE_TEI_ENDPOINT: Optional[str] = None

    # Reranker
    COHERE_API_KEY: Optional[str] = None
    COHERE_RERANK_API_KEY: Optional[str] = None

    VISION_CAPTIONING_PROVIDER: str = "none"

    # Governance & PII
    PII_DETECTION_ENABLED: bool = True
    DEFAULT_PII_ACTION: str = "redact_before_send"
    AUDIT_LOG_RETENTION_DAYS: int = 2555

    # Agentic retrieval
    AGENTIC_MAX_STEPS: int = 4
    AGENTIC_MAX_COST_USD: float = 0.50
    AGENTIC_MAX_WALL_CLOCK_SECONDS: int = 60

    # Resilience
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_WINDOW_SECONDS: int = 60
    INGESTION_PER_DOCUMENT_TIMEOUT_SECONDS: int = 600
    INGESTION_MAX_RETRY_ATTEMPTS: int = 3
    INGESTION_PER_KB_CONCURRENCY_LIMIT: int = 10

    DOCUMENT_VERSION_RETENTION_DAYS: int = 90

    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @property
    def celery_broker(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


settings = Settings()
