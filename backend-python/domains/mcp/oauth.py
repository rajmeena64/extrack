import os
import hashlib
import secrets
import json
import base64
from datetime import datetime, timezone, timedelta
from typing import Any
import jwt
import httpx
import asyncpg
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.auth.service import ACCESS_SECRET, ISSUER, AUDIENCE
from infra.db.redis import get_redis

GOOGLE_USERINFO_URL = os.getenv("GOOGLE_USERINFO_URL", "https://www.googleapis.com/oauth2/v3/userinfo")
MCP_ACCESS_DAYS = 30
MCP_REFRESH_DAYS = 60
MCP_EXPIRES_IN = MCP_ACCESS_DAYS * 86400

def hash_token(token: str) -> str:
    return hashlib.sha256(str(token).encode("utf-8")).hexdigest()

def sign_mcp_token(user_id: Any, days: int = MCP_ACCESS_DAYS) -> str:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    payload = {
        "sub": str(user_id),
        "userId": user_id,
        "typ": "access",
        "purpose": "mcp",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": datetime.now(timezone.utc) + timedelta(days=days),
    }
    return jwt.encode(payload, ACCESS_SECRET, algorithm="HS256")

def generate_mcp_refresh_token() -> str:
    return f"mcp_ref_{secrets.token_urlsafe(32)}"

async def save_mcp_connection(conn: asyncpg.Connection, user_id: int, token: str, client_name: str = "AI Client", days: int = MCP_ACCESS_DAYS, refresh_token: str | None = None, refresh_days: int = MCP_REFRESH_DAYS) -> dict[str, Any]:
    h = hash_token(token)
    ref_h = hash_token(refresh_token) if refresh_token else None
    exp = datetime.now(timezone.utc) + timedelta(days=days)
    ref_exp = datetime.now(timezone.utc) + timedelta(days=refresh_days) if refresh_token else None
    sql = """
        INSERT INTO app_auth.user_mcp_connections (user_id, client_name, token_hash, refresh_token_hash, is_active, expires_at, refresh_expires_at)
        VALUES ($1, $2, $3, $4, true, $5, $6)
        RETURNING id, user_id, client_name, is_active, disabled_tools, expires_at, refresh_expires_at
    """
    row = await conn.fetchrow(sql, user_id, client_name, h, ref_h, exp, ref_exp)
    return dict(row) if row else {}

async def refresh_mcp_token(conn: asyncpg.Connection, raw_refresh_token: str) -> dict[str, Any]:
    if not raw_refresh_token:
        raise AppError(ERROR_MESSAGES["MCP"]["INVALID_TOKEN"])
    ref_h = hash_token(raw_refresh_token)
    sql = "SELECT id, user_id, client_name, is_active, refresh_expires_at FROM app_auth.user_mcp_connections WHERE refresh_token_hash = $1 LIMIT 1"
    row = await conn.fetchrow(sql, ref_h)
    if not row or not row["is_active"]:
        raise AppError(ERROR_MESSAGES["MCP"]["CONNECTION_NOT_FOUND"])
    if row["refresh_expires_at"] and row["refresh_expires_at"] <= datetime.now(timezone.utc):
        raise AppError(ERROR_MESSAGES["MCP"]["CONNECTION_EXPIRED"])
    new_access_token = sign_mcp_token(row["user_id"])
    new_refresh_token = generate_mcp_refresh_token()
    new_exp = datetime.now(timezone.utc) + timedelta(days=MCP_ACCESS_DAYS)
    new_ref_exp = datetime.now(timezone.utc) + timedelta(days=MCP_REFRESH_DAYS)
    up_sql = """
        UPDATE app_auth.user_mcp_connections
        SET token_hash = $1, refresh_token_hash = $2, expires_at = $3, refresh_expires_at = $4, last_used_at = NOW(), updated_at = NOW()
        WHERE id = $5
    """
    await conn.execute(up_sql, hash_token(new_access_token), hash_token(new_refresh_token), new_exp, new_ref_exp, row["id"])
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "Bearer",
        "expires_in": MCP_EXPIRES_IN
    }


async def verify_mcp_connection(conn: asyncpg.Connection, user_id: int, token: str) -> dict[str, Any]:
    h = hash_token(token)
    sql = """
        SELECT id, is_active, disabled_tools, expires_at 
        FROM app_auth.user_mcp_connections 
        WHERE user_id = $1 AND token_hash = $2
        LIMIT 1
    """
    row = await conn.fetchrow(sql, user_id, h)
    if not row:
        raise AppError(ERROR_MESSAGES["MCP"]["CONNECTION_NOT_FOUND"])
    if not row["is_active"]:
        raise AppError(ERROR_MESSAGES["MCP"]["CONNECTION_REVOKED"])
    if row["expires_at"] <= datetime.now(timezone.utc):
        raise AppError(ERROR_MESSAGES["MCP"]["CONNECTION_EXPIRED"])
    await conn.execute("UPDATE app_auth.user_mcp_connections SET last_used_at = NOW() WHERE id = $1", row["id"])
    return dict(row)

