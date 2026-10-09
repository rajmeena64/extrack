import os
import re
import httpx
from typing import Optional, List, Dict, Any
from core.logger.logger import logger

SPOT_API_URL = os.getenv("BINANCE_SPOT_API_URL", "https://api.binance.com").rstrip("/")
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
    base_url = FUTURES_API_URL if is_futures else SPOT_API_URL
    endpoint = "/fapi/v1/klines" if is_futures else "/api/v3/klines"
    url = f"{base_url}{endpoint}"

    params: Dict[str, Any] = {"symbol": clean_sym, "interval": interval, "limit": lim}
    st_ms = _clean_ts_ms(start_time)
    et_ms = _clean_ts_ms(end_time)
    if st_ms is not None:
        params["startTime"] = st_ms
    if et_ms is not None:
        params["endTime"] = et_ms

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return []
            data = resp.json()
            if not isinstance(data, list):
                return []
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
            return res
    except Exception as e:
        logger.warning("binance.fetch_failed", {"symbol": clean_sym, "is_futures": is_futures, "error": str(e)})
        return []
