import os
from infra.email.client import send_mail
from infra.email.templates import build_price_alert_email

_raw_furl = os.getenv("FRONTEND_URL")
FRONTEND_URL = _raw_furl.rstrip("/") if _raw_furl else ""

async def send_email_alert(to_email: str, symbol: str, condition: str, target_price: float, trigger_price: float, note: str = "") -> bool:
    if not to_email:
        return False
    tpl = build_price_alert_email(symbol, condition, target_price, trigger_price, note, FRONTEND_URL)
    return await send_mail(to_email, tpl["subject"], tpl["html"], tpl["text"])
