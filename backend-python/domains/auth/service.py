import os
import time
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt
from fastapi import Request, Response
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES

_access_sec = os.getenv("JWT_ACCESS_SECRET")
_jwt_sec = os.getenv("JWT_SECRET")
ACCESS_SECRET = _access_sec if _access_sec else (_jwt_sec if _jwt_sec else "")
_refresh_sec = os.getenv("JWT_REFRESH_SECRET")
REFRESH_SECRET = _refresh_sec if _refresh_sec else (_jwt_sec if _jwt_sec else "")
ISSUER = os.getenv("JWT_ISSUER", "entrack-api")
AUDIENCE = os.getenv("JWT_AUDIENCE", "entrack-web")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true" or os.getenv("NODE_ENV") == "production"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN")
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def hash_password(password: str) -> str:
    cost = int(os.getenv("BCRYPT_COST", "12"))
    salt = bcrypt.gensalt(cost)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def hash_token(token: str) -> str:
    return hashlib.sha256(str(token).encode("utf-8")).hexdigest()

def hash_otp(otp: str) -> str:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    return hmac.new(ACCESS_SECRET.encode("utf-8"), str(otp).encode("utf-8"), hashlib.sha256).hexdigest()

def verify_otp(plain_otp: str, stored_hash: str) -> bool:
    if not plain_otp or not stored_hash:
        return False
    if hmac.compare_digest(hash_otp(plain_otp), stored_hash):
        return True
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        return verify_password(plain_otp, stored_hash)
    return False

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(32)

def sign_access_token(user_id: Any) -> str:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    payload = {
        "sub": str(user_id),
        "userId": user_id,
        "typ": "access",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, ACCESS_SECRET, algorithm="HS256")

def verify_access_token(token: str) -> Dict[str, Any]:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    payload = jwt.decode(token, ACCESS_SECRET, algorithms=["HS256"], issuer=ISSUER, audience=AUDIENCE, options={"verify_aud": True, "verify_iss": True})
    if payload.get("typ") != "access":
        raise jwt.InvalidTokenError("Invalid token type")
    return payload

def sign_ws_token(user_id: Any) -> str:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    payload = {
        "sub": str(user_id),
        "userId": user_id,
        "typ": "websocket",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "purpose": "websocket",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=60),
    }
    return jwt.encode(payload, ACCESS_SECRET, algorithm="HS256")

def verify_ws_token(token: str) -> Dict[str, Any]:
    if not ACCESS_SECRET:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    payload = jwt.decode(token, ACCESS_SECRET, algorithms=["HS256"], issuer=ISSUER, audience=AUDIENCE, options={"verify_aud": True, "verify_iss": True})
    if payload.get("typ") != "websocket" and payload.get("purpose") != "websocket":
        raise jwt.InvalidTokenError("Invalid websocket token")
    return payload

def set_auth_cookies(response: Response, access_token: str, refresh_token: str, refresh_expires_at: datetime):
    max_age_refresh = max(0, int((refresh_expires_at - datetime.now(timezone.utc)).total_seconds()))
    response.set_cookie(
        key="accessToken",
        value=access_token,
        max_age=15 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key="refreshToken",
        value=refresh_token,
        max_age=max_age_refresh,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=COOKIE_DOMAIN,
        path="/",
    )

def clear_auth_cookies(response: Response):
    for path in ["/", "/api/auth"]:
        response.delete_cookie(key="accessToken", path=path, domain=COOKIE_DOMAIN, secure=COOKIE_SECURE, httponly=True, samesite=COOKIE_SAMESITE)
        response.delete_cookie(key="refreshToken", path=path, domain=COOKIE_DOMAIN, secure=COOKIE_SECURE, httponly=True, samesite=COOKIE_SAMESITE)

_user_status_cache: Dict[str, float] = {}

async def ensure_active_user(user_id: Any) -> bool:
    uid = str(user_id)
    now = time.time()
    if _user_status_cache.get(uid, 0) > now:
        return True
    from infra.db.postgres import init_db
    try:
        pool = await init_db()
        row = await pool.fetchval(
            "SELECT 1 FROM app_auth.users WHERE id = $1 AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'",
            int(user_id)
        )
        if not row:
            _user_status_cache.pop(uid, None)
            return False
        _user_status_cache[uid] = now + 300.0
        return True
    except Exception:
        return False

async def get_current_user_id(request: Request) -> Any:
    token = request.cookies.get("accessToken")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if not token:
        raise AppError(ERROR_MESSAGES["AUTH"]["AUTH_REQUIRED"])
    try:
        decoded = verify_access_token(token)
        user_id = decoded.get("sub")
        if not user_id:
            raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_AUTH_TOKEN"])
        if not await ensure_active_user(user_id):
            raise AppError(ERROR_MESSAGES["AUTH"]["AUTH_REQUIRED"])
        return user_id
    except jwt.ExpiredSignatureError:
        raise AppError(ERROR_MESSAGES["AUTH"]["SESSION_EXPIRED"])
    except AppError:
        raise
    except Exception:
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_AUTH_TOKEN"])

def mark_user_active(user_id: Any):
    _user_status_cache[str(user_id)] = time.time() + 300.0

async def get_current_user_id_fast(request: Request) -> Any:
    token = request.cookies.get("accessToken")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if not token:
        raise AppError(ERROR_MESSAGES["AUTH"]["AUTH_REQUIRED"])
    try:
        decoded = verify_access_token(token)
        user_id = decoded.get("sub")
        if not user_id:
            raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_AUTH_TOKEN"])
        return user_id
    except jwt.ExpiredSignatureError:
        raise AppError(ERROR_MESSAGES["AUTH"]["SESSION_EXPIRED"])
    except AppError:
        raise
    except Exception:
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_AUTH_TOKEN"])

def generate_raw_token(length: int = 32) -> str:
    return secrets.token_hex(length)

def generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000}"

def split_name(name: Optional[str]) -> tuple[str, str]:
    cleaned = name.strip() if name else ""
    parts = cleaned.split(maxsplit=1)
    return (parts[0], parts[1]) if len(parts) > 1 else (parts[0] if parts else "", "")

def safe_user(row: Dict[str, Any]) -> Dict[str, Any]:
    first = str(row["first_name"]) if row.get("first_name") else ""
    last = str(row["last_name"]) if row.get("last_name") else ""
    full_name = f"{first} {last}".strip()
    name = str(row["name"]) if row.get("name") else (full_name if full_name else "Entrack User")
    return {
        "ID": row["id"],
        "id": row["id"],
        "name": name,
        "firstName": first,
        "lastName": last,
        "email": row.get("email"),
        "phone": row.get("phone"),
        "accountType": str(row["account_type"]) if row.get("account_type") else "manual",
        "preferred_currency": str(row["preferred_currency"]) if row.get("preferred_currency") else "USD",
        "profileComplete": bool(first and last),
        "email_verified_at": row["email_verified_at"].isoformat() if row.get("email_verified_at") else None,
        "profilePicture": row.get("profile_picture"),
        "authProvider": str(row["auth_provider"]) if row.get("auth_provider") else "local",
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
    }
