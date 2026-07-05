from pymilvus import connections, utility
from app.config import settings
import structlog

logger = structlog.get_logger()

def connect_milvus() -> str:
    """
    Connect to Zilliz Cloud (preferred) or self-hosted Milvus.
    Zilliz Cloud: set MILVUS_URI + MILVUS_TOKEN in .env.
    Self-hosted:  set MILVUS_HOST + MILVUS_PORT.
    """
    alias = "default"
    if connections.has_connection(alias):
        return alias

    if settings.MILVUS_URI:
        logger.info("connecting_milvus_uri", uri=settings.MILVUS_URI)
        connect_kwargs: dict = dict(alias=alias, uri=settings.MILVUS_URI)
        if settings.MILVUS_TOKEN:
            connect_kwargs["token"] = settings.MILVUS_TOKEN
        elif settings.MILVUS_USER and settings.MILVUS_PASSWORD:
            connect_kwargs["user"] = settings.MILVUS_USER
            connect_kwargs["password"] = settings.MILVUS_PASSWORD
        connections.connect(**connect_kwargs)
    else:
        logger.info("connecting_milvus_host", host=settings.MILVUS_HOST, port=settings.MILVUS_PORT)
        connections.connect(
            alias=alias,
            host=settings.MILVUS_HOST,
            port=settings.MILVUS_PORT,
            user=settings.MILVUS_USER or "",
            password=settings.MILVUS_PASSWORD or "",
        )

    return alias

def get_milvus_alias() -> str:
    return connect_milvus()

async def check_milvus_health() -> bool:
    try:
        alias = connect_milvus()
        # Ping milvus by checking if we have any collections
        utility.list_collections(using=alias)
        return True
    except Exception as e:
        logger.error("milvus_health_check_failed", error=str(e))
        return False
