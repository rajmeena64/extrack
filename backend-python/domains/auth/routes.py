import os
import re
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Request, Response, BackgroundTasks
from fastapi.responses import RedirectResponse
import asyncpg
from domains.auth.providers import google as google_provider

from infra.db.postgres import get_db
from infra.db.redis import get_redis
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.auth.schemas import (
    LoginRequest, SignupRequest, CompleteRegistrationRequest, RefreshTokenRequest, ChangePasswordRequest,
    UpdateProfileRequest, ForgotPasswordRequest, VerifyResetOtpRequest,
    ResetPasswordRequest, ResendVerificationRequest, DeleteAccountRequest
)
from domains.auth.service import (
    verify_password, hash_password, hash_token, hash_otp, verify_otp, generate_refresh_token,
    sign_access_token, sign_ws_token, set_auth_cookies, clear_auth_cookies,
    get_current_user_id, get_current_user_id_fast, mark_user_active, safe_user, generate_otp, generate_raw_token, split_name,
    COOKIE_SECURE, COOKIE_DOMAIN, COOKIE_SAMESITE
)
import domains.auth.repository as repo
from domains.auth.email_service import (
    send_verification_email, send_password_reset_email,
    send_password_changed_email, send_login_notification_email
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])
common_passwords = {
    "password1234", "password12345", "123456789012", "qwerty123456",
    "letmein123456", "adminpassword", "administrator", "password123456", "welcome123456"
}

def is_weak_password(pwd: str) -> bool:
    if not pwd or len(pwd) < 12 or pwd.lower() in common_passwords:
        return True
    if pwd.isdigit() or pwd.isalpha() or len(set(pwd)) <= 3:
        return True
    return False

@auth_router.get("/health")
async def auth_health():
    return {"success": True, "message": "Auth service operational"}

@auth_router.post("/signup")
async def signup(payload: SignupRequest, bg: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)):
    await repo.delete_expired_email_verifications(conn)
    email_norm = payload.email.lower().strip()
    if payload.password and is_weak_password(payload.password):
        raise AppError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"])
    mobile = payload.phone if payload.phone else payload.mobile
    mobile_norm = mobile.strip() if mobile else None
    existing = await repo.find_existing_user(conn, email_norm, mobile_norm)
    if existing:
        raise AppError(ERROR_MESSAGES["AUTH"]["USER_EXISTS"])
    pwd_hash = hash_password(payload.password) if payload.password else "PENDING_SETUP"
    raw_token = generate_raw_token(32)
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    fn = payload.firstName.strip() if payload.firstName else ""
    ln = payload.lastName.strip() if payload.lastName else ""
    full = f"{fn} {ln}".strip()
    name = payload.name.strip() if payload.name else (full if full else (email_norm.split("@")[0] if email_norm else "Entrack User"))
    await repo.upsert_email_verification(conn, name, email_norm, payload.email.strip(), mobile_norm, pwd_hash, token_hash, expires_at)
    bg.add_task(send_verification_email, payload.email.strip(), name, raw_token)
    return {"success": True, "message": "Verification link sent to your email", "code": "VERIFICATION_SENT", "email": email_norm}

@auth_router.get("/verify-email")
async def verify_email(token: str, conn: asyncpg.Connection = Depends(get_db)):
    await repo.delete_expired_email_verifications(conn)
    token_hash = hash_token(token.strip())
    pending = await repo.find_email_verification(conn, token_hash)
    if not pending:
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_TOKEN"])
    if pending["verification_expires_at"] <= datetime.now(timezone.utc):
        await repo.delete_email_verification(conn, pending["id"])
        raise AppError(ERROR_MESSAGES["AUTH"]["TOKEN_EXPIRED"])
    if pending["password_hash"] != "PENDING_SETUP":
        first, last = split_name(pending["name"])
        user = await repo.insert_user_from_verification(
            conn, first, last, pending["email_original"], pending["email_normalized"],
            pending["mobile_normalized"], pending["password_hash"], pending["name"]
        )
        await repo.delete_email_verification(conn, pending["id"])
        return {"success": True, "message": "Email verified. Your account is ready.", "data": {"user": safe_user(user)}, "code": "EMAIL_VERIFIED"}
    return {"success": True, "message": "Email verified. Complete your password setup.", "data": {"email": pending["email_original"], "name": pending["name"]}, "code": "PASSWORD_REQUIRED"}

