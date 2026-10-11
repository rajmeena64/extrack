import asyncio, datetime, os
import httpx
import asyncpg
from core.finance.currency import refresh_fx_cache

CFEED_PAIRS = {
    "EUR": ("EURUSD", True),
    "GBP": ("GBPUSD", True),
    "AUD": ("AUDUSD", True),
    "JPY": ("USDJPY", False),
    "CAD": ("USDCAD", False),
    "CHF": ("USDCHF", False),
    "SGD": ("USDSGD", False),
}

async def fetch_market_rates(feed_url: str, feed_key: str, start_d: datetime.date, end_d: datetime.date) -> tuple[dict, dict]:
    headers = {"x-internal-api-key": feed_key} if feed_key else {}
    cfeed_daily: dict[str, dict[str, float]] = {}
    inr_map: dict[str, float] = {}
    days_count = max(10, (end_d - start_d).days + 5)
    async with httpx.AsyncClient(timeout=15.0) as client:
        for cur, (sym, base_is_cur) in CFEED_PAIRS.items():
            try:
                r = await client.get(f"{feed_url}/internal/klines", params={"symbol": sym, "interval": "1d", "limit": days_count}, headers=headers)
                if r.status_code == 200:
                    for c in r.json().get("candles", []):
                        dt = datetime.datetime.fromtimestamp(c[0], datetime.timezone.utc).strftime("%Y-%m-%d")
                        usd_to_cur = (1.0 / float(c[4])) if base_is_cur else float(c[4])
                        cfeed_daily.setdefault(dt, {})[cur] = usd_to_cur
            except Exception:
                pass
        try:
            r_inr = await client.get(f"https://api.frankfurter.dev/v1/{start_d.isoformat()}..{end_d.isoformat()}?from=USD&to=INR")
            if r_inr.status_code == 200:
                for dt, rates in r_inr.json().get("rates", {}).items():
                    if "INR" in rates: inr_map[dt] = float(rates["INR"])
        except Exception:
            pass
    return cfeed_daily, inr_map

async def sync_fx_rates(pool: asyncpg.Pool, start_date: datetime.date | None = None, end_date: datetime.date | None = None) -> int:
    today = datetime.date.today()
    end_d = end_date or today
    if not start_date:
        max_row = await pool.fetchrow("SELECT MAX(rate_date) as max_d FROM fx_rates")
        start_d = (max_row["max_d"] + datetime.timedelta(days=1)) if (max_row and max_row["max_d"]) else today
    else:
        start_d = start_date
    if start_d > end_d: return 0
    feed_url = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "https://feed.entrack.in").rstrip("/")
    feed_key = os.getenv("FEED_INTERNAL_API_KEY", "")
    cfeed_daily, inr_map = await fetch_market_rates(feed_url, feed_key, start_d, end_d)
    last_rates = {"EUR": 0.92, "GBP": 0.77, "AUD": 1.50, "JPY": 155.0, "CAD": 1.38, "CHF": 0.89, "SGD": 1.35, "INR": 83.5, "AED": 3.6725}
    prev_rows = await pool.fetch("SELECT quote_currency, rate FROM fx_rates WHERE rate_date = (SELECT MAX(rate_date) FROM fx_rates WHERE base_currency = 'USD') AND base_currency = 'USD'")
    for pr in prev_rows:
        if pr["quote_currency"] in last_rates and float(pr["rate"]) > 0:
            last_rates[pr["quote_currency"]] = float(pr["rate"])
    rows = []
    cur_d = start_d
    while cur_d <= end_d:
        d_str = cur_d.strftime("%Y-%m-%d")
        day_cfeed = cfeed_daily.get(d_str, {})
        for c in CFEED_PAIRS:
            if c in day_cfeed and day_cfeed[c] > 0:
                last_rates[c] = day_cfeed[c]
        if d_str in inr_map and inr_map[d_str] > 0:
            last_rates["INR"] = inr_map[d_str]
        rows.append((cur_d, "USD", "USD", 1.0, "ctrader"))
        for c, rate in last_rates.items():
            rows.append((cur_d, "USD", c, rate, "ctrader"))
            rows.append((cur_d, c, "USD", 1.0 / rate, "ctrader"))
        cur_d += datetime.timedelta(days=1)
    if not rows: return 0
    q = "INSERT INTO fx_rates (rate_date, base_currency, quote_currency, rate, source) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (rate_date, base_currency, quote_currency) DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, created_at = NOW()"
    await pool.executemany(q, rows)
    await refresh_fx_cache()
    return len(rows)

async def run_fx_worker():
    from infra.db.postgres import init_db
    while True:
        try:
            pool = await init_db()
            await sync_fx_rates(pool)
        except Exception:
            pass
        await asyncio.sleep(86400)
