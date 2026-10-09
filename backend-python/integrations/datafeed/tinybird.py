import os
import re
from typing import Optional, List, Dict, Any
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from core.logger.logger import logger
from infra.db.tinybird import get_tinybird_client

async def query_tinybird(sql: str) -> List[Dict[str, Any]]:
    url = os.getenv("TINYBIRD_URL")
    token = os.getenv("TINYBIRD_TOKEN")
    if not url or not token:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    try:
        client = get_tinybird_client()
        resp = await client.post("/v0/sql", data={"q": f"{sql.strip()} FORMAT JSON"})
        if resp.status_code != 200:
            logger.error("tinybird.query_failed", {"status": resp.status_code, "error": resp.text})
            raise AppError(ERROR_MESSAGES["MARKET"]["DATA_UNAVAILABLE"])
        res = resp.json()
        return res["data"] if "data" in res and res["data"] else []
    except AppError:
        raise
    except Exception as e:
        logger.error("tinybird.request_error", {"error": str(e)})
        raise AppError(ERROR_MESSAGES["MARKET"]["DATA_UNAVAILABLE"])

def _parse_timeframe(tf: str):
    raw = str(tf if tf is not None else "").strip()
    m = re.match(r"^([1-9]\d*)\s*([A-Za-z]+)$", raw)
    if not m:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    amt = int(m.group(1))
    u = m.group(2)
    if u == "m" or u.lower() in ("min", "mins", "minute", "minutes"):
        unit = "MINUTE"
    elif u == "M" or u.lower() in ("mo", "month", "months"):
        unit = "MONTH"
    elif u.lower() in ("h", "hr", "hrs", "hour", "hours"):
        unit = "HOUR"
    elif u.lower() in ("d", "day", "days"):
        unit = "DAY"
    elif u.lower() in ("w", "week", "weeks"):
        unit = "WEEK"
    else:
        raise AppError(ERROR_MESSAGES["MARKET"]["INVALID_TIMEFRAME"])
    return amt, unit, (amt == 1 and unit == "MINUTE")

def _clean_ts(val: Optional[Any]) -> Optional[int]:
    if val is None or val == "":
        return None
    try:
        n = int(float(val))
        return n // 1000 if n > 10_000_000_000 else n
    except (ValueError, TypeError):
        return None

def _map_row(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "time": int(r["time"]),
        "open": float(r["open"]),
        "high": float(r["high"]),
        "low": float(r["low"]),
        "close": float(r["close"]),
        "volume": float(r["volume"]) if r.get("volume") is not None else 0.0
    }

async def fetch_tinybird_candles(
    symbol: str,
    timeframe: str = "1m",
    start_time: Optional[Any] = None,
    end_time: Optional[Any] = None,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    clean_sym = re.sub(r"[^A-Z0-9._-]", "", symbol.upper().strip())
    amt, unit, is_m1 = _parse_timeframe(timeframe)
    s_sec = _clean_ts(start_time)
    e_sec = _clean_ts(end_time)
    lim = max(1, min(limit if limit else 1000, 10000))
    conds = [f"symbol = '{clean_sym}'"]
    if s_sec is not None:
        conds.append(f"timestamp >= {s_sec}")
    if e_sec is not None:
        conds.append(f"timestamp <= {e_sec}")
    where_clause = " AND ".join(conds)
    order = "ASC" if s_sec is not None and e_sec is not None else "DESC"
    if is_m1:
        sql = f"""
            SELECT timestamp AS time, open, high, low, close, volume
            FROM candles
            WHERE {where_clause}
            ORDER BY timestamp {order}
            LIMIT 1 BY timestamp
            LIMIT {lim}
        """
        rows = await query_tinybird(sql)
        res = [_map_row(r) for r in rows]
        if order == "DESC":
            res.reverse()
        return res
    interval_sql = f"INTERVAL {amt} {unit}"
    sql = f"""
        SELECT
            toUnixTimestamp(bucket) AS time,
            argMin(open, timestamp) AS open,
            max(high) AS high,
            min(low) AS low,
            argMax(close, timestamp) AS close,
            sum(volume) AS volume
        FROM (
            SELECT
                timestamp,
                toStartOfInterval(toDateTime(timestamp), {interval_sql}) AS bucket,
                open, high, low, close, volume
            FROM candles
            WHERE {where_clause}
            LIMIT 1 BY timestamp
        )
        GROUP BY bucket
        ORDER BY bucket {order}
        LIMIT {lim}
    """
    rows = await query_tinybird(sql)
    res = [_map_row(r) for r in rows]
    if order == "DESC":
        res.reverse()
    return res
