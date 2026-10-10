import asyncio, os, re
import httpx
from typing import Optional, List, Dict, Any
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.instruments.registry import get_instrument
from integrations.datafeed.tinybird import fetch_tinybird_candles
from integrations.datafeed.ctrader_feed import fetch_live_feed_candles
from integrations.datafeed.binance import fetch_binance_candles

UNIT_CODES = {"minute": "m", "hour": "h", "day": "d", "week": "w", "month": "M"}

def resolve_timeframe(tf_str: Optional[str]) -> str:
    if not tf_str:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    m = re.match(r"^([1-9]\d*)(minute|hour|day|week|month)s?$", str(tf_str).strip())
    if not m:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    return f"{m.group(1)}{UNIT_CODES[m.group(2)]}"

async def resolve_feed_provider(symbol: str) -> Optional[Dict[str, Any]]:
    inst = await get_instrument(symbol)
    if not inst:
        return None
    source = str(inst.get("marketSource") or "").lower()
    cat = str(inst.get("category") or "").lower()
    pt = str(inst.get("productType") or "").lower()
    is_futures = cat in ("perpetual", "future") or pt == "future"
    return {
        "symbol": inst["symbol"],
        "is_bfeed": source == "entrackbfeed",
        "is_futures": is_futures,
        "instrument": inst
    }

async def get_candles(
    symbol: str,
    timeframe: str,
    start_time: Optional[Any] = None,
    end_time: Optional[Any] = None,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    canonical_tf = resolve_timeframe(timeframe)
    info = await resolve_feed_provider(symbol)
    if not info:
        return []

    canonical_sym = info["symbol"]
    if info["is_bfeed"]:
        binance_data = await fetch_binance_candles(
            canonical_sym,
            timeframe=canonical_tf,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
            is_futures=info["is_futures"]
        )
        if binance_data:
            return binance_data

    historical = []
    try:
        historical = await fetch_tinybird_candles(
            symbol=canonical_sym,
            timeframe=canonical_tf,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
    except Exception:
        historical = []
    if historical:
        return historical
    return await fetch_live_feed_candles(
        symbol=canonical_sym,
        timeframe=canonical_tf,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )

async def get_watchlist_quotes(symbols: List[str]) -> Dict[str, Dict[str, Any]]:
    if not symbols:
        return {}

    bfeed_spot_symbols = []
    bfeed_futures_symbols = []
    cfeed_symbols = []

    for s in symbols:
        if not s or not str(s).strip():
            continue
        info = await resolve_feed_provider(str(s).strip())
        if not info:
            continue
        if info["is_bfeed"]:
            if info["is_futures"]:
                bfeed_futures_symbols.append(info["symbol"])
            else:
                bfeed_spot_symbols.append(info["symbol"])
        else:
            cfeed_symbols.append(info["symbol"])

    res = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        if bfeed_spot_symbols:
            try:
                spot_url = os.getenv("BINANCE_SPOT_API_URL", "https://api.binance.com").rstrip("/")
                resp = await client.get(f"{spot_url}/api/v3/ticker/price")
                if resp.status_code == 200:
                    pm = {item["symbol"]: float(item["price"]) for item in resp.json() if "symbol" in item and "price" in item}
                    for sym in bfeed_spot_symbols:
                        price = pm.get(sym)
                        if price is not None:
                            res[sym] = {"symbol": sym, "price": price, "last": price, "bid": price, "ask": price}
            except Exception:
                pass

        if bfeed_futures_symbols:
            try:
                fut_url = os.getenv("BINANCE_FUTURES_API_URL", "https://fapi.binance.com").rstrip("/")
                resp = await client.get(f"{fut_url}/fapi/v1/ticker/price")
                if resp.status_code == 200:
                    pm = {item["symbol"]: float(item["price"]) for item in resp.json() if "symbol" in item and "price" in item}
                    for sym in bfeed_futures_symbols:
                        price = pm.get(sym)
                        if price is not None:
                            res[sym] = {"symbol": sym, "price": price, "last": price, "bid": price, "ask": price}
            except Exception:
                pass

    if cfeed_symbols:
        async def fetch_one(sym: str):
            try:
                c = await get_candles(sym, timeframe="1minute", limit=1)
                if c and len(c) > 0:
                    p = float(c[-1]["close"])
                    return sym, {"symbol": sym, "price": p, "last": p, "bid": p, "ask": p}
            except Exception:
                pass
            return sym, None

        results = await asyncio.gather(*[fetch_one(s) for s in cfeed_symbols], return_exceptions=True)
        for item in results:
            if isinstance(item, tuple) and item[1]:
                res[item[0]] = item[1]

    return res
