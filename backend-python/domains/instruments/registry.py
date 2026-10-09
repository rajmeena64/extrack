from typing import Optional, List, Dict, Any
from infra.db.postgres import init_db

SELECT_SQL = """
    SELECT
        id::text AS id,
        symbol,
        name,
        display_name AS "displayName",
        category,
        asset_class AS "assetClass",
        product_type AS "productType",
        market_source AS "marketSource",
        profit_currency AS "profitCurrency",
        digits,
        TRIM_SCALE(contract_size)::text AS "contractSize",
        TRIM_SCALE(tick_size)::text AS "tickSize",
        TRIM_SCALE(pip_size)::text AS "pipSize"
    FROM trading_catalog.instruments
    WHERE is_active = TRUE
    ORDER BY sort_order, symbol
"""

_cache: Dict[str, Any] = {"map": {}, "list": [], "ready": False}

async def refresh_instrument_cache() -> List[Dict[str, Any]]:
    pool = await init_db()
    rows = await pool.fetch(SELECT_SQL)
    items = []
    symbol_map = {}
    for r in rows:
        d = dict(r)
        d["symbol"] = d["symbol"].upper()
        symbol_map[d["symbol"]] = d
        items.append(d)
    _cache["map"] = symbol_map
    _cache["list"] = items
    _cache["ready"] = True
    return items

async def ensure_loaded():
    if not _cache["ready"]:
        await refresh_instrument_cache()

import re

def normalize_symbol(value: Optional[str], product_type: Optional[str] = None) -> str:
    s = str(value).strip() if value else ""
    if not s:
        return ""
    if ":" in s:
        parts = s.split(":")
        s = parts[0] if "/" in parts[0] else parts[-1]
    m_sep = re.match(r"^([A-Za-z0-9]+)[._-]", s)
    if m_sep:
        return m_sep.group(1).upper()
    m_low = re.match(r"^([A-Za-z0-9]+?)[a-z]+$", s)
    if m_low and len(m_low.group(1)) >= 2:
        return m_low.group(1).upper()
    return re.sub(r"[^A-Za-z0-9]", "", s).upper()

def find_by_symbol(symbol: Optional[str], product_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
    if not symbol:
        return None
    raw_key = symbol.strip().upper()
    if raw_key in _cache["map"]:
        return _cache["map"][raw_key]
    norm = normalize_symbol(symbol, product_type)
    if norm in _cache["map"]:
        return _cache["map"][norm]
    for k in sorted(_cache["map"].keys(), key=len, reverse=True):
        if len(k) >= 2 and norm.startswith(k) and _cache["map"][k].get("productType") in ("future", "forex_cfd"):
            return _cache["map"][k]
    return None

async def get_instrument(symbol: str) -> Optional[Dict[str, Any]]:
    await ensure_loaded()
    return find_by_symbol(symbol)

async def get_all_instruments() -> List[Dict[str, Any]]:
    await ensure_loaded()
    return _cache["list"]

async def list_instruments(
    category: Optional[str] = None,
    asset_class: Optional[str] = None,
    product_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 2000
) -> List[Dict[str, Any]]:
    await ensure_loaded()
    res = _cache["list"]
    if category:
        c = category.lower().strip()
        if c == "crypto":
            res = [i for i in res if (i.get("assetClass") == "crypto" or i.get("category") == "crypto")]
        elif c == "forex_cfd":
            res = [i for i in res if i.get("category") in ("forex", "cfd") or i.get("assetClass") in ("forex", "forex_cfd", "metal", "energy")]
        else:
            res = [i for i in res if (i["category"].lower() if i.get("category") else "") == c or (i["assetClass"].lower() if i.get("assetClass") else "") == c]
    if asset_class:
        ac = asset_class.lower().strip()
        res = [i for i in res if (i["assetClass"].lower() if i.get("assetClass") else "") == ac]
    if product_type:
        pt = product_type.lower().strip()
        res = [i for i in res if (i["productType"].lower() if i.get("productType") else "") == pt]
    if search:
        q = search.lower().strip()
        res = [i for i in res if (
            (q in i["symbol"].lower() if i.get("symbol") else False) or
            (q in i["name"].lower() if i.get("name") else False) or
            (q in i["displayName"].lower() if i.get("displayName") else False)
        )]
    return res[:limit]
