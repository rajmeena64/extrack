import os, html
from datetime import datetime
from infra.telegram.client import send_telegram_message
from domains.instruments.registry import find_by_symbol

_raw_furl = os.getenv("FRONTEND_URL")
FRONTEND_URL = _raw_furl.rstrip("/") if _raw_furl else ""

def build_telegram_alert(symbol: str, condition: str, target_price: float, trigger_price: float, note: str = "") -> tuple[str, dict | None]:
    sym = symbol.strip().upper()
    cond_clean = condition.strip().replace("_", " ").title()
    is_above = "Above" in cond_clean or "Greater" in cond_clean or trigger_price >= target_price
    status = "Crossed Above" if is_above else "Dropped Below"
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    lines = [
        f"<b>PRICE ALERT:</b> <code>{html.escape(sym)}</code>",
        f"Status: <b>{status}</b>",
        f"Target: <code>{target_price}</code>",
        f"Triggered: <code>{trigger_price}</code>",
        f"Time: <code>{now_str}</code>",
    ]
    if note:
        lines.append(f"Note: <i>{html.escape(note)}</i>")
    reply_markup = None
    if FRONTEND_URL.startswith("https://"):
        chart_url = f"{FRONTEND_URL}/chart?symbol={sym}"
        reply_markup = {"inline_keyboard": [[{"text": "Live Chart →", "url": chart_url}]]}
    return "\n".join(lines), reply_markup

async def send_telegram_alert(symbol_or_msg: str, condition: str = None, target_price: float = None, trigger_price: float = None, note: str = "", chat_id: str = None) -> bool:
    if condition is not None and target_price is not None:
        msg, markup = build_telegram_alert(symbol_or_msg, condition, target_price, trigger_price or target_price, note)
        return await send_telegram_message(msg, chat_id, markup)
    return await send_telegram_message(symbol_or_msg, chat_id)
