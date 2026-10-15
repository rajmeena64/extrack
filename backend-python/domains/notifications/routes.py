import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Request
from domains.auth.service import get_current_user_id
from domains.notifications.service import (
    get_user_alerts, create_user_alert, delete_user_alert, update_user_alert, clear_triggered_alerts,
    save_push_subscription, remove_push_subscription
)
from domains.notifications.providers.webpush import send_web_push
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])

@notifications_router.get("/alerts")
async def get_alerts_endpoint(user_id: Any = Depends(get_current_user_id)):
    alerts = await get_user_alerts(int(user_id))
    return {"success": True, "alerts": alerts}

@notifications_router.post("/alerts")
async def create_alert_endpoint(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    if not isinstance(payload, dict):
        raise AppError(ERROR_MESSAGES["NOTIFICATIONS"]["INVALID_ALERT_PAYLOAD"])
    symbol = payload.get("symbol")
    target_price = payload.get("targetPrice")
    if not symbol or not target_price or float(target_price) <= 0:
        raise AppError(ERROR_MESSAGES["NOTIFICATIONS"]["INVALID_ALERT_PAYLOAD"])
    condition = payload.get("condition", "ABOVE")
    note = payload.get("note", "")
    alert = await create_user_alert(int(user_id), str(symbol), float(target_price), str(condition), str(note))
    return {"success": True, "alert": alert}

@notifications_router.patch("/alerts/{alert_id}")
async def update_alert_endpoint(alert_id: str, payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    target_price = payload.get("targetPrice")
    if not target_price or float(target_price) <= 0:
        raise AppError(ERROR_MESSAGES["NOTIFICATIONS"]["INVALID_ALERT_PAYLOAD"])
    alert = await update_user_alert(int(user_id), alert_id, float(target_price))
    return {"success": True, "alert": alert}

@notifications_router.delete("/alerts/triggered")
async def clear_triggered_endpoint(user_id: Any = Depends(get_current_user_id)):
    await clear_triggered_alerts(int(user_id))
    return {"success": True}

@notifications_router.delete("/alerts/{alert_id}")
async def delete_alert_endpoint(alert_id: str, user_id: Any = Depends(get_current_user_id)):
    success = await delete_user_alert(int(user_id), alert_id)
    return {"success": success}

@notifications_router.get("/push/public-key")
async def get_push_public_key():
    return {"success": True, "publicKey": os.getenv("VAPID_PUBLIC_KEY", "")}

@notifications_router.post("/push/subscribe")
async def subscribe_push_endpoint(request: Request, payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    endpoint = payload.get("endpoint")
    keys = payload.get("keys") if isinstance(payload.get("keys"), dict) else {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not endpoint or not p256dh or not auth:
        raise AppError(ERROR_MESSAGES["NOTIFICATIONS"]["INVALID_ALERT_PAYLOAD"])
    user_agent = request.headers.get("user-agent", "")
    await save_push_subscription(int(user_id), str(endpoint), str(p256dh), str(auth), str(user_agent))
    return {"success": True}

@notifications_router.post("/push/unsubscribe")
async def unsubscribe_push_endpoint(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    endpoint = payload.get("endpoint")
    if endpoint:
        await remove_push_subscription(int(user_id), str(endpoint))
    return {"success": True}

@notifications_router.post("/push/test")
async def send_test_push_endpoint(user_id: Any = Depends(get_current_user_id)):
    sent = await send_web_push(int(user_id), "Entrack Test Notification", "Web push is working properly on your device!", "/dashboard", "test-push")
    return {"success": sent}


