import asyncio
from typing import List, Dict, Any, Set
from infra.db.postgres import init_db
from domains.notifications.evaluator import evaluate_alert_condition
from domains.notifications.providers.telegram import send_telegram_alert
from domains.notifications.providers.email import send_email_alert
from core.logger.logger import logger

_active_alerts: Dict[str, List[Dict[str, Any]]] = {}
_prev_prices: Dict[str, float] = {}

def _map_alert_row(row) -> Dict[str, Any]:
    if not row:
        return {}
    d = dict(row)
    return {
        "id": str(d.get("id")),
        "userId": str(d.get("user_id")),
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

def _add_to_memory(alert: Dict[str, Any]):
    sym = str(alert.get("symbol") or "").strip().upper()
    if sym:
        arr = _active_alerts.setdefault(sym, [])
        if not any(a.get("id") == alert.get("id") for a in arr):
            arr.append(alert)

def _remove_from_memory(alert_id: str):
    for sym, arr in list(_active_alerts.items()):
        kept = [a for a in arr if a.get("id") != alert_id]
        if kept:
            _active_alerts[sym] = kept
        else:
            _active_alerts.pop(sym, None)

def get_active_alert_symbols() -> Set[str]:
    return set(_active_alerts.keys())

async def hydrate_memory_alerts():
    pool = await init_db()
    rows = await pool.fetch("SELECT * FROM app.user_alerts WHERE status = 'ACTIVE'")
    _active_alerts.clear()
    for r in rows:
        _add_to_memory(_map_alert_row(r))

async def trigger_alert(alert: Dict[str, Any], current_price: float, pool: Any = None):
    alert_id = str(alert.get("id"))
    _remove_from_memory(alert_id)
    p = pool or await init_db()
    await p.execute("UPDATE app.user_alerts SET status = 'TRIGGERED', triggered_at = NOW(), triggered_price = $1 WHERE id = $2::uuid", current_price, alert_id)
    sym = str(alert.get("symbol") or "").upper()
    target = alert.get("targetPrice", 0)
    cond = str(alert.get("condition") or "ABOVE")
    note = str(alert.get("note") or "")
    asyncio.create_task(send_telegram_alert(sym, cond, target, current_price, note))
    user_id = alert.get("userId")
    if user_id:
        try:
            user_row = await p.fetchrow("SELECT COALESCE(email_original, email) AS email FROM app_auth.users WHERE id = $1", int(user_id))
            if user_row and user_row.get("email"):
                asyncio.create_task(send_email_alert(user_row["email"], sym, cond, target, current_price, note))
        except Exception as e:
            logger.warning("alert.email_dispatch_failed", {"error": str(e)})
    from core.websocket.ws_server import ws_manager
    payload = {"type": "ALERT_TRIGGERED", "alert": {**alert, "status": "TRIGGERED", "triggeredPrice": current_price}}
    asyncio.create_task(ws_manager.send_to_user(str(user_id), payload))

async def evaluate_tick_alerts(symbol: str, current_price: float):
    sym = symbol.strip().upper()
    prev_p = _prev_prices.get(sym)
    _prev_prices[sym] = current_price
    alerts = _active_alerts.get(sym)
    if not alerts:
        return
    for alert in list(alerts):
        target = float(alert.get("targetPrice") or 0)
        cond = str(alert.get("condition") or "ABOVE")
        if evaluate_alert_condition(cond, target, current_price, prev_p):
            await trigger_alert(alert, current_price)

async def get_user_alerts(user_id: int) -> List[Dict[str, Any]]:
    pool = await init_db()
    rows = await pool.fetch("SELECT * FROM app.user_alerts WHERE user_id = $1 ORDER BY created_at DESC", user_id)
    return [_map_alert_row(r) for r in rows]

async def create_user_alert(user_id: int, symbol: str, target_price: float, condition: str = "ABOVE", note: str = "") -> Dict[str, Any]:
    pool = await init_db()
    clean_sym = symbol.strip().upper()
    row = await pool.fetchrow(
        "INSERT INTO app.user_alerts (user_id, symbol, target_price, condition, note) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        user_id, clean_sym, target_price, condition.strip().upper(), note.strip()
    )
    alert = _map_alert_row(row)
    _add_to_memory(alert)
    curr_p = _prev_prices.get(clean_sym)
    if curr_p and curr_p > 0 and evaluate_alert_condition(alert["condition"], alert["targetPrice"], curr_p):
        await trigger_alert(alert, curr_p, pool)
        alert["status"] = "TRIGGERED"
        alert["triggeredPrice"] = curr_p
    return alert

async def delete_user_alert(user_id: int, alert_id: str) -> bool:
    _remove_from_memory(alert_id)
    pool = await init_db()
    res = await pool.execute("DELETE FROM app.user_alerts WHERE id = $1::uuid AND user_id = $2", alert_id, user_id)
    return "DELETE 1" in res

async def update_user_alert(user_id: int, alert_id: str, target_price: float) -> Dict[str, Any]:
    pool = await init_db()
    existing = await pool.fetchrow("SELECT * FROM app.user_alerts WHERE id = $1::uuid AND user_id = $2", alert_id, user_id)
    if not existing:
        return {}
    sym = str(existing.get("symbol") or "").upper()
    curr_p = _prev_prices.get(sym) or float(existing.get("target_price") or target_price)
    cond = "ABOVE" if target_price >= curr_p else "BELOW"
    row = await pool.fetchrow(
        "UPDATE app.user_alerts SET target_price = $1, condition = $2, status = 'ACTIVE' WHERE id = $3::uuid AND user_id = $4 RETURNING *",
        target_price, cond, alert_id, user_id
    )
    alert = _map_alert_row(row)
    _remove_from_memory(alert_id)
    _add_to_memory(alert)
    if curr_p and curr_p > 0 and evaluate_alert_condition(alert["condition"], alert["targetPrice"], curr_p):
        await trigger_alert(alert, curr_p, pool)
        alert["status"] = "TRIGGERED"
        alert["triggeredPrice"] = curr_p
    return alert

async def clear_triggered_alerts(user_id: int) -> bool:
    pool = await init_db()
    await pool.execute("DELETE FROM app.user_alerts WHERE user_id = $1 AND status = 'TRIGGERED'", user_id)
    return True

