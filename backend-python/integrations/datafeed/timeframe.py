import re
from typing import Optional
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

UNIT_MAP = {
    "m": "m", "min": "m", "mins": "m", "minute": "m", "minutes": "m",
    "h": "h", "hr": "h", "hrs": "h", "hour": "h", "hours": "h",
    "d": "d", "day": "d", "days": "d",
    "w": "w", "week": "w", "weeks": "w",
    "M": "M", "mo": "M", "month": "M", "months": "M",
}

def resolve_timeframe(raw_tf: Optional[str]) -> str:
    if not raw_tf:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    m = re.match(r"^([1-9]\d*)\s*([a-zA-Z]+)$", str(raw_tf).strip())
    if not m:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    unit = UNIT_MAP.get(m.group(2) if m.group(2) == "M" else m.group(2).lower())
    if not unit:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    return f"{m.group(1)}{unit}"
