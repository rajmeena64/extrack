import json, asyncio, time, uuid
from typing import Any, Dict
from fastapi import APIRouter, Depends
from infra.db.postgres import init_db
from infra.db.redis import get_redis
from domains.auth.service import get_current_user_id

DEBOUNCE_SECONDS = 180
chart_router = APIRouter(prefix="/chart", tags=["chart"])

@chart_router.get("/settings")
async def get_settings(user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    row = await pool.fetchrow("SELECT settings FROM chart.settings WHERE user_id = $1", int(user_id))
    data = json.loads(row["settings"]) if row and isinstance(row["settings"], str) else (row["settings"] if row else {})
    return {"success": True, "settings": data or {}}

@chart_router.post("/settings")
async def save_settings(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    raw = json.dumps(payload.get("settings", {}))
    await pool.execute("INSERT INTO chart.settings (user_id, settings, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()", int(user_id), raw)
    return {"success": True}

@chart_router.get("/layouts")
async def get_layouts(user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    uid = int(user_id)
    rows = await pool.fetch("SELECT id::text, name, symbol, resolution, EXTRACT(EPOCH FROM updated_at)::bigint AS timestamp FROM chart.layouts WHERE user_id = $1 ORDER BY updated_at DESC", uid)
    if not rows:
        row = await pool.fetchrow("INSERT INTO chart.layouts (user_id, name, symbol, resolution, content, updated_at) VALUES ($1, 'Default', 'XAUUSD', '15', '{}'::jsonb, NOW()) RETURNING id::text, name, symbol, resolution, EXTRACT(EPOCH FROM updated_at)::bigint AS timestamp", uid)
        return {"success": True, "layouts": [dict(row)]}
    return {"success": True, "layouts": [dict(r) for r in rows]}

@chart_router.get("/layouts/{layout_id}")
async def get_layout(layout_id: str, user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    rc = get_redis()
    if rc:
        try:
            cached = await rc.get(f"chart_layout:{uid}:{layout_id}")
            if cached:
                data = json.loads(cached)
                cnt = data.get("content")
                if isinstance(cnt, dict) and "content" in cnt and isinstance(cnt["content"], (str, dict)):
                    cnt = json.loads(cnt["content"]) if isinstance(cnt["content"], str) else cnt["content"]
                return {"success": True, "layout": {"id": data["id"], "name": data.get("name", "Default"), "symbol": data.get("symbol", ""), "resolution": data.get("resolution", ""), "content": cnt, "timestamp": data.get("timestamp", int(time.time()))}}
        except Exception:
            pass
    pool = await init_db()
    row = await pool.fetchrow("SELECT id::text, name, symbol, resolution, content, EXTRACT(EPOCH FROM updated_at)::bigint AS timestamp FROM chart.layouts WHERE id = $1::uuid AND user_id = $2", layout_id, uid)
    if not row:
        return {"success": False, "error": "Not found"}
    content = json.loads(row["content"]) if isinstance(row["content"], str) else row["content"]
    if isinstance(content, dict) and "content" in content and isinstance(content["content"], (str, dict)):
        content = json.loads(content["content"]) if isinstance(content["content"], str) else content["content"]
    return {"success": True, "layout": {"id": row["id"], "name": row["name"], "symbol": row["symbol"], "resolution": row["resolution"], "content": content, "timestamp": row["timestamp"]}}

@chart_router.post("/layouts")
async def save_layout(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    lid, name, sym, res, cnt = payload.get("id"), payload.get("name", "Default"), payload.get("symbol", ""), payload.get("resolution", ""), payload.get("content", {})
    if isinstance(cnt, dict) and "content" in cnt and isinstance(cnt["content"], (str, dict)):
        cnt = cnt["content"]
    if not lid or lid == "default":
        pool = await init_db()
        existing = await pool.fetchrow("SELECT id::text FROM chart.layouts WHERE user_id = $1 AND name = $2 ORDER BY updated_at DESC LIMIT 1", uid, name)
        lid = existing["id"] if existing else str(uuid.uuid4())
    rc = get_redis()
    if rc:
        try:
            item_data = json.dumps({"id": lid, "name": name, "symbol": sym, "resolution": res, "content": cnt, "timestamp": int(time.time())})
            await rc.set(f"chart_layout:{uid}:{lid}", item_data)
            await rc.zadd("pending_chart_layouts", {f"{uid}:{lid}": time.time() + DEBOUNCE_SECONDS})
            return {"success": True, "id": lid}
        except Exception:
            pass
    pool = await init_db()
    raw = json.dumps(cnt) if isinstance(cnt, (dict, list)) else str(cnt)
    row = await pool.fetchrow(
        """INSERT INTO chart.layouts (id, user_id, name, symbol, resolution, content, updated_at)
        VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, resolution = EXCLUDED.resolution, content = EXCLUDED.content, updated_at = NOW()
        RETURNING id::text""",
        lid, uid, name, sym, res, raw
    )
    return {"success": True, "id": row["id"]}

@chart_router.delete("/layouts/{layout_id}")
async def delete_layout(layout_id: str, user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    rc = get_redis()
    if rc:
        try:
            await rc.delete(f"chart_layout:{uid}:{layout_id}")
            await rc.zrem("pending_chart_layouts", f"{uid}:{layout_id}")
        except Exception:
            pass
    pool = await init_db()
    await pool.execute("DELETE FROM chart.layouts WHERE id = $1::uuid AND user_id = $2", layout_id, uid)
    return {"success": True}

@chart_router.get("/drawings/{symbol}")
async def get_drawings(symbol: str, user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    row = await pool.fetchrow("SELECT symbol, state, updated_at FROM chart.drawings WHERE user_id = $1 AND symbol = $2", int(user_id), symbol.upper().strip())
    state = json.loads(row["state"]) if row and isinstance(row["state"], str) else (row["state"] if row else None)
    return {"success": True, "drawing": {"symbol": row["symbol"], "state": state} if row else None}

@chart_router.post("/drawings/{symbol}")
async def save_drawings(symbol: str, payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    raw = json.dumps(payload.get("state", {}))
    await pool.execute("INSERT INTO chart.drawings (user_id, symbol, state, updated_at) VALUES ($1, $2, $3::jsonb, NOW()) ON CONFLICT (user_id, symbol) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()", int(user_id), symbol.upper().strip(), raw)
    return {"success": True}

@chart_router.delete("/drawings/{symbol}")
async def delete_drawings(symbol: str, user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    await pool.execute("DELETE FROM chart.drawings WHERE user_id = $1 AND symbol = $2", int(user_id), symbol.upper().strip())
    return {"success": True}

@chart_router.get("/templates")
async def get_templates(user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    rows = await pool.fetch("SELECT name, content FROM chart.templates WHERE user_id = $1 ORDER BY updated_at DESC", int(user_id))
    return {"success": True, "templates": [{"name": r["name"], "content": json.loads(r["content"]) if isinstance(r["content"], str) else r["content"]} for r in rows]}

@chart_router.post("/templates")
async def save_template(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    name, cnt = payload.get("name", ""), payload.get("content", {})
    raw = json.dumps(cnt) if isinstance(cnt, (dict, list)) else str(cnt)
    row = await pool.fetchrow("INSERT INTO chart.templates (user_id, name, content, updated_at) VALUES ($1, $2, $3::jsonb, NOW()) RETURNING id::text", int(user_id), name, raw)
    return {"success": True, "id": row["id"]}

@chart_router.delete("/templates/{name}")
async def delete_template(name: str, user_id: Any = Depends(get_current_user_id)):
    pool = await init_db()
    await pool.execute("DELETE FROM chart.templates WHERE user_id = $1 AND name = $2", int(user_id), name)
    return {"success": True}

async def flush_pending_chart_layouts(force: bool = False):
    rc = get_redis()
    if not rc:
        return
    try:
        now = time.time()
        items = await rc.zrange("pending_chart_layouts", 0, -1) if force else await rc.zrangebyscore("pending_chart_layouts", 0, now)
        if not items:
            return
        pool = await init_db()
        for item in items:
            try:
                raw = await rc.get(f"chart_layout:{item}")
                if raw:
                    data = json.loads(raw)
                    uid_str, lid = item.split(":", 1)
                    cnt = data.get("content")
                    cnt_str = json.dumps(cnt) if isinstance(cnt, (dict, list)) else str(cnt or "{}")
                    await pool.execute(
                        """INSERT INTO chart.layouts (id, user_id, name, symbol, resolution, content, updated_at)
                        VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb, NOW())
                        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, resolution = EXCLUDED.resolution, content = EXCLUDED.content, updated_at = NOW()""",
                        lid, int(uid_str), data.get("name", "Default"), data.get("symbol", ""), data.get("resolution", ""), cnt_str
                    )
                await rc.zrem("pending_chart_layouts", item)
            except Exception:
                continue
    except Exception:
        pass

async def run_chart_layouts_worker():
    while True:
        await asyncio.sleep(10.0)
        await flush_pending_chart_layouts(force=False)

