import asyncio
from infra.db.redis import get_redis
from domains.notifications.service import hydrate_memory_alerts, get_active_alert_symbols, evaluate_tick_alerts
from integrations.datafeed.service import get_watchlist_quotes
from core.logger.logger import logger

async def run_alerts_worker():
    while True:
        try:
            rc = get_redis()
            if rc:
                try:
                    if not await rc.set("worker:alerts:lock", "1", nx=True, ex=30):
                        await asyncio.sleep(20.0)
                        continue
                except Exception:
                    pass
            await hydrate_memory_alerts()
            syms = list(get_active_alert_symbols())
            if syms:
                quotes = await get_watchlist_quotes(syms)
                for s, q in quotes.items():
                    p = float(q.get("price") or q.get("last") or q.get("bid") or 0.0)
                    if p > 0:
                        await evaluate_tick_alerts(s, p)
        except Exception as e:
            logger.warning("alerts_worker.loop_error", {"error": str(e)})
        await asyncio.sleep(20.0)
