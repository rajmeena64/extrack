from datetime import datetime
from typing import Optional, Dict, Any
import asyncpg

USER_FIELDS = """
    id, first_name, last_name, name, COALESCE(email_original, email) AS email, email_original, email_normalized,
    phone, mobile_normalized, COALESCE(password_hash, password) AS password_hash, password, preferred_currency,
    account_type, email_verified_at, profile_picture, auth_provider, created_at
"""

async def find_user_by_login(conn: asyncpg.Connection, email: Optional[str] = None, phone: Optional[str] = None) -> Optional[Dict[str, Any]]:
    norm = email.lower().strip() if email and email.strip() else None
    digits = "".join(c for c in phone if c.isdigit()) if phone else ""
    phone_val = digits or (phone.strip() if phone and phone.strip() else None)
    if not norm and not phone_val:
        return None
    row = await conn.fetchrow(
        f"""
        SELECT {USER_FIELDS} FROM app_auth.users
        WHERE (
            (NULLIF($1, '') IS NOT NULL AND COALESCE(email_normalized, lower(email)) = $1)
            OR (NULLIF($2, '') IS NOT NULL AND (mobile_normalized = $2 OR phone = $2))
        )
        AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
        LIMIT 1
        """,
        norm, phone_val
    )
    return dict(row) if row else None

async def find_user_by_id(conn: asyncpg.Connection, user_id: int) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow(
        f"""
        SELECT {USER_FIELDS} FROM app_auth.users
        WHERE id = $1 AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
        LIMIT 1
        """,
        user_id
    )
    return dict(row) if row else None

async def find_existing_user(conn: asyncpg.Connection, email_norm: Optional[str], mobile_norm: Optional[str]) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow(
        """
        SELECT id FROM app_auth.users
        WHERE (COALESCE(email_normalized, lower(email)) = $1 OR (NULLIF($2, '') IS NOT NULL AND (mobile_normalized = $2 OR phone = $2)))
          AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
        LIMIT 1
        """,
        email_norm, mobile_norm if mobile_norm else ""
    )
    return dict(row) if row else None