@auth_router.post("/complete-registration")
async def complete_registration(payload: CompleteRegistrationRequest, response: Response, conn: asyncpg.Connection = Depends(get_db)):
    token_hash = hash_token(payload.token.strip())
    pending = await repo.find_email_verification(conn, token_hash)
    if not pending:
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_TOKEN"])
    if pending["verification_expires_at"] <= datetime.now(timezone.utc):
        await repo.delete_email_verification(conn, pending["id"])
        raise AppError(ERROR_MESSAGES["AUTH"]["TOKEN_EXPIRED"])
    if payload.confirmPassword and payload.password != payload.confirmPassword:
        raise AppError(ERROR_MESSAGES["AUTH"]["PASSWORD_MISMATCH"])
    if is_weak_password(payload.password):
        raise AppError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"])
    pwd_hash = hash_password(payload.password)
    fn = payload.firstName.strip() if payload.firstName else ""
    ln = payload.lastName.strip() if payload.lastName else ""
    full = f"{fn} {ln}".strip()
    pend_name = pending["name"] if (pending and pending.get("name")) else "Entrack User"
    name = payload.name.strip() if payload.name else (full if full else pend_name)
    first, last = split_name(name)
    user_mobile = payload.mobile.strip() if payload.mobile else (pending["mobile_normalized"] if pending.get("mobile_normalized") else None)
    user = await repo.insert_user_from_verification(
        conn, first, last, pending["email_original"], pending["email_normalized"],
        user_mobile, pwd_hash, name
    )
    await repo.delete_email_verification(conn, pending["id"])
    uid = user["id"]
    access_token = sign_access_token(uid)
    raw_refresh = generate_refresh_token()
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=30)
    await repo.save_refresh_token(conn, uid, hash_token(raw_refresh), refresh_expires)
    await repo.update_last_login(conn, uid)
    set_auth_cookies(response, access_token, raw_refresh, refresh_expires)
    return {"success": True, "message": "Account created successfully", "data": {"user": safe_user(user), "accessToken": access_token}, "code": "REGISTRATION_COMPLETED"}

@auth_router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, bg: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)):
    await repo.delete_expired_email_verifications(conn)
    email_norm = payload.email.lower().strip()
    pending = await repo.find_pending_verification_by_email(conn, email_norm)
    if pending:
        raw_token = generate_raw_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
        await repo.upsert_email_verification(
            conn, pending["name"], email_norm, pending["email_original"],
            pending["mobile_normalized"], pending["password_hash"], token_hash, expires_at
        )
        bg.add_task(send_verification_email, pending["email_original"], pending["name"], raw_token)
    return {"success": True, "message": "If verification is pending, a new email has been sent", "code": "RESEND_ACCEPTED"}

@auth_router.post("/login")
async def login(payload: LoginRequest, request: Request, response: Response, bg: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)):
    if not payload.email and not payload.phone:
        raise AppError(ERROR_MESSAGES["AUTH"]["INPUT_REQUIRED"])
    user = await repo.find_user_by_login(conn, payload.email, payload.phone)
    if not user:
        if payload.email:
            pending = await repo.find_pending_verification_by_email(conn, payload.email.lower().strip())
            if pending:
                raise AppError(ERROR_MESSAGES["AUTH"]["EMAIL_NOT_VERIFIED"])
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_CREDENTIALS"])
    pwd_h = user["password_hash"] if user.get("password_hash") else ""
    if not pwd_h or not verify_password(payload.password, pwd_h):
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_CREDENTIALS"])
    if payload.email and not user["email_verified_at"]:
        raise AppError(ERROR_MESSAGES["AUTH"]["EMAIL_NOT_VERIFIED"])
    uid = user["id"]
    access_token = sign_access_token(uid)
    raw_refresh = generate_refresh_token()
    refresh_expires = datetime.now(timezone.utc) + timedelta(days=30)
    await repo.save_refresh_token(conn, uid, hash_token(raw_refresh), refresh_expires)
    await repo.update_last_login(conn, uid)
    set_auth_cookies(response, access_token, raw_refresh, refresh_expires)
    ip = request.client.host if request.client else "unknown"
    ua_h = request.headers.get("user-agent")
    ua = ua_h if ua_h else "unknown"
    u_name = user["name"] if user.get("name") else "there"
    bg.add_task(send_login_notification_email, user["email"], u_name, ip, ua)
    return {
        "success": True,
        "message": "Login successful",
        "data": {"user": safe_user(user), "accessToken": access_token, "refreshExpiresAt": refresh_expires.isoformat()},
        "code": "LOGIN_SUCCESS"
    }

