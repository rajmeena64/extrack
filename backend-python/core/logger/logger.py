import json
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import contextvars

_context_var = contextvars.ContextVar("request_context", default={})

def set_context(data: Dict[str, Any]):
    _context_var.set(data)

def get_context() -> Dict[str, Any]:
    return _context_var.get()

def _log(level: str, message: str, meta: Optional[Dict[str, Any]] = None):
    ctx = get_context()
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
    }
    if "traceId" in ctx:
        entry["traceId"] = ctx["traceId"]
    if "userId" in ctx:
        entry["userId"] = ctx["userId"]
    if meta:
        entry.update(meta)
    sys.stdout.write(json.dumps(entry) + "\n")
    sys.stdout.flush()

class Logger:
    @staticmethod
    def info(msg: str, meta: Optional[Dict[str, Any]] = None):
        _log("info", msg, meta)

    @staticmethod
    def warn(msg: str, meta: Optional[Dict[str, Any]] = None):
        _log("warn", msg, meta)

    warning = warn

    @staticmethod
    def error(msg: str, meta: Optional[Dict[str, Any]] = None):
        _log("error", msg, meta)

    @staticmethod
    def debug(msg: str, meta: Optional[Dict[str, Any]] = None):
        _log("debug", msg, meta)

logger = Logger()
