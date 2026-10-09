import json
import zoneinfo
from typing import Any, Dict

def is_valid_timezone(val: str) -> bool:
    if not isinstance(val, str) or len(val) > 64:
        return False
    try:
        zoneinfo.ZoneInfo(val)
        return True
    except Exception:
        return False

def deep_merge(target: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(target) if isinstance(target, dict) else {}
    src = source if isinstance(source, dict) else {}
    for k, v in src.items():
        if v is None:
            continue
        if isinstance(v, dict) and isinstance(merged.get(k), dict):
            merged[k] = deep_merge(merged[k], v)
        else:
            merged[k] = v
    return merged

def decode_settings(stored: Any) -> Dict[str, Any]:
    if isinstance(stored, str):
        try:
            stored = json.loads(stored)
        except Exception:
            return {}
    return stored if isinstance(stored, dict) else {}
