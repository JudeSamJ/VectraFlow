from pymilvus import connections, utility
from app.config import settings
import structlog

logger = structlog.get_logger()

def connect_milvus():
    """Connects to the Milvus standalone/cluster."""
    alias = "default"
    if not connections.has_connection(alias):
        logger.info(
            "connecting_milvus",
            host=settings.MILVUS_HOST,
            port=settings.MILVUS_PORT
        )
        connections.connect(
            alias=alias,
            host=settings.MILVUS_HOST,
            port=settings.MILVUS_PORT,
            user=settings.MILVUS_USER or "",
            password=settings.MILVUS_PASSWORD or ""
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
