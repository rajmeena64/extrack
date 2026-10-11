import asyncio, json, os, re
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
    is_futures = source == "entrackbfeed" or cat in ("perpetual", "future") or pt == "future"
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
        return await fetch_binance_candles(
            canonical_sym,
            timeframe=canonical_tf,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
            is_futures=info["is_futures"]
        )

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
    b_spot, b_fut, c_syms = [], [], []
    for s in symbols:
        if not s or not str(s).strip():
            continue
        info = await resolve_feed_provider(str(s).strip())
        if not info:
            continue
        sym = info["symbol"]
        if info["is_bfeed"]:
            (b_fut if info["is_futures"] else b_spot).append(sym)
        else:
            c_syms.append(sym)
    res: Dict[str, Dict[str, Any]] = {}
    async with httpx.AsyncClient(timeout=3.5, headers={"User-Agent": "Mozilla/5.0"}) as client:
        tasks = []
        if b_spot:
            async def _fetch_b_spot():
                spot_url = os.getenv("BINANCE_SPOT_API_URL", "https://data-api.binance.vision").rstrip("/")
                for u in (f"{spot_url}/api/v3/ticker/price", "https://data-api.binance.vision/api/v3/ticker/price"):
                    try:
                        r = await client.get(u, params={"symbols": json.dumps(b_spot, separators=(',', ':'))})
                        if r.status_code == 200:
                            for it in r.json():
                                if "symbol" in it and "price" in it:
                                    p = float(it["price"])
                                    res[it["symbol"]] = {"symbol": it["symbol"], "price": p, "last": p, "bid": p, "ask": p}
                            if res:
                                return
                    except Exception:
                        pass
            tasks.append(_fetch_b_spot())
        if b_fut:
            async def _fetch_b_fut():
                feed_url = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "").rstrip("/")
                key = os.getenv("FEED_INTERNAL_API_KEY", "")
                hdrs = {"x-internal-api-key": key} if key else {}
                fut_bases = [os.getenv("BINANCE_FUTURES_API_URL", "https://fapi.binance.com").rstrip("/"), "https://fapi1.binance.com"]
                async def _one_fut(sym: str):
                    try:
                        r = await client.get(f"{feed_url}/internal/binance/price", params={"symbol": sym}, headers=hdrs)
                        if r.status_code == 200:
                            d = r.json().get("data", {})
                            if "price" in d:
                                p = float(d["price"])
                                res[sym] = {"symbol": sym, "price": p, "last": p, "bid": p, "ask": p}
                                return
                    except Exception:
                        pass
                    for base in fut_bases:
                        try:
                            r = await client.get(f"{base}/fapi/v1/ticker/price", params={"symbol": sym})
                            if r.status_code == 200:
                                p = float(r.json()["price"])
                                res[sym] = {"symbol": sym, "price": p, "last": p, "bid": p, "ask": p}
                                return
                        except Exception:
                            pass
                await asyncio.gather(*[_one_fut(s) for s in b_fut], return_exceptions=True)
            tasks.append(_fetch_b_fut())
        if c_syms:
            async def _fetch_cfeed():
                feed_url = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "").rstrip("/")
                key = os.getenv("FEED_INTERNAL_API_KEY", "")
                hdrs = {"x-internal-api-key": key} if key else {}
                try:
                    r = await client.get(f"{feed_url}/internal/quotes", params={"symbols": ",".join(c_syms)}, headers=hdrs)
                    if r.status_code == 200:
                        qd = r.json().get("quotes", {}).get("quotes", {})
                        for sym, q in qd.items():
                            p = float(q.get("bid") or q.get("ask") or 0.0)
                            res[sym] = {"symbol": sym, "price": p, "last": p, "bid": float(q.get("bid") or p), "ask": float(q.get("ask") or p)}
                except Exception:
                    pass
                missing = [s for s in c_syms if s not in res]
                if missing:
                    async def _one(s):
                        try:
                            c = await get_candles(s, timeframe="1minute", limit=1)
                            if c:
                                p = float(c[-1]["close"])
                                res[s] = {"symbol": s, "price": p, "last": p, "bid": p, "ask": p}
                        except Exception:
                            pass
                    await asyncio.gather(*[_one(s) for s in missing], return_exceptions=True)
            tasks.append(_fetch_cfeed())
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    return res
