import os
import json
from typing import Dict, Any, Optional
from pywebpush import webpush_async, WebPushException
from infra.db.postgres import init_db
from core.logger.logger import logger

async def send_web_push(user_id: int, title: str, body: str, url: str = "/", tag: str = "", icon: str = "/favicon.svg", data: Optional[Dict[str, Any]] = None) -> bool:
    priv_key = os.getenv("VAPID_PRIVATE_KEY")
    claim_email = os.getenv("VAPID_CLAIM_EMAIL", "mailto:support@entrack.club")
    if not priv_key:
        return False
    pool = await init_db()
    rows = await pool.fetch("SELECT endpoint, p256dh_key, auth_key FROM app.push_subscriptions WHERE user_id = $1", user_id)
    if not rows:
        return False
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag, "icon": icon, "data": data or {}})
    sent = False
    for r in rows:
        sub = {"endpoint": r["endpoint"], "keys": {"p256dh": r["p256dh_key"], "auth": r["auth_key"]}}
        try:
            await webpush_async(subscription_info=sub, data=payload, vapid_private_key=priv_key, vapid_claims={"sub": claim_email}, timeout=10)
            sent = True
        except WebPushException as ex:
            code = getattr(getattr(ex, "response", None), "status_code", None) or getattr(getattr(ex, "response", None), "status", None)
            if code in (404, 410):
                await pool.execute("DELETE FROM app.push_subscriptions WHERE endpoint = $1", r["endpoint"])
        except Exception as e:
            logger.warning("webpush.send_failed", {"error": str(e)})
    return sent

