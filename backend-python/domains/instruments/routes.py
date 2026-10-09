from typing import Optional
from fastapi import APIRouter, Query
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.instruments.registry import get_all_instruments, get_instrument, list_instruments, refresh_instrument_cache

instruments_router = APIRouter(tags=["instruments"])

@instruments_router.post("/refresh")
async def refresh_instruments():
    try:
        items = await refresh_instrument_cache()
        return {"success": True, "count": len(items)}
    except Exception:
        raise AppError(ERROR_MESSAGES["INSTRUMENT"]["SERVICE_UNAVAILABLE"])

@instruments_router.get("")
@instruments_router.get("/")
async def get_instruments_list(
    category: Optional[str] = Query(None),
    asset_class: Optional[str] = Query(None, alias="assetClass"),
    product_type: Optional[str] = Query(None, alias="productType"),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(2000)
):
    try:
        if search or category or asset_class or product_type:
            instruments = await list_instruments(
                category=category,
                asset_class=asset_class,
                product_type=product_type,
                search=search,
                limit=limit if limit else 2000
            )
        else:
            instruments = await get_all_instruments()
        return {"success": True, "instruments": instruments}
    except Exception:
        raise AppError(ERROR_MESSAGES["INSTRUMENT"]["SERVICE_UNAVAILABLE"])

@instruments_router.get("/{symbol}")
async def get_single_instrument(symbol: str):
    try:
        instrument = await get_instrument(symbol)
        if not instrument:
            raise AppError(ERROR_MESSAGES["INSTRUMENT"]["NOT_FOUND"])
        return {"success": True, "instrument": instrument}
    except AppError:
        raise
    except Exception:
        raise AppError(ERROR_MESSAGES["INSTRUMENT"]["SERVICE_UNAVAILABLE"])
