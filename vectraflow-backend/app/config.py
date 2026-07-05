<<<<<<< HEAD
from typing import Optional
=======
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Synapse RAG API"
<<<<<<< HEAD
    ENVIRONMENT: str = "production"
    SECRET_KEY: str
=======
    ENVIRONMENT: str = "development"
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
    DEBUG: bool = False
    SECRET_KEY: str

<<<<<<< HEAD
    # Database — Neon serverless Postgres
    DATABASE_URL: str

    # Redis — Upstash
    REDIS_URL: str

    # -------------------------------------------------------
    # Milvus / Zilliz Cloud
    # For Zilliz Cloud set MILVUS_URI + MILVUS_TOKEN.
    # Legacy host/port kept for local fallback.
    # -------------------------------------------------------
    MILVUS_URI: Optional[str] = None          # e.g. https://xxx.zillizcloud.com:19530
    MILVUS_TOKEN: Optional[str] = None        # Zilliz API key (user:password combined)
    MILVUS_HOST: str = "localhost"            # ignored when MILVUS_URI is set
    MILVUS_PORT: int = 19530
    MILVUS_USER: Optional[str] = None
    MILVUS_PASSWORD: Optional[str] = None

    # -------------------------------------------------------
    # AWS — shared credentials used by S3, SES, Bedrock, etc.
    # -------------------------------------------------------
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"

    # AWS S3 — object storage
    AWS_S3_BUCKET: str = "synapse-documents"
    # Optional: set only when using a VPC endpoint or localstack
    AWS_S3_ENDPOINT_URL: Optional[str] = None

    # Auth / JWT
=======
    DATABASE_URL: str
    REDIS_URL: str

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

<<<<<<< HEAD
    # Encryption (for per-KB API keys stored in DB)
    ENCRYPTION_KEY: str

    # -------------------------------------------------------
    # Groq Cloud — open-source LLM inference (free tier)
    # groq.com → API Keys → Create API Key
    # -------------------------------------------------------
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # -------------------------------------------------------
    # Hugging Face TEI — self-hosted open-source embeddings
    # Deploy on EC2: docker run -p 8080:80 ghcr.io/huggingface/text-embeddings-inference
    #   --model-id BAAI/bge-m3
    # Set to the public URL of that server, e.g. http://1.2.3.4:8080
    # -------------------------------------------------------
    HUGGINGFACE_TEI_ENDPOINT: Optional[str] = None

    # Reranker — Cohere free trial recommended; leave blank to disable
    COHERE_API_KEY: Optional[str] = None
    COHERE_RERANK_API_KEY: Optional[str] = None

    # Vision — set to "groq" to use LLaVA via Groq when available, else skip captioning
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

    # Versioning
    DOCUMENT_VERSION_RETENTION_DAYS: int = 90

    # Celery
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
=======
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    GOOGLE_API_KEY: str
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768
    GEMINI_CHAT_MODEL: str = "models/gemini-2.5-flash"
    GEMINI_MAX_TOKENS: int = 1024

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

    @property
    def celery_broker(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


settings = Settings()
