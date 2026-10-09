import bisect
from datetime import date
import asyncpg
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

NORM_MAP = {"USDT": "USD", "USDC": "USD"}
_fx_cache: dict[tuple[str, str], dict[str, float]] = {}
_fx_dates: dict[tuple[str, str], list[str]] = {}

SUPPORTED_BASE_CURRENCIES = {"USD", "USC", "USDT", "USDC", "EUR", "SGD", "AUD", "JPY", "INR", "GBP", "CHF", "CAD", "AED"}

def is_supported_currency(code: str | None) -> bool:
    if not code: return False
    c = code.upper().strip()
    norm = NORM_MAP.get(c, c)
    if norm in SUPPORTED_BASE_CURRENCIES: return True
    return any(norm in pair for pair in _fx_cache)

def normalize_currency(code: str | None) -> str:
    return NORM_MAP.get(code.upper().strip(), code.upper().strip()) if code else "USD"

def parse_date(d: date | str | None) -> date | None:
    if not d: return None
    return d if isinstance(d, date) else date.fromisoformat(str(d).split("T")[0])

def convert_trade_pnl(raw_pnl: float, pnl_currency: str | None, target_currency: str, rate: float) -> float:
    curr = pnl_currency.upper().strip() if pnl_currency else target_currency.upper().strip()
    tgt = target_currency.upper().strip()
    if curr == tgt: return round(raw_pnl, 2)
    val = raw_pnl * 0.01 if curr == "USC" else raw_pnl
    return round(val * rate, 2)

async def refresh_fx_cache():
    global _fx_cache, _fx_dates
    from infra.db.postgres import init_db
    pool = await init_db()
    rows = await pool.fetch("SELECT rate_date::text as d, base_currency, quote_currency, rate FROM fx_rates ORDER BY rate_date ASC")
    temp: dict[tuple[str, str], dict[str, float]] = {}
    for r in rows:
        pair = (r["base_currency"].upper(), r["quote_currency"].upper())
        if pair not in temp: temp[pair] = {}
        temp[pair][r["d"]] = float(r["rate"])
    _fx_cache = temp
    _fx_dates = {p: list(d.keys()) for p, d in temp.items()}

def get_cached_fx_rate(base: str | None, quote: str | None, date_val: date | str | None = None) -> float:
    if not base or not quote:
        raise AppError(ERROR_MESSAGES["CURRENCY"]["PARAMS_MISSING"])
    b = str(base).upper().strip()
    q = str(quote).upper().strip()
    if b == q: return 1.0
    d_str = str(date_val).split("T")[0] if date_val else ""
    norm_b, norm_q = NORM_MAP.get(b, b), NORM_MAP.get(q, q)
    if norm_b == norm_q:
        if b == "USC": return 0.01
        if q == "USC": return 100.0
        return 1.0
    if norm_b == "USC": return 0.01 * get_cached_fx_rate("USD", q, d_str)
    if norm_q == "USC": return 100.0 * get_cached_fx_rate(b, "USD", d_str)
    pair = (norm_b, norm_q)
    if pair in _fx_cache:
        rates = _fx_cache[pair]
        if d_str and d_str in rates: return rates[d_str]
        dates = _fx_dates.get(pair, [])
        if dates and d_str:
            idx = bisect.bisect_right(dates, d_str) - 1
            return rates[dates[idx]] if idx >= 0 else rates[dates[0]]
        if dates: return rates[dates[-1]]
    inv_pair = (norm_q, norm_b)
    if inv_pair in _fx_cache:
        inv = get_cached_fx_rate(norm_q, norm_b, d_str)
        return (1.0 / inv) if inv > 0 else 1.0
    if norm_b != "USD" and norm_q != "USD":
        try:
            r1 = get_cached_fx_rate(norm_b, "USD", d_str)
            r2 = get_cached_fx_rate("USD", norm_q, d_str)
            if r1 > 0 and r2 > 0: return r1 * r2
        except AppError:
            pass
    raise AppError(ERROR_MESSAGES["CURRENCY"]["RATE_UNAVAILABLE"])

async def get_fx_rate(pool: asyncpg.Pool, base: str, quote: str, rate_date: date | str | None = None) -> float:
    b, q = normalize_currency(base), normalize_currency(quote)
    if b == q: return 1.0
    d_obj = parse_date(rate_date)
    q_filter = "AND rate_date <= $3" if d_obj else ""
    params = [b, q, d_obj] if d_obj else [b, q]
    row = await pool.fetchrow(f"SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2 {q_filter} ORDER BY rate_date DESC LIMIT 1", *params)
    if row and float(row["rate"]) > 0: return float(row["rate"])
    inv_params = [q, b, d_obj] if d_obj else [q, b]
    inv_row = await pool.fetchrow(f"SELECT rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2 {q_filter} ORDER BY rate_date DESC LIMIT 1", *inv_params)
    if inv_row and float(inv_row["rate"]) > 0: return 1.0 / float(inv_row["rate"])
    raise AppError(ERROR_MESSAGES["CURRENCY"]["RATE_UNAVAILABLE"])

async def get_fx_rate_map(pool: asyncpg.Pool, base: str, quote: str) -> dict[str, float]:
    b, q = normalize_currency(base), normalize_currency(quote)
    if b == q: return {}
    rows = await pool.fetch("SELECT rate_date::text as d, rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2 ORDER BY rate_date ASC", b, q)
    if rows: return {r["d"]: float(r["rate"]) for r in rows}
    inv_rows = await pool.fetch("SELECT rate_date::text as d, rate FROM fx_rates WHERE base_currency = $1 AND quote_currency = $2 ORDER BY rate_date ASC", q, b)
    return {r["d"]: 1.0 / float(r["rate"]) for r in inv_rows if float(r["rate"]) > 0}
