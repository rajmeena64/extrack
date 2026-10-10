import json
from typing import Any, Dict
from fastapi import APIRouter, Depends
from infra.db.postgres import init_db
from infra.db.redis import get_redis
from domains.auth.service import get_current_user_id
from domains.settings.service import decode_settings, deep_merge, is_valid_timezone
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

settings_router = APIRouter(prefix="/settings", tags=["settings"])

@settings_router.get("")
@settings_router.get("/")
async def get_settings(user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    cache_key = f"user_settings:{uid}"
    try:
        cached = await get_redis().get(cache_key)
        if cached:
            return {"success": True, "settings": json.loads(cached)}
    except Exception:
        pass
    pool = await init_db()
    row = await pool.fetchrow("SELECT settings FROM app.user_settings WHERE user_id = $1", uid)
    settings = decode_settings(row["settings"]) if row else {}
    try:
        await get_redis().set(cache_key, json.dumps(settings))
    except Exception:
        pass
    return {"success": True, "settings": settings}

@settings_router.post("")
@settings_router.post("/")
@settings_router.patch("")
@settings_router.patch("/")
async def save_settings(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    if not isinstance(payload, dict):
        raise AppError(ERROR_MESSAGES["SETTINGS"]["INVALID_PAYLOAD"])
    serialized_raw = json.dumps(payload)
    if len(serialized_raw) > 50 * 1024:
        raise AppError(ERROR_MESSAGES["SETTINGS"]["PAYLOAD_TOO_LARGE"])
    prefs = payload.get("preferences")
    tz = prefs.get("timeZone") if isinstance(prefs, dict) else None
    if tz is not None and not is_valid_timezone(tz):
        raise AppError(ERROR_MESSAGES["SETTINGS"]["INVALID_TIMEZONE"])
    pool = await init_db()
    row = await pool.fetchrow("SELECT settings FROM app.user_settings WHERE user_id = $1", int(user_id))
    current = decode_settings(row["settings"]) if row else {}
    merged = deep_merge(current, payload)
    decoded_merged = decode_settings(merged)
    try:
        await get_redis().set(f"user_settings:{int(user_id)}", json.dumps(decoded_merged))
        dash = decoded_merged.get("dashboard")
        c = decoded_merged.get("currency") or (dash.get("currency") if isinstance(dash, dict) else None)
        if c:
            await get_redis().set(f"user_currency:{int(user_id)}", str(c).upper().strip())
    except Exception:
        pass
    await pool.execute(
        """
        INSERT INTO app.user_settings (user_id, settings, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET settings = EXCLUDED.settings, updated_at = NOW()
        """,
        int(user_id), json.dumps(decoded_merged)
    )
    return {"success": True, "settings": decoded_merged}
