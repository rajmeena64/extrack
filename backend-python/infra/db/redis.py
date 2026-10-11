import os
from dotenv import load_dotenv
load_dotenv()
import redis.asyncio as aioredis

_redis_client = None

def get_redis():
    global _redis_client
    if not _redis_client:
        r_url = os.getenv("REDIS_URL")
        if r_url:
            _redis_client = aioredis.from_url(r_url, decode_responses=True, socket_timeout=2.0, socket_connect_timeout=2.0)
        elif os.getenv("REDIS_HOST"):
            _redis_client = aioredis.Redis(
                host=os.getenv("REDIS_HOST"),
                port=int(os.getenv("REDIS_PORT", "6379")),
                username=os.getenv("REDIS_USERNAME", "default"),
                password=os.getenv("REDIS_PASSWORD"),
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0
            )
        else:
            _redis_client = aioredis.Redis(host="127.0.0.1", port=6379, decode_responses=True, socket_timeout=0.5, socket_connect_timeout=0.5)
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
