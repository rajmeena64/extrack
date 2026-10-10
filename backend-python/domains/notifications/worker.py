import asyncio, os
import httpx
from typing import Dict, Any
from infra.db.postgres import init_db
from infra.db.redis import get_redis
from domains.instruments.registry import find_by_symbol
from domains.notifications.evaluator import evaluate_alert_condition
from domains.notifications.providers.telegram import send_telegram_alert
from core.websocket.ws_server import ws_manager
from core.logger.logger import logger

_prev_prices: Dict[str, float] = {}

async def _fetch_binance_prices() -> Dict[str, float]:
    b_url = os.getenv("BINANCE_API_URL", "https://data-api.binance.vision").rstrip("/")
    url = f"{b_url}/api/v3/ticker/price"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return {item["symbol"]: float(item["price"]) for item in resp.json() if "symbol" in item and "price" in item}
    except Exception as e:
        logger.warning("alerts_worker.fetch_prices_failed", {"error": str(e)})
    return {}

async def run_alerts_worker():
    while True:
        try:
            rc = get_redis()
            if rc:
                try:
                    if not await rc.set("worker:alerts:lock", "1", nx=True, ex=15):
                        await asyncio.sleep(10.0)
                        continue
                except Exception:
                    pass
            pool = await init_db()
            rows = await pool.fetch("SELECT * FROM app.user_alerts WHERE status = 'ACTIVE'")
            if rows:
                price_map = await _fetch_binance_prices()
                for row in rows:
                    alert = dict(row)
                    alert_id = str(alert.get("id"))
                    user_id = str(alert.get("user_id"))
                    sym = str(alert.get("symbol", "")).upper()
                    target = float(alert.get("target_price") or 0)
                    cond = str(alert.get("condition") or "ABOVE")
                    inst = find_by_symbol(sym)
                    inst_sym = inst["symbol"] if inst else sym
                    curr_price = float(price_map[inst_sym]) if inst_sym in price_map else 0.0
                    if not curr_price or curr_price <= 0:
                        continue
                    prev_p = _prev_prices.get(sym)
                    _prev_prices[sym] = curr_price
                    is_hit = evaluate_alert_condition(cond, target, curr_price, prev_p)
                    if is_hit:
                        await pool.execute(
                            "UPDATE app.user_alerts SET status = 'TRIGGERED', triggered_at = NOW(), triggered_price = $1 WHERE id = $2::uuid",
                            curr_price, alert_id
                        )
                        note = alert.get("note") or ""
                        note_str = f" ({note})" if note else ""
                        msg = f"<b>PRICE ALERT TRIGGERED</b>\n\nSymbol: <b>{sym}</b>\nCondition: <b>{cond}</b>\nTarget: <b>{target}</b>\nTrigger Price: <b>{curr_price}</b>{note_str}"
                        asyncio.create_task(send_telegram_alert(msg))
                        payload = {
                            "type": "ALERT_TRIGGERED",
                            "alert": {
                                "id": alert_id,
                                "symbol": sym,
                                "targetPrice": target,
                                "condition": cond,
                                "status": "TRIGGERED",
                                "triggeredPrice": curr_price,
                                "note": note
                            }
                        }
                        await ws_manager.send_to_user(user_id, payload)
        except Exception as e:
            logger.warning("alerts_worker.loop_error", {"error": str(e)})
        await asyncio.sleep(10.0)
