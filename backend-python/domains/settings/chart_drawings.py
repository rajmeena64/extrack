import json, asyncio
from typing import Any, Dict
from fastapi import APIRouter, Depends, Query
from infra.db.postgres import init_db
from infra.db.redis import get_redis
from domains.auth.service import get_current_user_id

chart_drawings_router = APIRouter(prefix="/chart-drawings", tags=["chart-drawings"])

@chart_drawings_router.get("/{symbol}")
async def get_chart_drawing(symbol: str, user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    sym = symbol.upper().strip()
    rc = get_redis()
    if rc:
        try:
            cached = await rc.get(f"user_drawings:{uid}:{sym}")
            if cached:
                return {"success": True, "drawing": {"symbol": sym, "state": json.loads(cached)}}
        except Exception:
            pass
    pool = await init_db()
    row = await pool.fetchrow(
        "SELECT symbol, state, updated_at FROM app.user_chart_drawings WHERE user_id = $1 AND symbol = $2",
        uid, sym
    )
    if not row:
        return {"success": True, "drawing": None}
    state = json.loads(row["state"]) if isinstance(row["state"], str) else row["state"]
    if rc:
        try:
            await rc.set(f"user_drawings:{uid}:{sym}", json.dumps(state))
        except Exception:
            pass
    return {
        "success": True,
        "drawing": {
            "symbol": row["symbol"],
            "state": state,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None
        }
    }

@chart_drawings_router.post("/{symbol}")
async def save_chart_drawing(
    symbol: str,
    payload: Dict[str, Any],
    flush: bool = Query(default=False),
    user_id: Any = Depends(get_current_user_id)
):
    state = payload.get("state")
    if not isinstance(state, dict):
        return {"success": False, "error": "Invalid state payload"}
    uid = int(user_id)
    sym = symbol.upper().strip()
    raw = json.dumps(state)
    rc = get_redis()
    if rc:
        try:
            await rc.set(f"user_drawings:{uid}:{sym}", raw)
            await rc.sadd("pending_chart_drawings", f"{uid}:{sym}")
        except Exception:
            pass
    if flush or not rc:
        pool = await init_db()
        await pool.execute(
            """
            INSERT INTO app.user_chart_drawings (user_id, symbol, state, updated_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (user_id, symbol) DO UPDATE
            SET state = EXCLUDED.state, updated_at = NOW()
            """,
            uid, sym, raw
        )
        if rc:
            try:
                await rc.srem("pending_chart_drawings", f"{uid}:{sym}")
            except Exception:
                pass
    return {"success": True}

@chart_drawings_router.delete("/{symbol}")
async def delete_chart_drawing(symbol: str, user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    sym = symbol.upper().strip()
    rc = get_redis()
    if rc:
        try:
            await rc.delete(f"user_drawings:{uid}:{sym}")
            await rc.srem("pending_chart_drawings", f"{uid}:{sym}")
        except Exception:
            pass
    pool = await init_db()
    await pool.execute("DELETE FROM app.user_chart_drawings WHERE user_id = $1 AND symbol = $2", uid, sym)
    return {"success": True}

async def flush_pending_chart_drawings():
    rc = get_redis()
    if not rc:
        return
    try:
        keys = await rc.smembers("pending_chart_drawings")
        if not keys:
            return
        pool = await init_db()
        for item in list(keys):
            try:
                uid_str, sym = item.split(":", 1)
                val = await rc.get(f"user_drawings:{uid_str}:{sym}")
                if val:
                    await pool.execute(
                        """
                        INSERT INTO app.user_chart_drawings (user_id, symbol, state, updated_at)
                        VALUES ($1, $2, $3::jsonb, NOW())
                        ON CONFLICT (user_id, symbol) DO UPDATE
                        SET state = EXCLUDED.state, updated_at = NOW()
                        """,
                        int(uid_str), sym, val
                    )
                await rc.srem("pending_chart_drawings", item)
            except Exception:
                continue
    except Exception:
        pass

async def run_chart_drawings_worker():
    while True:
        await asyncio.sleep(60.0)
        await flush_pending_chart_drawings()