async def upsert_email_verification(conn: asyncpg.Connection, name: str, email_norm: str, email_orig: str, mobile_norm: Optional[str], pwd_hash: str, token_hash: str, expires_at: datetime):
    existing = await conn.fetchrow("SELECT id FROM app_auth.email_verifications WHERE email_normalized = $1", email_norm)
    if existing:
        await conn.execute(
            """
            UPDATE app_auth.email_verifications
            SET name = $1, email_original = $2, mobile_normalized = $3, password_hash = $4,
                verification_token_hash = $5, verification_expires_at = $6, created_at = NOW()
            WHERE id = $7
            """,
            name, email_orig, mobile_norm, pwd_hash, token_hash, expires_at, existing["id"]
        )
    else:
        await conn.execute(
            """
            INSERT INTO app_auth.email_verifications (name, email_normalized, email_original, mobile_normalized, password_hash, verification_token_hash, verification_expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            name, email_norm, email_orig, mobile_norm, pwd_hash, token_hash, expires_at
        )

async def find_email_verification(conn: asyncpg.Connection, token_hash: str) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow("SELECT * FROM app_auth.email_verifications WHERE verification_token_hash = $1", token_hash)
    return dict(row) if row else None

async def find_pending_verification_by_email(conn: asyncpg.Connection, email_norm: str) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow("SELECT * FROM app_auth.email_verifications WHERE email_normalized = $1", email_norm)
    return dict(row) if row else None

async def delete_email_verification(conn: asyncpg.Connection, verification_id: int):
    await conn.execute("DELETE FROM app_auth.email_verifications WHERE id = $1", verification_id)

async def delete_expired_email_verifications(conn: asyncpg.Connection):
    await conn.execute("DELETE FROM app_auth.email_verifications WHERE verification_expires_at <= NOW()")

async def insert_user_from_verification(conn: asyncpg.Connection, first: str, last: str, email_orig: str, email_norm: str, mobile_norm: Optional[str], pwd_hash: str, name: str) -> Dict[str, Any]:
    row = await conn.fetchrow(
        f"""
        INSERT INTO app_auth.users (
            first_name, last_name, email, phone, password, preferred_currency,
            is_deleted, name, email_normalized, email_original, password_hash,
            mobile_normalized, email_verified_at, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'USD', false, $6, $7, $8, $9, $10, NOW(), 'active', NOW(), NOW())
        RETURNING {USER_FIELDS}
        """,
        first, last, email_orig, mobile_norm if mobile_norm else "", pwd_hash, name, email_norm, email_orig, pwd_hash, mobile_norm
    )
    return dict(row)

async def create_password_reset_otp(conn: asyncpg.Connection, user_id: int, otp_hash: str, expires_at: datetime):
    await conn.execute("UPDATE app_auth.password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", user_id)
    await conn.execute(
        "INSERT INTO app_auth.password_resets (user_id, otp_hash, expires_at) VALUES ($1, $2, $3)",
        user_id, otp_hash, expires_at
    )

async def find_latest_password_reset(conn: asyncpg.Connection, email_norm: str, lock: bool = False) -> Optional[Dict[str, Any]]:
    query = f"""
        SELECT prt.*, COALESCE(u.email_original, u.email) AS email, u.name, u.first_name, COALESCE(u.password_hash, u.password) AS password_hash
        FROM app_auth.password_resets prt
        JOIN app_auth.users u ON u.id = prt.user_id
        WHERE COALESCE(u.email_normalized, lower(u.email)) = $1 AND prt.used_at IS NULL
        ORDER BY prt.created_at DESC LIMIT 1 {'FOR UPDATE' if lock else ''}
    """
    row = await conn.fetchrow(query, email_norm)
    return dict(row) if row else None

async def save_reset_token(conn: asyncpg.Connection, reset_id: Any, token_hash: str, expires_at: datetime):
    await conn.execute("UPDATE app_auth.password_resets SET token_hash = $1, expires_at = $2 WHERE id = $3", token_hash, expires_at, reset_id)

async def find_password_reset_by_token(conn: asyncpg.Connection, token_hash: str, lock: bool = False) -> Optional[Dict[str, Any]]:
    query = f"""
        SELECT prt.*, COALESCE(u.email_original, u.email) AS email, u.name, u.first_name, COALESCE(u.password_hash, u.password) AS password_hash
        FROM app_auth.password_resets prt
        JOIN app_auth.users u ON u.id = prt.user_id
        WHERE prt.token_hash = $1 AND prt.used_at IS NULL
        ORDER BY prt.created_at DESC LIMIT 1 {'FOR UPDATE' if lock else ''}
    """
    row = await conn.fetchrow(query, token_hash)
    return dict(row) if row else None

async def mark_password_reset_used(conn: asyncpg.Connection, reset_id: Any):
    await conn.execute("UPDATE app_auth.password_resets SET used_at = NOW() WHERE id = $1", reset_id)

async def update_user_password(conn: asyncpg.Connection, user_id: int, new_password_hash: str):
    await conn.execute("UPDATE app_auth.users SET password_hash = $1, password = $2, updated_at = NOW() WHERE id = $3", new_password_hash, new_password_hash, user_id)

async def update_user_profile(conn: asyncpg.Connection, user_id: int, first: str, last: str, name: str, phone: Optional[str], currency: str) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow(
        f"""
        UPDATE app_auth.users
        SET first_name = $1, last_name = $2, name = $3,
            phone = COALESCE(NULLIF($4, ''), phone),
            mobile_normalized = COALESCE(NULLIF($4, ''), mobile_normalized),
            preferred_currency = $5, updated_at = NOW()
        WHERE id = $6 AND COALESCE(status, CASE WHEN is_deleted THEN 'deleted' ELSE 'active' END) = 'active'
        RETURNING {USER_FIELDS}
        """,
        first, last, name, phone, currency, user_id
    )
    return dict(row) if row else None

async def soft_delete_user(conn: asyncpg.Connection, user_id: int):
    await conn.execute("DELETE FROM app_auth.refresh_tokens WHERE user_id = $1", user_id)
    await conn.execute("UPDATE app_auth.users SET is_deleted = true, status = 'deleted', updated_at = NOW() WHERE id = $1", user_id)

async def save_refresh_token(conn: asyncpg.Connection, user_id: int, token_hash: str, expires_at: datetime):
    await conn.execute(
        "INSERT INTO app_auth.refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, NOW())",
        user_id, token_hash, expires_at
    )

async def find_refresh_token_for_update(conn: asyncpg.Connection, token_hash: str) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow("SELECT * FROM app_auth.refresh_tokens WHERE token_hash = $1 FOR UPDATE", token_hash)
    return dict(row) if row else None

async def revoke_refresh_token(conn: asyncpg.Connection, token_hash: str):
    await conn.execute("UPDATE app_auth.refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1", token_hash)

async def revoke_all_user_refresh_tokens(conn: asyncpg.Connection, user_id: int):
    await conn.execute("UPDATE app_auth.refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", user_id)

async def update_last_login(conn: asyncpg.Connection, user_id: int):
    await conn.execute("UPDATE app_auth.users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1", user_id)

async def rotate_refresh_token(conn: asyncpg.Connection, old_hash: str, new_hash: str, expires_at: datetime) -> Optional[int]:
    sql = """
        WITH revoked AS (
            UPDATE app_auth.refresh_tokens SET revoked_at = NOW()
            WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL
            RETURNING user_id
        )
        INSERT INTO app_auth.refresh_tokens (user_id, token_hash, expires_at, created_at)
        SELECT user_id, $2, $3, NOW() FROM revoked RETURNING user_id
    """
    row = await conn.fetchrow(sql, old_hash, new_hash, expires_at)
    return row["user_id"] if row else None

async def find_refresh_token(conn: asyncpg.Connection, token_hash: str) -> Optional[Dict[str, Any]]:
    row = await conn.fetchrow("SELECT * FROM app_auth.refresh_tokens WHERE token_hash = $1", token_hash)
    return dict(row) if row else None
