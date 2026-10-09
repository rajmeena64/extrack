import os, json, tempfile, uuid
import asyncpg
import cloudinary
import cloudinary.uploader
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

def _ensure_cloudinary_config():
    c_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    c_key = os.getenv("CLOUDINARY_API_KEY")
    c_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not c_name or not c_key or not c_secret:
        raise AppError(ERROR_MESSAGES["STORAGE"]["NOT_CONFIGURED"])
    cloudinary.config(cloud_name=c_name, api_key=c_key, api_secret=c_secret)

async def upload_image_to_storage(file_bytes: bytes, filename: str, folder: str = "entrack") -> str:
    _ensure_cloudinary_config()
    ext = os.path.splitext(filename)[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    try:
        res = cloudinary.uploader.upload(tmp_path, folder=folder, resource_type="image")
        url = res.get("secure_url") or res.get("url")
        if not url:
            raise AppError(ERROR_MESSAGES["STORAGE"]["UPLOAD_FAILED"])
        return url
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

async def upload_trade_attachment(pool: asyncpg.Pool, user_id: int, file_bytes: bytes, filename: str, unique_id: str | None = None, target: str = "screenshot") -> dict:
    url = await upload_image_to_storage(file_bytes, filename, folder=f"trades/{user_id}")
    if target == "note" or not unique_id:
        return {"success": True, "url": url}
    cur = await pool.fetchrow("SELECT id, attachments FROM trading.trades WHERE unique_id = $1 AND user_id = $2", unique_id, user_id)
    if not cur:
        raise AppError(ERROR_MESSAGES["TRADING"]["NOT_FOUND"])
    raw_att = cur["attachments"]
    att_list = json.loads(raw_att) if isinstance(raw_att, str) else (raw_att if isinstance(raw_att, list) else [])
    if url not in att_list:
        att_list.append(url)
    res = await pool.fetchrow("UPDATE trading.trades SET attachments = $1::jsonb, updated_at = NOW() WHERE unique_id = $2 AND user_id = $3 RETURNING unique_id, attachments", json.dumps(att_list), unique_id, user_id)
    res_att = json.loads(res["attachments"]) if isinstance(res["attachments"], str) else res["attachments"]
    return {"success": True, "url": url, "attachments": res_att, "uniqueId": res["unique_id"]}

async def delete_trade_attachment(pool: asyncpg.Pool, user_id: int, unique_id: str, attachment_url: str) -> dict:
    cur = await pool.fetchrow("SELECT id, attachments FROM trading.trades WHERE unique_id = $1 AND user_id = $2", unique_id, user_id)
    if not cur:
        raise AppError(ERROR_MESSAGES["TRADING"]["NOT_FOUND"])
    raw_att = cur["attachments"]
    att_list = json.loads(raw_att) if isinstance(raw_att, str) else (raw_att if isinstance(raw_att, list) else [])
    att_list = [u for u in att_list if u != attachment_url]
    res = await pool.fetchrow("UPDATE trading.trades SET attachments = $1::jsonb, updated_at = NOW() WHERE unique_id = $2 AND user_id = $3 RETURNING unique_id, attachments", json.dumps(att_list), unique_id, user_id)
    res_att = json.loads(res["attachments"]) if isinstance(res["attachments"], str) else res["attachments"]
    return {"success": True, "attachments": res_att, "uniqueId": res["unique_id"]}

