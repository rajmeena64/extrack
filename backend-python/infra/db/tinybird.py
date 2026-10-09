import os
import asyncio
from typing import Optional
from dotenv import load_dotenv
load_dotenv()
import httpx

_client: Optional[httpx.AsyncClient] = None

def get_tinybird_client() -> httpx.AsyncClient:
    global _client
    url = os.getenv("TINYBIRD_URL")
    token = os.getenv("TINYBIRD_TOKEN")
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if _client is None or _client.is_closed or getattr(_client, "_loop", None) != loop:
        _client = httpx.AsyncClient(
            base_url=url.rstrip("/") if url else "",
            headers={"Authorization": f"Bearer {token}"} if token else {},
            timeout=10.0,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
        )
        _client._loop = loop
    return _client

async def close_tinybird():
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
