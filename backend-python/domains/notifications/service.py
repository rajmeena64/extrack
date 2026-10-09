import json
import asyncio
from typing import List, Dict, Any, Optional
from infra.db.postgres import init_db
from domains.notifications.evaluator import evaluate_alert_condition
from domains.notifications.providers.telegram import send_telegram_alert
from core.logger.logger import logger

def _map_alert_row(row) -> Dict[str, Any]:
    if not row:
        return {}
    d = dict(row)
    return {
        "id": str(d.get("id")),
        "symbol": d.get("symbol"),
        "targetPrice": float(d.get("target_price")) if d.get("target_price") is not None else 0.0,
        "condition": d.get("condition"),
        "timeframe": d.get("timeframe"),
        "status": d.get("status"),
        "note": d.get("note") or "",
        "createdAt": d.get("created_at").isoformat() if d.get("created_at") else None,
        "triggeredAt": d.get("triggered_at").isoformat() if d.get("triggered_at") else None,
        "triggeredPrice": float(d.get("triggered_price")) if d.get("triggered_price") is not None else None
    }

async def get_user_alerts(user_id: int) -> List[Dict[str, Any]]:
    pool = await init_db()
    rows = await pool.fetch("SELECT * FROM app.user_alerts WHERE user_id = $1 ORDER BY created_at DESC", user_id)
    return [_map_alert_row(r) for r in rows]

async def create_user_alert(user_id: int, symbol: str, target_price: float, condition: str = "ABOVE", note: str = "") -> Dict[str, Any]:
    pool = await init_db()
    row = await pool.fetchrow(
        """
        INSERT INTO app.user_alerts (user_id, symbol, target_price, condition, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        user_id, symbol.strip().upper(), target_price, condition.strip().upper(), note.strip()
    )
    return _map_alert_row(row)

async def delete_user_alert(user_id: int, alert_id: str) -> bool:
    pool = await init_db()
    res = await pool.execute("DELETE FROM app.user_alerts WHERE id = $1::uuid AND user_id = $2", alert_id, user_id)
    return "DELETE 1" in res

async def clear_triggered_alerts(user_id: int) -> bool:
    pool = await init_db()
    await pool.execute("DELETE FROM app.user_alerts WHERE user_id = $1 AND status = 'TRIGGERED'", user_id)
    return True

async def dispatch_triggered_alert(alert: Dict[str, Any], current_price: float) -> None:
    symbol = alert.get("symbol", "")
    target = alert.get("targetPrice", 0)
    note = alert.get("note", "")
    note_str = f" ({note})" if note else ""
    msg = f"<b>ALERT TRIGGERED</b>\n\nSymbol: <b>{symbol}</b>\nTarget: <b>{target}</b>\nCurrent Price: <b>{current_price}</b>{note_str}"
    logger.info("alert.dispatch", {"symbol": symbol, "target": target, "price": current_price})
    asyncio.create_task(send_telegram_alert(msg))
