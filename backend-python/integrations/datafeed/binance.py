import os
import httpx
from typing import Optional, List, Dict, Any
from core.logger.logger import logger
from integrations.datafeed.timeframe import get_base_interval, aggregate_candles

SPOT_API_URL = os.getenv("BINANCE_SPOT_API_URL", "https://data-api.binance.vision").rstrip("/")
FUTURES_API_URL = os.getenv("BINANCE_FUTURES_API_URL", "https://fapi.binance.com").rstrip("/")
VALID_BINANCE_INTERVALS = {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M"}

def _clean_ts_ms(val: Optional[Any]) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        n = int(float(val))
        return n if n > 10_000_000_000 else n * 1000
    except (ValueError, TypeError):
        return None

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

def _parse_klines(data: Any) -> List[Dict[str, Any]]:
    if not isinstance(data, list):
        return []
    return [
        {"time": int(i[0]) // 1000 if int(i[0]) > 10_000_000_000 else int(i[0]), "open": float(i[1]), "high": float(i[2]), "low": float(i[3]), "close": float(i[4]), "volume": float(i[5])}
        for i in data if isinstance(i, list) and len(i) >= 6
    ]

async def fetch_binance_candles(
    symbol: str,
    timeframe: str,
    start_time: Optional[Any] = None,
    end_time: Optional[Any] = None,
    limit: int = 1000,
    is_futures: bool = False
) -> List[Dict[str, Any]]:
    clean_sym = symbol.strip().upper()
    is_composite = timeframe not in VALID_BINANCE_INTERVALS
    interval = get_base_interval(timeframe) if is_composite else timeframe
    lim = min(limit * int(timeframe[:-1]), 1000) if is_composite else max(1, min(limit, 1000))
    endpoint = "/fapi/v1/klines" if is_futures else "/api/v3/klines"
    params: Dict[str, Any] = {"symbol": clean_sym, "interval": interval, "limit": lim}
    st_ms = _clean_ts_ms(start_time)
    et_ms = _clean_ts_ms(end_time)
    if st_ms is not None:
        params["startTime"] = st_ms
    if et_ms is not None:
        params["endTime"] = et_ms
    if is_futures:
        feed_url = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "").rstrip("/")
        key = os.getenv("FEED_INTERNAL_API_KEY", "")
        if feed_url:
            hdrs = {"x-internal-api-key": key, **HEADERS} if key else HEADERS
            try:
                async with httpx.AsyncClient(timeout=4.0, follow_redirects=True, headers=hdrs) as client:
                    resp = await client.get(f"{feed_url}/internal/binance/klines", params=params)
                    if resp.status_code == 200:
                        res = _parse_klines(resp.json().get("candles"))
                        if res:
                            return aggregate_candles(res, timeframe) if is_composite else res
            except Exception:
                pass
    candidate_bases = [
        FUTURES_API_URL,
        "https://fapi.binance.com",
        "https://fapi1.binance.com",
        "https://fapi2.binance.com"
    ] if is_futures else [SPOT_API_URL, "https://data-api.binance.vision"]
    seen = set()
    async with httpx.AsyncClient(timeout=4.0, follow_redirects=True, headers=HEADERS) as client:
        for base in candidate_bases:
            if not base or base in seen:
                continue
            seen.add(base)
            try:
                resp = await client.get(f"{base.rstrip('/')}{endpoint}", params=params)
                if resp.status_code == 200:
                    res = _parse_klines(resp.json())
                    if res:
                        return aggregate_candles(res, timeframe) if is_composite else res
            except Exception:
                pass
    return []
