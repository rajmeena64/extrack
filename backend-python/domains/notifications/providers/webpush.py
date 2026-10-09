import json
from typing import Dict, Any
from core.logger.logger import logger

async def send_web_push_notification(subscription: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    if not subscription or not isinstance(subscription, dict):
        return False
    try:
        logger.info("webpush.dispatch", {"title": payload.get("title"), "symbol": payload.get("symbol")})
        return True
    except Exception as e:
        logger.warning("webpush.dispatch_failed", {"error": str(e)})
        return False
