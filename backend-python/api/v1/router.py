from fastapi import APIRouter
from domains.auth.routes import auth_router, get_ws_token
from domains.settings.routes import settings_router
from domains.trading.routes import trading_router
from integrations.datafeed.routes import datafeed_router
from domains.instruments.routes import instruments_router
from domains.brokers import brokers_router, connections_router
from domains.notifications.routes import notifications_router

v1_router = APIRouter()
v1_router.get("/ws-token")(get_ws_token)
v1_router.include_router(auth_router)
v1_router.include_router(settings_router)
v1_router.include_router(trading_router)
v1_router.include_router(datafeed_router)
v1_router.include_router(instruments_router, prefix="/instruments")
v1_router.include_router(brokers_router)
v1_router.include_router(connections_router)
v1_router.include_router(notifications_router)

@v1_router.get("/health")
async def v1_health():
    return {"success": True, "version": "v1"}