@auth_router.get("/me")
async def me(user_id: Any = Depends(get_current_user_id_fast), conn: asyncpg.Connection = Depends(get_db)):
    user = await repo.find_user_by_id(conn, int(user_id))
    if not user:
        raise AppError(ERROR_MESSAGES["USER"]["NOT_FOUND"])
    mark_user_active(user_id)
    return {"success": True, "message": "Profile loaded", "data": {"user": safe_user(user)}, "code": "ME_LOADED"}

@auth_router.post("/refresh-token")
async def refresh_token(request: Request, response: Response, payload: Optional[RefreshTokenRequest] = None, conn: asyncpg.Connection = Depends(get_db)):
    token = request.cookies.get("refreshToken")
    if not token and payload and payload.refreshToken:
        token = payload.refreshToken
    if not token:
        clear_auth_cookies(response)
        raise AppError(ERROR_MESSAGES["AUTH"]["SESSION_EXPIRED"])
    token_h = hash_token(token)
    new_raw = generate_refresh_token()
    new_expires = datetime.now(timezone.utc) + timedelta(days=30)
    uid = await repo.rotate_refresh_token(conn, token_h, hash_token(new_raw), new_expires)
    if not uid:
        stored = await repo.find_refresh_token(conn, token_h)
        if stored and stored.get("revoked_at"):
            await repo.revoke_all_user_refresh_tokens(conn, stored["user_id"])
        clear_auth_cookies(response)
        raise AppError(ERROR_MESSAGES["AUTH"]["SESSION_EXPIRED"])
    new_access = sign_access_token(uid)
    set_auth_cookies(response, new_access, new_raw, new_expires)
    return {"success": True, "message": "Token refreshed", "data": {"accessToken": new_access, "refreshExpiresAt": new_expires.isoformat()}, "code": "TOKEN_REFRESHED"}

@auth_router.post("/logout")
async def logout(request: Request, response: Response, conn: asyncpg.Connection = Depends(get_db)):
    token = request.cookies.get("refreshToken")
    if token:
        await repo.revoke_refresh_token(conn, hash_token(token))
    clear_auth_cookies(response)
    return {"success": True, "message": "Logged out successfully", "code": "LOGOUT_SUCCESS"}

async def _get_failed_attempts(email: str) -> int:
    try:
        val = await get_redis().get(f"pwd_reset_fail:{email}")
        return int(val) if val else 0
    except Exception:
        return 0

async def _inc_failed_attempts(email: str) -> int:
    try:
        r = get_redis()
        cnt = await r.incr(f"pwd_reset_fail:{email}")
        await r.expire(f"pwd_reset_fail:{email}", 300)
        return int(cnt)
    except Exception:
        return 0

async def _clear_failed_attempts(email: str):
    try:
        await get_redis().delete(f"pwd_reset_fail:{email}")
    except Exception:
        pass

@auth_router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, bg: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)):
    email_norm = payload.email.lower().strip()
    user = await repo.find_user_by_login(conn, email=email_norm)
    if user:
        now = datetime.now(timezone.utc)
        active_reset = await repo.find_latest_password_reset(conn, email_norm)
        if active_reset and active_reset.get("created_at"):
            diff = (now - active_reset["created_at"]).total_seconds()
            if diff < 60:
                cooldown = max(0, int(60 - diff))
                return {"success": True, "message": "A password reset OTP was already sent. Please wait.", "data": {"resendAfterSeconds": cooldown}, "code": "RESET_OTP_COOLDOWN"}
        raw_otp = generate_otp()
        otp_hash = hash_otp(raw_otp)
        expires_at = now + timedelta(minutes=5)
        await repo.create_password_reset_otp(conn, user["id"], otp_hash, expires_at)
        await _clear_failed_attempts(email_norm)
        u_name = user["name"] if user.get("name") else "there"
        bg.add_task(send_password_reset_email, user["email"], u_name, raw_otp)
    return {"success": True, "message": "If this account exists, we'll send reset instructions.", "data": {"resendAfterSeconds": 60}, "code": "RESET_REQUEST_ACCEPTED"}

