import os
import time
from typing import Dict, Tuple
from fastapi import HTTPException
from core.errors.messages import ERROR_MESSAGES
from infra.db.redis import get_redis

MCP_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MCP_MAX", "60"))
MCP_WINDOW_SEC = int(os.getenv("RATE_LIMIT_MCP_WINDOW_SEC", "60"))
MCP_BURST_MAX = int(os.getenv("RATE_LIMIT_MCP_BURST_MAX", "10"))
MCP_BURST_WINDOW_SEC = 5
_LUA = "local c=redis.call('INCR',KEYS[1]);if c==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return {c,redis.call('TTL',KEYS[1])}"
_buckets: Dict[str, Tuple[int, float]] = {}

async def _check_bucket(key: str, max_req: int, win_sec: int) -> None:
    global _buckets
    try:
        r = get_redis()
        res = await r.eval(_LUA, 1, key, win_sec)
        count, ttl = int(res[0]), max(1, int(res[1]))
    except Exception:
        now = time.time()
        count, exp = _buckets.get(key, (0, now + win_sec))
        if exp <= now:
            count, exp = 0, now + win_sec
        count += 1
        ttl = max(1, int(exp - now))
        _buckets[key] = (count, exp)
        if len(_buckets) > 5000:
            _buckets = {k: v for k, v in _buckets.items() if v[1] > now}
    if count > max_req:
        raise HTTPException(status_code=429, detail=ERROR_MESSAGES["MCP"]["RATE_LIMITED"]["message"], headers={"Retry-After": str(ttl)})

async def enforce_mcp_rate_limit(user_id: int) -> None:
    await _check_bucket(f"mcp:rl:burst:{user_id}", MCP_BURST_MAX, MCP_BURST_WINDOW_SEC)
    await _check_bucket(f"mcp:rl:user:{user_id}", MCP_MAX_REQUESTS, MCP_WINDOW_SEC)
