import os
import re
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from core.errors.app_error import AppError
from core.logger.logger import logger

_AI_ORIGINS_PATTERN = re.compile(r"^https://.*(claude\.ai|anthropic\.com|chatgpt\.com|openai\.com|gemini\.google\.com|perplexity\.ai)$")

def _cors_headers(request: Request) -> dict[str, str]:
    origin = request.headers.get("origin")
    if not origin:
        return {}
    allowed = os.getenv("ALLOWED_ORIGINS", "")
    origins = [o.strip() for o in allowed.split(",") if o.strip() and o.strip() != "*"]
    if origin in origins or bool(_AI_ORIGINS_PATTERN.match(origin)):
        return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", "Vary": "Origin"}
    return {}

async def app_error_handler(request: Request, exc: AppError):
    logger.error("request.failed", {"code": exc.code, "status": exc.status_code, "message": exc.message, "path": str(request.url.path), "method": request.method})
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message, "code": exc.code, "data": exc.details or None},
        headers=_cors_headers(request)
    )

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    logger.warning("http.exception", {"status": exc.status_code, "detail": detail, "path": str(request.url.path)})
    headers = {**_cors_headers(request), **(exc.headers if exc.headers else {})}
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": detail, "code": "HTTP_ERROR"},
        headers=headers
    )

async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first = errors[0] if errors else {}
    loc = first["loc"] if "loc" in first else []
    field = ".".join(str(x) for x in loc if x != "body")
    raw_msg = str(first["msg"]) if "msg" in first else "Invalid input"
    msg = raw_msg.removeprefix("Value error, ").strip()
    clean_message = msg if raw_msg.startswith("Value error, ") else (f"{field.replace('_', ' ').capitalize()} is required." if first.get("type") == "missing" else f"{field}: {msg}")
    logger.warning("request.validation_failed", {"field": field, "message": clean_message, "path": str(request.url.path)})
    return JSONResponse(
        status_code=400,
        content={"success": False, "message": clean_message, "code": "VALIDATION_ERROR"},
        headers=_cors_headers(request)
    )

async def generic_error_handler(request: Request, exc: Exception):
    logger.error("request.unhandled_exception", {"status": 500, "message": str(exc), "path": str(request.url.path), "method": request.method})
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Something went wrong. Please try again later.", "code": "INTERNAL_SERVER_ERROR"},
        headers=_cors_headers(request)
    )
