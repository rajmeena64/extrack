import os
import httpx
from core.logger.logger import logger

EMAIL_API_KEY = os.getenv("RESEND_API_KEY") or os.getenv("EMAIL_API_KEY")
EMAIL_API_URL = os.getenv("EMAIL_API_URL")
FROM_EMAIL = os.getenv("EMAIL_FROM")
FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Entrack")
EMAIL_FROM = f"{FROM_NAME} <{FROM_EMAIL}>" if FROM_EMAIL else None

async def send_mail(to: str, subject: str, html: str, text: str) -> bool:
    if not EMAIL_API_KEY or not EMAIL_API_URL or not EMAIL_FROM:
        logger.warning("email.skipped", {"reason": "missing_config"})
        return False
    headers = {"Authorization": f"Bearer {EMAIL_API_KEY}", "Content-Type": "application/json"}
    payload = {"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html, "text": text}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(EMAIL_API_URL, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"email.provider_error: {resp.status_code}")
                return False
            return True
    except Exception as e:
        logger.error(f"email.send_failed: {str(e)}")
        return False
