import os
import time
from typing import Optional, List, Dict, Any
import httpx
from core.logger.logger import logger

FEED_SERVICE_URL = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "").rstrip("/")
FEED_INTERNAL_API_KEY = os.getenv("FEED_INTERNAL_API_KEY", "")

def _to_ms(val: Optional[Any]) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        n = int(float(val))
        return n * 1000 if n < 10_000_000_000 else n
    except (ValueError, TypeError):
        return None

async def fetch_live_feed_candles(
    symbol: str,
    timeframe: str = "1m",
    start_time: Optional[Any] = None,
    end_time: Optional[Any] = None,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    if not FEED_SERVICE_URL:
        return []
    clean_sym = symbol.strip().upper()
    url = f"{FEED_SERVICE_URL}/internal/klines"
    headers = {"x-internal-api-key": FEED_INTERNAL_API_KEY} if FEED_INTERNAL_API_KEY else {}
    tf = "1M" if timeframe in ("1M", "1mo", "1month") else timeframe.lower()
    s_ms = _to_ms(start_time)
    e_ms = _to_ms(end_time)
    if e_ms is None and tf != "1m":
        e_ms = int(time.time() * 1000)
    params = {"symbol": clean_sym, "interval": tf, "limit": min(limit, 2000)}
    if s_ms is not None:
        params["startTime"] = s_ms
    if e_ms is not None:
        params["endTime"] = e_ms
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                return []
            data = resp.json()
            raw_candles = data.get("candles") if isinstance(data, dict) else []
            if not isinstance(raw_candles, list):
                return []
            res = []
            for item in raw_candles:
                if isinstance(item, list) and len(item) >= 5:
                    res.append({
                        "time": int(item[0]),
                        "open": float(item[1]),
                        "high": float(item[2]),
                        "low": float(item[3]),
                        "close": float(item[4]),
                        "volume": float(item[5]) if len(item) > 5 else 0.0
                    })
                elif isinstance(item, dict) and "time" in item:
                    res.append({
                        "time": int(item["time"]),
                        "open": float(item.get("open", 0)),
                        "high": float(item.get("high", 0)),
                        "low": float(item.get("low", 0)),
                        "close": float(item.get("close", 0)),
                        "volume": float(item.get("volume", 0))
                    })
            return res
    except Exception as e:
        if not isinstance(e, httpx.ConnectError):
            logger.warning("ctrader_feed.fetch_failed", {"symbol": clean_sym, "error": str(e)})
        return []
