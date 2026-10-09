from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from domains.auth.service import get_current_user_id
from domains.notifications.service import get_user_alerts, create_user_alert, delete_user_alert, clear_triggered_alerts
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

@notifications_router.delete("/alerts/triggered")
async def clear_triggered_endpoint(user_id: Any = Depends(get_current_user_id)):
    await clear_triggered_alerts(int(user_id))
    return {"success": True}

@notifications_router.delete("/alerts/{alert_id}")
async def delete_alert_endpoint(alert_id: str, user_id: Any = Depends(get_current_user_id)):
    success = await delete_user_alert(int(user_id), alert_id)
    return {"success": success}
