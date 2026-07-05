import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
<<<<<<< HEAD
from app.config import settings
=======
from redis.asyncio import Redis
from sqlalchemy import text

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
from app.api.v1.router import api_router
from app.celery_app import celery_app
from app.config import settings
from app.database import async_session_maker
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.redis_client import get_redis

logger = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, version="2.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
<<<<<<< HEAD

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    setup_telemetry(app)
=======
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
    app.include_router(api_router, prefix="/api/v1")

    @app.on_event("startup")
    async def startup():
        logger.info("=== SYNAPSE STARTUP ===")
        logger.info("environment", value=settings.ENVIRONMENT)
        logger.info("database", value=settings.DATABASE_URL[:30] + "...")
        logger.info("redis", value=settings.REDIS_URL)

    @app.get("/health")
    async def health_check():
        services = {"database": "ok", "redis": "ok", "celery": "ok"}

        try:
            async with async_session_maker() as db:
                await db.execute(text("SELECT 1"))
        except Exception:  # noqa: BLE001
            services["database"] = "error"

        try:
            redis: Redis = await get_redis()
            await redis.ping()
        except Exception:  # noqa: BLE001
            services["redis"] = "error"

        try:
            celery_app.control.ping(timeout=1.0)
        except Exception:  # noqa: BLE001
            services["celery"] = "error"

        status = "ok" if all(v == "ok" for v in services.values()) else "degraded"
        return {"status": status, "version": "2.0.0", "services": services}

    return app


app = create_app()
