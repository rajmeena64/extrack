import uuid
import time
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from core.logger.logger import set_context, logger

class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        h_trace = request.headers.get("x-trace-id")
        trace_id = h_trace if h_trace else str(uuid.uuid4())
        set_context({"traceId": trace_id})
        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        response.headers["x-trace-id"] = trace_id
        logger.info("http.request", {
            "method": request.method,
            "path": str(request.url.path),
            "status": response.status_code,
            "durationMs": duration_ms,
        })
        return response
