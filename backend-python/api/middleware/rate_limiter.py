import os, time, json, posixpath, urllib.parse
from typing import Dict, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from core.errors.error_handler import _cors_headers
from core.errors.messages import ERROR_MESSAGES
from infra.db.redis import get_redis
from domains.auth.service import verify_access_token

LOGIN_MAX = int(os.getenv("RATE_LIMIT_LOGIN_MAX", "10"))
SIGNUP_MAX = int(os.getenv("RATE_LIMIT_SIGNUP_MAX", "5"))
OTP_VERIFY_MAX = int(os.getenv("RATE_LIMIT_OTP_VERIFY_MAX", "15"))
AUTH_WINDOW_SEC = int(os.getenv("RATE_LIMIT_AUTH_WINDOW_SEC", "300"))
DEFAULT_MAX = int(os.getenv("RATE_LIMIT_DEFAULT_MAX", "120"))
DEFAULT_WINDOW_SEC = int(os.getenv("RATE_LIMIT_DEFAULT_WINDOW_SEC", "60"))
MEMORY_MAX_BUCKETS = int(os.getenv("RATE_LIMIT_MEMORY_MAX_BUCKETS", "10000"))
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "2097152"))
IS_PROD = os.getenv("NODE_ENV") == "production"
_BATCH_LUA = "local mc=0;local mt=tonumber(ARGV[1]);for _,k in ipairs(KEYS) do local c=redis.call('INCR',k);if c==1 then redis.call('EXPIRE',k,ARGV[1]) end;if c>mc then mc=c end;local t=redis.call('TTL',k);if t>0 and t<mt then mt=t end end;return {mc,mt}"
_buckets: Dict[str, Tuple[int, float]] = {}

def _normalize_path(path: str) -> str:
    p = posixpath.normpath(urllib.parse.unquote(path))
    res = ("/" + p.lstrip("/")).rstrip("/")
    return res if res else "/"

def get_rule(path: str) -> Tuple[int, int, str]:
    msg = ERROR_MESSAGES["RATE_LIMIT"]["TOO_MANY_REQUESTS"]["message"]
    clean = _normalize_path(path).lower()
    if clean in ("/api/v1/auth/login", "/api/auth/login"):
        return LOGIN_MAX, AUTH_WINDOW_SEC, msg
    if clean in (
        "/api/v1/auth/verify-reset-otp", "/api/auth/verify-reset-otp",
        "/api/v1/auth/reset-password", "/api/auth/reset-password"
    ):
        return OTP_VERIFY_MAX, AUTH_WINDOW_SEC, msg
    if clean in (
        "/api/v1/auth/signup", "/api/auth/signup",
        "/api/v1/auth/forgot-password", "/api/auth/forgot-password",
        "/api/v1/auth/resend-verification", "/api/auth/resend-verification"
    ):
        return SIGNUP_MAX, AUTH_WINDOW_SEC, msg
    return DEFAULT_MAX, DEFAULT_WINDOW_SEC, msg

def _client_ip(req: Request) -> str:
    if os.getenv("TRUST_PROXY", "false").lower() == "true" or IS_PROD:
        cf = req.headers.get("cf-connecting-ip")
        if not cf:
            cf = req.headers.get("x-real-ip")
        if cf:
            return cf.strip()
        fwd = req.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return req.client.host if req.client and req.client.host else "unknown"

class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)
        cl = request.headers.get("content-length")
        if cl and int(cl) > MAX_BODY_BYTES:
            return JSONResponse(status_code=413, content={"success": False, "message": "Payload too large", "code": "PAYLOAD_TOO_LARGE"}, headers=_cors_headers(request))
        path = _normalize_path(request.url.path)
        max_req, win_sec, msg = get_rule(path)
        keys = [f"rl:{path}:{_client_ip(request)}"]
        if request.method == "POST" and "auth" in path:
            try:
                body = await request.body()
                if len(body) > MAX_BODY_BYTES:
                    return JSONResponse(status_code=413, content={"success": False, "message": "Payload too large", "code": "PAYLOAD_TOO_LARGE"}, headers=_cors_headers(request))
                if body:
                    data = json.loads(body)
                    em = str(data["email"]).lower().strip() if data.get("email") else ""
                    ph = str(data["phone"]).lower().strip() if data.get("phone") else ""
                    ident = em if em else ph
                    if ident:
                        keys.append(f"rl:{path}:ident:{ident}")
            except Exception:
                pass
        tok = request.cookies.get("accessToken")
        auth_hdr = request.headers.get("authorization")
        if not tok and auth_hdr and auth_hdr.lower().startswith("bearer "):
            tok = auth_hdr.split(" ", 1)[1]
        if tok:
            try:
                dec = verify_access_token(tok)
                uid = str(dec["sub"]) if dec.get("sub") is not None else ""
                if uid:
                    keys.append(f"rl:{path}:user:{uid}")
            except Exception:
                pass
        max_count, min_ttl = 0, win_sec
        use_redis = IS_PROD or (request.method == "POST" and "auth" in path)
        if use_redis:
            try:
                res = await get_redis().eval(_BATCH_LUA, len(keys), *keys, win_sec)
                max_count, min_ttl = int(res[0]), max(1, int(res[1]))
            except Exception:
                use_redis = False
        if not use_redis:
            now = time.time()
            for key in keys:
                count, exp = _buckets.get(key, (0, now + win_sec))
                if exp <= now:
                    count, exp = 0, now + win_sec
                count += 1
                ttl = max(1, int(exp - now))
                _buckets[key] = (count, exp)
                if count > max_count: max_count = count
                if ttl < min_ttl: min_ttl = ttl
            if len(_buckets) > MEMORY_MAX_BUCKETS:
                _buckets.clear()
        if max_count > max_req:
            headers = _cors_headers(request)
            headers["Retry-After"] = str(min_ttl)
            return JSONResponse(status_code=429, content={"success": False, "message": msg, "code": "RATE_LIMITED", "retryAfter": min_ttl}, headers=headers)
        res = await call_next(request)
        res.headers["X-RateLimit-Limit"] = str(max_req)
        res.headers["X-RateLimit-Remaining"] = str(max(0, max_req - max_count))
        return res
