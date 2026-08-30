from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "VectraFlow RAG API"
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

    # Cloudinary — document object storage (no AWS anywhere in this app)
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    # Auth / JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000,https://vectraflow-frontend.vercel.app,https://vectraflow-frontend-git-main-judes-projects-f6c1a54d.vercel.app/,https://vectraflow-frontend-8ncwqny78-judes-projects-f6c1a54d.vercel.app/"
    CORS_ALLOWED_ORIGIN_REGEX: str = r"https://.*\.vercel\.app$"

    # This backend's own public URL (no trailing slash) — used to build the
    # OAuth redirect_uri sent to Google/GitHub. Must exactly match what's
    # registered in each provider's OAuth app settings.
    OAUTH_REDIRECT_BASE_URL: str = "http://localhost:8000"
    # The frontend's public URL — OAuth callbacks and password-reset emails
    # redirect/link back here.
    FRONTEND_URL: str = "http://localhost:5173"

    # Google OAuth (console.cloud.google.com -> APIs & Services -> Credentials).
    # Leave unset to keep "Continue with Google" disabled.
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # GitHub OAuth (github.com/settings/developers -> OAuth Apps).
    # Leave unset to keep "Continue with GitHub" disabled.
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None

    # Transactional email for password reset — Resend (resend.com), free tier
    # covers 3,000 emails/month. Leave unset to keep forgot-password disabled
    # (the endpoint still responds successfully — it just won't send anything
    # — so it never reveals whether an email address has an account).
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "VectraFlow <onboarding@resend.dev>"

    # Encryption
    ENCRYPTION_KEY: str

    # Groq Cloud
    GROQ_API_KEY: str
    # llama-3.3-70b-versatile was deprecated by Groq; openai/gpt-oss-120b is
    # the recommended same-tier replacement (see console.groq.com/docs/deprecations).
    GROQ_MODEL: str = "openai/gpt-oss-120b"

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

    # Free-tier guardrails
    # Zilliz Cloud's free tier caps an account at 5 vector collections total,
    # so we cap knowledge base creation app-wide (across all users) to match.
    MAX_KNOWLEDGE_BASES: int = 5
    # When true, any signed-in user may delete any knowledge base (not just their
    # own) so the shared free-tier Zilliz slots can be freed up by whoever needs
    # one next. Turn this off once the app has per-user billing/quotas.
    SHARED_KB_POOL_MODE: bool = True

    # Cloudinary's free plan is 25 credits/month, shared across storage,
    # bandwidth, and transformations combined (1 credit ~= 1GB of any of
    # them) — not a dedicated storage-only cap. Default to a conservative
    # slice of that pool so uploads alone can't exhaust the whole monthly
    # allowance; tune via env once you know your actual usage mix.
    MAX_TOTAL_STORAGE_BYTES: int = 3 * 1024 * 1024 * 1024

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
