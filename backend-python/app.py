import os, json
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from core.errors.app_error import AppError
from core.errors.error_handler import (
    app_error_handler, generic_error_handler,
    http_exception_handler, validation_error_handler
)
from api.middleware.trace import TraceMiddleware
from api.middleware.security import SecurityHeadersMiddleware, RequestBodyLimitMiddleware, TrustedOriginMiddleware
from api.middleware.rate_limiter import RateLimiterMiddleware
from api.router import api_router
from domains.mcp import mcp_router
from core.websocket.ws_server import ws_manager
from domains.auth.service import verify_access_token, verify_ws_token

from contextlib import asynccontextmanager
from infra.db.postgres import init_db, close_db
from infra.db.redis import get_redis, close_redis
from infra.db.tinybird import close_tinybird
from domains.instruments.registry import refresh_instrument_cache
from core.finance.currency import refresh_fx_cache
from domains.brokers.service import cleanup_expired_connections
from integrations.brokers.connectors.ctrader.connector import ctrader_live_sync

is_prod = os.getenv("NODE_ENV") == "production"
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
origins_list = [o.strip() for o in raw_origins.split(",") if o.strip() and o.strip() != "*"]
furl = str(os.getenv("FRONTEND_URL", "")).strip().rstrip("/")
if furl and furl not in origins_list:
    origins_list.append(furl)
if not origins_list and not is_prod:
    origins_list = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
AI_ORIGINS_REGEX = r"^https://.*(claude\.ai|anthropic\.com|chatgpt\.com|openai\.com|gemini\.google\.com|perplexity\.ai)$"

import asyncio
from domains.notifications.worker import run_alerts_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not (os.getenv("JWT_ACCESS_SECRET") or os.getenv("JWT_SECRET")) or not (os.getenv("JWT_REFRESH_SECRET") or os.getenv("JWT_SECRET")):
        raise RuntimeError("JWT secrets missing: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET required")
    await init_db()
    await cleanup_expired_connections()
    get_redis()
    await refresh_instrument_cache()
    await refresh_fx_cache()
    worker_task = asyncio.create_task(run_alerts_worker())
    live_task = asyncio.create_task(ctrader_live_sync.start())
    yield
    await ctrader_live_sync.stop()
    live_task.cancel()
    worker_task.cancel()
    await close_db()
    await close_redis()
    await close_tinybird()

app = FastAPI(
    title="Entrack Backend API",
    version="1.0.0",
    docs_url="/docs" if not is_prod else None,
    redoc_url="/redoc" if not is_prod else None,
    lifespan=lifespan,
)

app.add_middleware(TrustedOriginMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(RequestBodyLimitMiddleware)
app.add_middleware(TraceMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins_list,
    allow_origin_regex=AI_ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,
)

app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, generic_error_handler)

app.include_router(api_router, prefix="/api")
app.include_router(mcp_router)

@app.websocket("/")
async def ws_endpoint(ws: WebSocket):
    origin = ws.headers.get("origin")
    query_token = ws.query_params.get("token")
    cookie_token = ws.cookies.get("accessToken")
    if not query_token and not cookie_token:
        await ws.close(code=1008)
        return
    if (cookie_token and not origin) or (origins_list and (not origin or origin not in origins_list)):
        await ws.close(code=1008)
        return
    try:
        decoded = verify_ws_token(query_token) if query_token else verify_access_token(cookie_token)
        user_id = str(decoded["sub"]) if (decoded and decoded.get("sub") is not None) else ""
        if not user_id:
            await ws.close(code=1008)
            return
    except Exception:
        await ws.close(code=1008)
        return
    connected = await ws_manager.register_connection(ws, user_id)
    if not connected:
        return
    await ctrader_live_sync.send_snapshot(user_id)
    try:
        while True:
            msg = await ws.receive_text()
            if len(msg) > 2048:
                await ws.close(code=1009)
                break
            try:
                data = json.loads(msg)
                if isinstance(data, dict) and data.get("type") == "MARKET_SUBSCRIBE":
                    syms = data.get("symbols", [])
                    if isinstance(syms, list):
                        ws_manager.set_subscriptions(ws, syms)
            except Exception:
                pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        ws_manager.remove_connection(ws, user_id)

