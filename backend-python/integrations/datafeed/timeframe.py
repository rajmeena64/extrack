import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

UNIT_MAP = {
    "m": "m", "min": "m", "mins": "m", "minute": "m", "minutes": "m",
    "h": "h", "hr": "h", "hrs": "h", "hour": "h", "hours": "h",
    "d": "d", "day": "d", "days": "d",
    "w": "w", "week": "w", "weeks": "w",
    "M": "M", "mo": "M", "month": "M", "months": "M",
}

BASE_UNITS = {"m": "1m", "h": "1h", "d": "1d", "w": "1w", "M": "1M"}

def resolve_timeframe(raw_tf: Optional[str]) -> str:
    if not raw_tf:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    s = str(raw_tf).strip()
    if s.isdigit():
        mins = int(s)
        return f"{mins // 60}h" if mins >= 60 and mins % 60 == 0 else f"{mins}m"
    if s in ("D", "1D"):
        return "1d"
    if s in ("W", "1W"):
        return "1w"
    if s in ("M", "1M"):
        return "1M"
    m = re.match(r"^([1-9]\d*)\s*([a-zA-Z]+)$", s)
    if not m:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    raw_unit = m.group(2)
    unit = UNIT_MAP.get(raw_unit if raw_unit == "M" else raw_unit.lower())
    if not unit:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    return f"{m.group(1)}{unit}"

def get_base_interval(tf: str) -> str:
    return BASE_UNITS.get(tf[-1], "1m")

def aggregate_candles(candles: List[Dict[str, Any]], target_tf: str) -> List[Dict[str, Any]]:
    if not candles:
        return []
    val = int(target_tf[:-1])
    unit = target_tf[-1]
    buckets: Dict[int, Dict[str, Any]] = {}
    for c in candles:
        t = int(c["time"])
        if unit == "m":
            b_time = (t // (val * 60)) * (val * 60)
        elif unit == "h":
            b_time = (t // (val * 3600)) * (val * 3600)
        elif unit == "d":
            b_time = (t // (val * 86400)) * (val * 86400)
        elif unit == "w":
            b_time = (t // (val * 604800)) * (val * 604800)
        elif unit == "M":
            dt = datetime.fromtimestamp(t, tz=timezone.utc)
            b_m = ((dt.month - 1) // val) * val + 1
            b_time = int(datetime(dt.year, b_m, 1, tzinfo=timezone.utc).timestamp())
        else:
            b_time = t
        if b_time not in buckets:
            buckets[b_time] = {"time": b_time, "open": float(c["open"]), "high": float(c["high"]), "low": float(c["low"]), "close": float(c["close"]), "volume": float(c.get("volume") or 0.0)}
        else:
            b = buckets[b_time]
            h, l = float(c["high"]), float(c["low"])
            if h > b["high"]:
                b["high"] = h
            if l < b["low"]:
                b["low"] = l
            b["close"] = float(c["close"])
            b["volume"] += float(c.get("volume") or 0.0)
    return list(buckets.values())
