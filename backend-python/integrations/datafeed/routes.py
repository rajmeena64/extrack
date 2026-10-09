from typing import Optional
from fastapi import APIRouter, Query
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from integrations.datafeed.service import get_candles, get_watchlist_quotes

datafeed_router = APIRouter(tags=["datafeed"])

@datafeed_router.get("/datafeed/candles")
@datafeed_router.get("/market-chart/candles")
async def get_market_candles(
    symbol: str = Query(...),
    timeframe: Optional[str] = Query(None),
    resolution: Optional[str] = Query(None),
    from_time: Optional[str] = Query(None, alias="from"),
    start_time: Optional[str] = Query(None, alias="startTime"),
    to_time: Optional[str] = Query(None, alias="to"),
    end_time: Optional[str] = Query(None, alias="endTime"),
    limit: Optional[int] = Query(1000)
):
    clean_sym = symbol.strip().upper()
    if not clean_sym:
        raise AppError(ERROR_MESSAGES["MARKET"]["SYMBOL_REQUIRED"])
    tf = timeframe or resolution
    if not tf:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    lim = limit if limit else 1000
    candles = await get_candles(
        symbol=clean_sym,
        timeframe=tf,
        start_time=start_time if start_time is not None else from_time,
        end_time=end_time if end_time is not None else to_time,
        limit=lim
    )
    return {
        "success": True,
        "symbol": clean_sym,
        "candles": candles,
        "data": candles
    }

@datafeed_router.get("/market-chart/watchlist-quotes")
async def get_watchlist_quotes_endpoint(symbols: str = Query(...)):
    raw_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not raw_list:
        return {"success": True, "quotes": {}, "data": {}}
    quotes = await get_watchlist_quotes(raw_list)
    return {
        "success": True,
        "quotes": quotes,
        "data": quotes
    }
