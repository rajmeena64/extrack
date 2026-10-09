import json
import urllib.parse
from typing import Any
from infra.db.redis import get_redis

TRUSTED_AI_DOMAINS = {
    "claude.ai",
    "anthropic.com",
    "chatgpt.com",
    "openai.com",
    "gemini.google.com",
    "perplexity.ai",
    "localhost",
    "127.0.0.1",
}

_mem_clients: dict[str, dict[str, Any]] = {}

async def save_registered_client(client_id: str, client_name: str, redirect_uris: list[str]) -> None:
    data = {"name": client_name, "uris": redirect_uris}
    try:
        r = get_redis()
        await r.setex(f"mcp:client:{client_id}", 86400 * 30, json.dumps(data))
    except Exception:
        _mem_clients[client_id] = data

async def is_trusted_redirect_uri(redirect_uri: str, client_id: str | None = None) -> bool:
    if not redirect_uri:
        return False
    try:
        parsed = urllib.parse.urlparse(redirect_uri)
        host = str(parsed.hostname).lower() if parsed.hostname else ""
        if any(host == d or host.endswith(f".{d}") for d in TRUSTED_AI_DOMAINS):
            return True
    except Exception:
        return False
    if client_id:
        val = None
        try:
            r = get_redis()
            raw = await r.get(f"mcp:client:{client_id}")
            if raw:
                val = json.loads(raw)
        except Exception:
            pass
        if not val:
            val = _mem_clients.get(client_id)
        if val and isinstance(val.get("uris"), list) and redirect_uri in val["uris"]:
            return True
    return False

_CLIENT_HINTS = (("claude", "Claude"), ("chatgpt", "ChatGPT"), ("gemini", "Gemini"), ("perplexity", "Perplexity"), ("cursor", "Cursor"))

async def get_client_name(client_id: str | None) -> str:
    if not client_id:
        return "AI Client"
    try:
        raw = await get_redis().get(f"mcp:client:{client_id}")
        if raw and (name := json.loads(raw).get("name")):
            return name
    except Exception:
        pass
    if mem := _mem_clients.get(client_id):
        if name := mem.get("name"):
            return name
    cid_lower = client_id.lower()
    for hint, label in _CLIENT_HINTS:
        if hint in cid_lower:
            return label
    return "AI Client"
