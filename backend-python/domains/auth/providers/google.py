import os
import urllib.parse
import httpx
import asyncpg
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

AUTH_URL = os.getenv("GOOGLE_AUTH_URL", "https://accounts.google.com/o/oauth2/v2/auth")
TOKEN_URL = os.getenv("GOOGLE_TOKEN_URL", "https://oauth2.googleapis.com/token")
USERINFO_URL = os.getenv("GOOGLE_USERINFO_URL", "https://www.googleapis.com/oauth2/v3/userinfo")

def get_config() -> tuple[str, str, str]:
    cid = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    sec = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    cb = os.getenv("GOOGLE_CALLBACK_URL", "").strip() or f"{os.getenv('API_URL', 'http://localhost:5000').rstrip('/')}/api/v1/auth/google/callback"
    if not cid or not sec:
        raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_NOT_CONFIGURED"])
    return cid, sec, cb

def get_auth_url(state: str) -> str:
    cid, _, cb = get_config()
    params = {
        "client_id": cid,
        "redirect_uri": cb,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urllib.parse.urlencode(params)}"

async def exchange_code(code: str) -> str:
    cid, sec, cb = get_config()
    data = {"code": code, "client_id": cid, "client_secret": sec, "redirect_uri": cb, "grant_type": "authorization_code"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(TOKEN_URL, data=data)
        ct = res.headers.get("content-type")
        payload = res.json() if ct and ct.startswith("application/json") else {}
        token = payload.get("access_token")
        if not res.is_success or not token:
            raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_TOKEN_ERROR"])
        return str(token)

async def fetch_profile(access_token: str) -> dict:
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(USERINFO_URL, headers=headers)
        if not res.is_success:
            raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_PROFILE_ERROR"])
        data = res.json()
        email = str(data["email"]).strip().lower() if data.get("email") else ""
        sub = str(data["sub"]).strip() if data.get("sub") else ""
        verified = data.get("email_verified") in (True, "true")
        if not email or not sub:
            raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_INVALID_PROFILE"])
        if not verified:
            raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_UNVERIFIED_EMAIL"])
        return {
            "google_id": sub,
            "email": email,
            "name": str(data["name"]).strip() if data.get("name") else email.split("@")[0],
            "picture": data.get("picture"),
        }

async def upsert_user(conn: asyncpg.Connection, profile: dict) -> int:
    gid, email, name, pic = profile["google_id"], profile["email"], profile["name"], profile.get("picture")
    async with conn.transaction():
        row = await conn.fetchrow(
            "SELECT id FROM app_auth.users WHERE google_id = $1 AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'",
            gid,
        )
        if row:
            await conn.execute(
                "UPDATE app_auth.users SET profile_picture = COALESCE($2, profile_picture), email_verified_at = COALESCE(email_verified_at, NOW()), last_login_at = NOW(), updated_at = NOW() WHERE id = $1",
                row["id"], pic,
            )
            return int(row["id"])
        by_email = await conn.fetchrow(
            "SELECT id, google_id FROM app_auth.users WHERE COALESCE(email_normalized, lower(email)) = $1 AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active' FOR UPDATE",
            email,
        )
        if by_email:
            if by_email["google_id"] and by_email["google_id"] != gid:
                raise AppError(ERROR_MESSAGES["AUTH"]["GOOGLE_ACCOUNT_CONFLICT"])
            await conn.execute(
                "UPDATE app_auth.users SET google_id = $2, auth_provider = CASE WHEN auth_provider = 'local' OR auth_provider IS NULL THEN 'local_google' ELSE auth_provider END, profile_picture = COALESCE($3, profile_picture), email_verified_at = COALESCE(email_verified_at, NOW()), last_login_at = NOW(), updated_at = NOW() WHERE id = $1",
                by_email["id"], gid, pic,
            )
            return int(by_email["id"])
        parts = name.split(maxsplit=1)
        first, last = parts[0] if parts else "", parts[1] if len(parts) > 1 else ""
        inserted = await conn.fetchval(
            """
            INSERT INTO app_auth.users (
                first_name, last_name, name, email, email_original, email_normalized,
                google_id, auth_provider, profile_picture, preferred_currency, email_verified_at,
                status, is_deleted, created_at, updated_at, last_login_at
            ) VALUES ($1, $2, $3, $4, $4, $4, $5, 'google', $6, 'USD', NOW(), 'active', false, NOW(), NOW(), NOW())
            RETURNING id
            """,
            first, last, name, email, gid, pic,
        )
        return int(inserted)
