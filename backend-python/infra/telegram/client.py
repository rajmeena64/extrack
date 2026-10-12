import os
import httpx
from core.logger.logger import logger

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

async def send_telegram_message(message: str, chat_id: str = None, reply_markup: dict = None) -> bool:
    token = TELEGRAM_BOT_TOKEN
    target_chat = chat_id or TELEGRAM_CHAT_ID
    if not token or not target_chat:
        return False
    api_base = os.getenv("TELEGRAM_API_URL", "https://api.telegram.org").rstrip("/")
    url = f"{api_base}/bot{token}/sendMessage"
    payload = {"chat_id": target_chat, "text": message, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning("telegram.send_failed", {"status": resp.status_code, "body": resp.text})
            return resp.status_code == 200
    except Exception as e:
        logger.warning("telegram.send_failed", {"error": str(e)})
        return False