@auth_router.post("/verify-reset-otp")
async def verify_reset_otp(payload: VerifyResetOtpRequest, conn: asyncpg.Connection = Depends(get_db)):
    email_norm = payload.email.lower().strip()
    otp_clean = payload.otp.strip()
    if not re.match(r"^\d{6}$", otp_clean):
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_RESET_OTP"])
    if await _get_failed_attempts(email_norm) >= 5:
        reset = await repo.find_latest_password_reset(conn, email_norm)
        if reset:
            await repo.mark_password_reset_used(conn, reset["id"])
        raise AppError(ERROR_MESSAGES["AUTH"]["RESET_OTP_MAX_ATTEMPTS"])
    reset = await repo.find_latest_password_reset(conn, email_norm, lock=True)
    now = datetime.now(timezone.utc)
    if not reset or reset["expires_at"] <= now or not verify_otp(otp_clean, reset["otp_hash"]):
        if reset and await _inc_failed_attempts(email_norm) >= 5:
            await repo.mark_password_reset_used(conn, reset["id"])
            raise AppError(ERROR_MESSAGES["AUTH"]["RESET_OTP_MAX_ATTEMPTS"])
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_RESET_OTP"])
    await _clear_failed_attempts(email_norm)
    raw_token = generate_raw_token(32)
    token_h = hash_token(raw_token)
    token_expires = now + timedelta(minutes=15)
    await repo.save_reset_token(conn, reset["id"], token_h, token_expires)
    return {"success": True, "message": "OTP verified. You can set a new password now.", "data": {"resetToken": raw_token}, "resetToken": raw_token, "code": "RESET_OTP_VERIFIED"}

@auth_router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, bg: BackgroundTasks, conn: asyncpg.Connection = Depends(get_db)):
    new_pwd = payload.newPassword if payload.newPassword else payload.password
    if not new_pwd or is_weak_password(new_pwd):
        raise AppError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"])
    now = datetime.now(timezone.utc)
    reset = None
    if payload.resetToken:
        token_h = hash_token(payload.resetToken.strip())
        reset = await repo.find_password_reset_by_token(conn, token_h, lock=True)
    elif payload.email and payload.otp:
        email_norm = payload.email.lower().strip()
        otp_clean = payload.otp.strip()
        if not re.match(r"^\d{6}$", otp_clean):
            raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_RESET_OTP"])
        if await _get_failed_attempts(email_norm) >= 5:
            r = await repo.find_latest_password_reset(conn, email_norm)
            if r:
                await repo.mark_password_reset_used(conn, r["id"])
            raise AppError(ERROR_MESSAGES["AUTH"]["RESET_OTP_MAX_ATTEMPTS"])
        reset = await repo.find_latest_password_reset(conn, email_norm, lock=True)
        if not reset or not verify_otp(otp_clean, reset["otp_hash"]):
            if reset and await _inc_failed_attempts(email_norm) >= 5:
                await repo.mark_password_reset_used(conn, reset["id"])
                raise AppError(ERROR_MESSAGES["AUTH"]["RESET_OTP_MAX_ATTEMPTS"])
            raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_RESET_OTP"])
    if not reset or reset["expires_at"] <= now:
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_RESET_OTP"])
    pwd_hash = hash_password(new_pwd)
    await repo.update_user_password(conn, reset["user_id"], pwd_hash)
    await repo.mark_password_reset_used(conn, reset["id"])
    await repo.revoke_all_user_refresh_tokens(conn, reset["user_id"])
    if payload.email:
        await _clear_failed_attempts(payload.email.lower().strip())
    r_name = reset["name"] if reset.get("name") else "there"
    bg.add_task(send_password_changed_email, reset["email"], r_name)
    return {"success": True, "message": "Password reset successful. Please login again.", "code": "PASSWORD_RESET"}

@auth_router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, response: Response, bg: BackgroundTasks, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    if is_weak_password(payload.newPassword):
        raise AppError(ERROR_MESSAGES["AUTH"]["WEAK_PASSWORD"])
    uid = int(user_id)
    user = await repo.find_user_by_id(conn, uid)
    cur_pwd_h = user["password_hash"] if (user and user.get("password_hash")) else ""
    if not user or not cur_pwd_h or not verify_password(payload.currentPassword, cur_pwd_h):
        raise AppError(ERROR_MESSAGES["AUTH"]["CURRENT_PASSWORD_INCORRECT"])
    pwd_hash = hash_password(payload.newPassword)
    await repo.update_user_password(conn, uid, pwd_hash)
    await repo.revoke_all_user_refresh_tokens(conn, uid)
    clear_auth_cookies(response)
    u_name = user["name"] if user.get("name") else "there"
    bg.add_task(send_password_changed_email, user["email"], u_name)
    return {"success": True, "message": "Password changed. Please login again.", "code": "PASSWORD_CHANGED"}

