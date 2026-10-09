import time
from fastapi import APIRouter
from api.v1.router import v1_router
from domains.auth.routes import get_ws_token
from domains.mcp import mcp_router

_start_time = time.time()
api_router = APIRouter()

@api_router.get("/health")
async def api_health():
    return {
        "success": True,
        "timestamp": int(time.time() * 1000),
        "uptime": round(time.time() - _start_time, 2),
    }

api_router.get("/ws-token")(get_ws_token)
api_router.include_router(v1_router, prefix="/v1")
api_router.include_router(v1_router)
api_router.include_router(mcp_router)
