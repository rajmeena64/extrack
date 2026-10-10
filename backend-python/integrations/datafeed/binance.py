import os
import re
import httpx
from typing import Optional, List, Dict, Any
from core.logger.logger import logger

SPOT_API_URL = os.getenv("BINANCE_SPOT_API_URL", "https://data-api.binance.vision").rstrip("/")
FUTURES_API_URL = os.getenv("BINANCE_FUTURES_API_URL", "https://fapi.binance.com").rstrip("/")
VALID_BINANCE_INTERVALS = {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"}

def parse_binance_timeframe(raw_tf: str) -> str:
    if not raw_tf:
        return "1m"
    s = str(raw_tf).strip()
    if s in VALID_BINANCE_INTERVALS:
        return s
    s_lower = s.lower()
    if s_lower in VALID_BINANCE_INTERVALS:
        return s_lower
    m = re.match(r"^([1-9]\d*)([a-zA-Z]*)$", s)
    if m:
        val = int(m.group(1))
        unit = m.group(2).lower()
        if not unit or unit in ("m", "min"):
            cand = f"{val}m"
        elif unit in ("h", "hr"):
            cand = f"{val}h"
        elif unit in ("d", "day"):
            cand = f"{val}d"
        elif unit in ("w", "week"):
            cand = f"{val}w"
        elif unit in ("mo", "month"):
            cand = f"{val}M"
        else:
            cand = f"{val}m"
        if cand in VALID_BINANCE_INTERVALS:
            return cand
    return "1m"

def _clean_ts_ms(val: Optional[Any]) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        n = int(float(val))
        return n if n > 10_000_000_000 else n * 1000
    except (ValueError, TypeError):
        return None

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

async def fetch_binance_candles(
    symbol: str,
    timeframe: str = "1m",
    start_time: Optional[Any] = None,
    end_time: Optional[Any] = None,
    limit: int = 1000,
    is_futures: bool = False
) -> List[Dict[str, Any]]:
    clean_sym = symbol.strip().upper()
    interval = parse_binance_timeframe(timeframe)
    lim = max(1, min(limit, 1000))
    endpoint = "/fapi/v1/klines" if is_futures else "/api/v3/klines"
    params: Dict[str, Any] = {"symbol": clean_sym, "interval": interval, "limit": lim}
    st_ms = _clean_ts_ms(start_time)
    et_ms = _clean_ts_ms(end_time)
    if st_ms is not None:
        params["startTime"] = st_ms
    if et_ms is not None:
        params["endTime"] = et_ms

    candidate_bases = [FUTURES_API_URL] if is_futures else [SPOT_API_URL, "https://data-api.binance.vision", "https://api.binance.com"]
    seen = set()
    async with httpx.AsyncClient(timeout=6.0, follow_redirects=True, headers=HEADERS) as client:
        for base in candidate_bases:
            if not base or base in seen:
                continue
            seen.add(base)
            url = f"{base.rstrip('/')}{endpoint}"
            try:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and data:
                        res = []
                        for item in data:
                            if isinstance(item, list) and len(item) >= 6:
                                ts = int(item[0])
                                res.append({
                                    "time": ts // 1000 if ts > 10_000_000_000 else ts,
                                    "open": float(item[1]),
                                    "high": float(item[2]),
                                    "low": float(item[3]),
                                    "close": float(item[4]),
                                    "volume": float(item[5])
                                })
                        if res:
                            return res
            except Exception:
                pass

    if not is_futures:
        try:
            async with httpx.AsyncClient(timeout=6.0, follow_redirects=True, headers=HEADERS) as client:
                fb_url = "https://extrack-backend-9xk0.onrender.com/api/datafeed/candles"
                fb_params = {"symbol": clean_sym, "timeframe": "1minute" if interval == "1m" else timeframe, "limit": lim}
                if st_ms is not None: fb_params["startTime"] = st_ms
                if et_ms is not None: fb_params["endTime"] = et_ms
                resp = await client.get(fb_url, params=fb_params)
                if resp.status_code == 200:
                    d = resp.json()
                    c = d.get("candles") or d.get("data")
                    if isinstance(c, list) and c:
                        return c
        except Exception:
            pass

    return []