@auth_router.post("/profile")
@auth_router.post("/update-profile")
async def update_profile(payload: UpdateProfileRequest, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    first = payload.firstName.strip() if payload.firstName else ""
    last = payload.lastName.strip() if payload.lastName else ""
    currency = (payload.preferred_currency if payload.preferred_currency else "USD").strip().upper()
    if len(first) < 2 or len(last) < 1:
        raise AppError(ERROR_MESSAGES["USER"]["INVALID_NAME"])
    if not re.match(r"^[A-Z]{3}$", currency):
        raise AppError(ERROR_MESSAGES["USER"]["INVALID_CURRENCY"])
    name = f"{first} {last}".strip()
    user = await repo.update_user_profile(conn, int(user_id), first, last, name, payload.phone, currency)
    if not user:
        raise AppError(ERROR_MESSAGES["USER"]["NOT_FOUND"])
    return {"success": True, "message": "Profile updated", "data": {"user": safe_user(user)}, "code": "PROFILE_UPDATED"}

@auth_router.delete("/delete-account")
async def delete_account(payload: DeleteAccountRequest, response: Response, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    uid = int(user_id)
    user = await repo.find_user_by_id(conn, uid)
    del_pwd_h = user["password_hash"] if (user and user.get("password_hash")) else ""
    if not user or not del_pwd_h or not verify_password(payload.password, del_pwd_h):
        raise AppError(ERROR_MESSAGES["AUTH"]["INVALID_CREDENTIALS"])
    await repo.soft_delete_user(conn, uid)
    clear_auth_cookies(response)
    return {"success": True, "message": "Account deleted successfully."}

@auth_router.get("/ws-token")
async def get_ws_token(user_id: Any = Depends(get_current_user_id)):
    return {"success": True, "token": sign_ws_token(user_id)}

@auth_router.get("/google")
async def google_login():
    try:
        state = generate_raw_token(24)
        auth_url = google_provider.get_auth_url(state)
        res = RedirectResponse(auth_url, status_code=302)
        res.set_cookie(key="googleOAuthState", value=state, max_age=600, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, domain=COOKIE_DOMAIN, path="/")
        return res
    except Exception:
        furl = os.getenv("FRONTEND_URL")
        frontend_url = furl.rstrip("/") if furl else "http://localhost:3000"
        return RedirectResponse(f"{frontend_url}/", status_code=302)

@auth_router.get("/google/callback")
async def google_callback(
    request: Request,
    bg: BackgroundTasks,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    conn: asyncpg.Connection = Depends(get_db)
):
    furl = os.getenv("FRONTEND_URL")
    frontend_url = furl.rstrip("/") if furl else "http://localhost:3000"
    err_res = RedirectResponse(f"{frontend_url}/", status_code=302)
    err_res.delete_cookie(key="googleOAuthState", path="/", domain=COOKIE_DOMAIN)
    err_res.delete_cookie(key="googleOAuthState", path="/api/v1/auth", domain=COOKIE_DOMAIN)
    if error or not code or not state:
        return err_res
    cookie_state = request.cookies.get("googleOAuthState")
    if not cookie_state or not hmac.compare_digest(str(cookie_state), str(state)):
        return err_res
    try:
        token_str = await google_provider.exchange_code(code)
        profile = await google_provider.fetch_profile(token_str)
        uid = await google_provider.upsert_user(conn, profile)
        jwt_access = sign_access_token(uid)
        raw_refresh = generate_refresh_token()
        refresh_expires = datetime.now(timezone.utc) + timedelta(days=30)
        await repo.save_refresh_token(conn, uid, hash_token(raw_refresh), refresh_expires)
        await repo.update_last_login(conn, uid)
        ip = request.client.host if request.client else "unknown"
        ua_h = request.headers.get("user-agent")
        ua = ua_h if ua_h else "unknown"
        bg.add_task(send_login_notification_email, profile["email"], profile["name"], ip, ua)
        res = RedirectResponse(f"{frontend_url}/dashboard", status_code=302)
        set_auth_cookies(res, jwt_access, raw_refresh, refresh_expires)
        res.delete_cookie(key="googleOAuthState", path="/", domain=COOKIE_DOMAIN)
        res.delete_cookie(key="googleOAuthState", path="/api/v1/auth", domain=COOKIE_DOMAIN)
        return res
    except Exception:
        return err_res

