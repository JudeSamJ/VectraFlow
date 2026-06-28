import redis.asyncio as redis
from app.config import settings

# Global redis client instance
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    """Dependency for FastAPI endpoints"""
    return redis_client
