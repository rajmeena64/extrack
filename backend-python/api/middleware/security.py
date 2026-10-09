import os
import re
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "2097152"))
CSP_HEADER = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob: https:; script-src 'self' https://www.tradays.com; style-src 'self' 'unsafe-inline'; connect-src 'self' http: https: ws: wss:"
PERMISSIONS_HEADER = "camera=(), microphone=(), geolocation=(), payment=()"
_AI_ORIGINS = re.compile(r"^https://.*(claude\.ai|anthropic\.com|chatgpt\.com|openai\.com|gemini\.google\.com|perplexity\.ai)$")

def _is_trusted_origin(origin: str | None) -> bool:
    if not origin:
        return True
    raw = os.getenv("ALLOWED_ORIGINS", "")
    allowed = {o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"}
    furl = str(os.getenv("FRONTEND_URL", "")).strip().rstrip("/")
    if furl:
        allowed.add(furl)
    if not allowed and os.getenv("NODE_ENV") != "production":
        allowed = {"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"}
    return origin in allowed or bool(_AI_ORIGINS.match(origin))

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = CSP_HEADER
        response.headers["Permissions-Policy"] = PERMISSIONS_HEADER
        if os.getenv("NODE_ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

class RequestBodyLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl and int(cl) > MAX_BODY_BYTES:
            return JSONResponse(status_code=413, content={"success": False, "message": "Payload too large", "code": "PAYLOAD_TOO_LARGE"})
        return await call_next(request)

class TrustedOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("origin")
            if origin and not _is_trusted_origin(origin):
                return JSONResponse(
                    status_code=403,
                    content={"success": False, "code": "FORBIDDEN", "message": "You don't have permission to perform this action."}
                )
        return await call_next(request)