async def revoke_mcp_connection(conn: asyncpg.Connection, user_id: int, connection_id: int | None = None) -> bool:
    if connection_id:
        await conn.execute("UPDATE app_auth.user_mcp_connections SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2", connection_id, user_id)
    else:
        await conn.execute("UPDATE app_auth.user_mcp_connections SET is_active = false, updated_at = NOW() WHERE user_id = $1", user_id)
    return True

async def list_user_mcp_connections(conn: asyncpg.Connection, user_id: int) -> list[dict[str, Any]]:
    sql = "SELECT id, client_name, is_active, disabled_tools, last_used_at, expires_at, created_at FROM app_auth.user_mcp_connections WHERE user_id = $1 ORDER BY created_at DESC"
    rows = await conn.fetch(sql, user_id)
    return [dict(r) for r in rows]

async def get_active_tool_names(conn: asyncpg.Connection, disabled_tools: Any = None) -> set[str]:
    rows = await conn.fetch("SELECT tool_name FROM app_auth.mcp_tools WHERE is_active = true")
    active = {r["tool_name"] for r in rows}
    if isinstance(disabled_tools, str):
        try:
            disabled_tools = json.loads(disabled_tools)
        except Exception:
            disabled_tools = []
    if disabled_tools and isinstance(disabled_tools, (list, set, tuple)):
        active = active - set(disabled_tools)
    return active

async def verify_google_access_token(access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if res.status_code != 200:
            raise AppError(ERROR_MESSAGES["MCP"]["INVALID_TOKEN"])
        data = res.json()
        return {
            "google_id": data.get("sub"),
            "email": str(data["email"] if data.get("email") is not None else "").strip().lower(),
            "name": str(data["name"] if data.get("name") is not None else "").strip(),
            "email_verified": bool(data["email_verified"]) if data.get("email_verified") is not None else False,
        }

async def authenticate_google_user(conn: asyncpg.Connection, access_token: str) -> dict[str, Any]:
    profile = await verify_google_access_token(access_token)
    email, gid = profile["email"], profile["google_id"]
    if not email or not profile.get("email_verified"):
        raise AppError(ERROR_MESSAGES["MCP"]["GOOGLE_EMAIL_UNVERIFIED"])
    sql = """
        SELECT id, name, email, google_id FROM app_auth.users
        WHERE (NULLIF($1, '') IS NOT NULL AND google_id = $1)
           OR COALESCE(email_normalized, lower(email)) = $2
        LIMIT 1
    """
    row = await conn.fetchrow(sql, gid, email)
    if not row:
        raise AppError(ERROR_MESSAGES["MCP"]["ACCOUNT_NOT_FOUND"])
    user = dict(row)
    if not user.get("google_id") and gid:
        await conn.execute("UPDATE app_auth.users SET google_id = $1, updated_at = NOW() WHERE id = $2", gid, user["id"])
    mcp_token = sign_mcp_token(user["id"])
    await save_mcp_connection(conn, user["id"], mcp_token, client_name="Google AI Client")
    u_name = user["name"] if user.get("name") is not None else profile.get("name")
    u_mail = user["email"] if user.get("email") is not None else email
    return {
        "success": True,
        "token": mcp_token,
        "user": {
            "id": user["id"],
            "name": u_name,
            "email": u_mail,
        },
    }

_mem_codes: dict[str, dict[str, Any]] = {}

async def create_oauth_code(user_id: int, client_id: str = "", redirect_uri: str = "", code_challenge: str = "") -> str:
    code = secrets.token_urlsafe(32)
    val = {"uid": user_id, "cid": client_id, "uri": redirect_uri, "cc": code_challenge, "exp": datetime.now(timezone.utc).timestamp() + 300}
    try:
        r = get_redis()
        await r.setex(f"mcp:code:{code}", 300, json.dumps(val))
    except Exception:
        _mem_codes[code] = val
    return code

async def exchange_oauth_code(code: str, client_id: str = "", redirect_uri: str = "", code_verifier: str = "") -> int | None:
    val = None
    try:
        r = get_redis()
        raw = await r.get(f"mcp:code:{code}")
        if raw:
            await r.delete(f"mcp:code:{code}")
            val = json.loads(raw)
    except Exception:
        pass
    if not val:
        val = _mem_codes.pop(code, None)
    exp = float(val["exp"]) if (val and val.get("exp") is not None) else 0.0
    if not val or exp < datetime.now(timezone.utc).timestamp():
        return None
    if val.get("cc"):
        if not code_verifier:
            return None
        cv = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).decode().rstrip("=")
        if cv != val["cc"]:
            return None
    if val.get("cid") and client_id and val["cid"] != client_id:
        return None
    if val.get("uri") and redirect_uri and val["uri"] != redirect_uri:
        return None
    return int(val["uid"])

