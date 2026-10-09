import os
from dotenv import load_dotenv
load_dotenv()
import redis.asyncio as aioredis

_redis_client = None

def get_redis():
    global _redis_client
    if not _redis_client:
        _redis_client = aioredis.Redis(
            host=os.getenv("REDIS_HOST"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            username=os.getenv("REDIS_USERNAME", "default"),
            password=os.getenv("REDIS_PASSWORD"),
            decode_responses=True,
        )
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
