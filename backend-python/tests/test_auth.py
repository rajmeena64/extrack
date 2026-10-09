import sys
import unittest
import jwt
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from core.errors.app_error import AppError
from domains.auth.routes import is_weak_password
from domains.auth.schemas import SignupRequest, LoginRequest
from domains.auth.service import (
    hash_password, verify_password,
    sign_access_token, verify_access_token,
    sign_ws_token, verify_ws_token,
    hash_otp, verify_otp,
    generate_refresh_token, hash_token,
    safe_user, split_name
)
from pydantic import ValidationError

class TestAuthService(unittest.TestCase):
    def test_password_hashing(self):
        pwd = "TraderPassword#2026!"
        h = hash_password(pwd)
        self.assertNotEqual(pwd, h)
        self.assertTrue(verify_password(pwd, h))
        self.assertFalse(verify_password("WrongPass#2026!", h))
        self.assertFalse(verify_password("", h))
        self.assertFalse(verify_password(pwd, ""))

    def test_weak_password(self):
        self.assertTrue(is_weak_password("short"))
        self.assertTrue(is_weak_password("password1234"))
        self.assertTrue(is_weak_password("1234567890123"))
        self.assertTrue(is_weak_password("abcdefghijklm"))
        self.assertFalse(is_weak_password("Trader#Key2026!Pro"))

    def test_jwt_access_token_flow(self):
        uid = 42
        token = sign_access_token(uid)
        decoded = verify_access_token(token)
        self.assertEqual(decoded["userId"], 42)
        self.assertEqual(decoded["sub"], "42")
        self.assertEqual(decoded["typ"], "access")
        with self.assertRaises((jwt.PyJWTError, AppError)):
            verify_access_token(token + "invalid")

    def test_ws_token_flow(self):
        uid = 88
        ws_tok = sign_ws_token(uid)
        decoded = verify_ws_token(ws_tok)
        self.assertEqual(decoded["userId"], 88)
        self.assertEqual(decoded["purpose"], "websocket")
        acc_tok = sign_access_token(uid)
        with self.assertRaises((jwt.PyJWTError, AppError)):
            verify_ws_token(acc_tok)

    def test_otp_hashing(self):
        otp = "683921"
        h = hash_otp(otp)
        self.assertTrue(verify_otp(otp, h))
        self.assertFalse(verify_otp("111111", h))
        self.assertFalse(verify_otp("", h))

    def test_refresh_token_generation(self):
        t1 = generate_refresh_token()
        t2 = generate_refresh_token()
        self.assertNotEqual(t1, t2)
        self.assertGreaterEqual(len(t1), 32)
        h = hash_token(t1)
        self.assertEqual(len(h), 64)

    def test_safe_user_strips_credentials(self):
        raw = {
            "id": 10,
            "name": "Arjun Sharma",
            "email": "arjun@example.com",
            "password_hash": "$2b$12$secretsaltandhash",
            "password": "legacy_plaintext"
        }
        cleaned = safe_user(raw)
        self.assertNotIn("password_hash", cleaned)
        self.assertNotIn("password", cleaned)
        self.assertEqual(cleaned["id"], 10)
        self.assertEqual(cleaned["email"], "arjun@example.com")

    def test_split_name(self):
        f, l = split_name("Arjun Sharma")
        self.assertEqual(f, "Arjun")
        self.assertEqual(l, "Sharma")
        f_single, l_single = split_name("SingleName")
        self.assertEqual(f_single, "SingleName")
        self.assertEqual(l_single, "")

    def test_schema_validations(self):
        req = SignupRequest(email="  Trader@Entrack.IN  ", password="ValidPass1234!")
        self.assertEqual(req.email, "trader@entrack.in")
        with self.assertRaises(ValidationError):
            SignupRequest(email="invalid-email", password="ValidPass1234!")
        with self.assertRaises(ValidationError):
            SignupRequest(email="test@example.com", password="")
        with self.assertRaises(ValidationError):
            LoginRequest(email="bad-email", password="ValidPass1234!")

class TestAuthLifecycleEndToEnd(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        import httpx, time
        from app import app
        from infra.db.postgres import init_db
        from infra.db.redis import get_redis
        self.httpx = httpx
        self.pool = await init_db()
        self.redis = get_redis()
        await self.redis.delete("rl:/api/v1/auth/signup:127.0.0.1", "rl:/api/v1/auth/login:127.0.0.1", "rl:/api/v1/auth/signup:testclient", "rl:/api/v1/auth/login:testclient")
        self.transport = httpx.ASGITransport(app=app)
        self.ts = int(time.time() * 1000)
        self.email = f"audit_trader_{self.ts}@entrack-test.com"
        self.password = "ValidAuditPass#2026!"
        self.name = "Audit Trader"
        self.mobile = "+919876543210"

    async def asyncTearDown(self):
        await self.pool.execute("DELETE FROM app_auth.refresh_tokens WHERE user_id IN (SELECT id FROM app_auth.users WHERE email_normalized = $1)", self.email)
        await self.pool.execute("DELETE FROM app_auth.users WHERE email_normalized = $1", self.email)
        await self.pool.execute("DELETE FROM app_auth.email_verifications WHERE email_normalized = $1", self.email)
        await self.redis.delete("rl:/api/v1/auth/signup:127.0.0.1", "rl:/api/v1/auth/login:127.0.0.1", "rl:/api/v1/auth/signup:testclient", "rl:/api/v1/auth/login:testclient", f"rl:/api/v1/auth/signup:ident:{self.email}", f"rl:/api/v1/auth/login:ident:{self.email}")

    async def test_complete_auth_lifecycle(self):
        async with self.httpx.AsyncClient(transport=self.transport, base_url="http://test") as client:
            signup_res = await client.post("/api/v1/auth/signup", json={"email": self.email})
            self.assertEqual(signup_res.status_code, 200)
            self.assertEqual(signup_res.json().get("code"), "VERIFICATION_SENT")

            pending = await self.pool.fetchrow("SELECT * FROM app_auth.email_verifications WHERE email_normalized = $1", self.email)
            self.assertIsNotNone(pending)
            self.assertEqual(pending["password_hash"], "PENDING_SETUP")
            remaining_sec = (pending["verification_expires_at"] - datetime.now(timezone.utc)).total_seconds()
            self.assertGreater(remaining_sec, 800)
            self.assertLessEqual(remaining_sec, 905)
            user_pre = await self.pool.fetchrow("SELECT * FROM app_auth.users WHERE email_normalized = $1", self.email)
            self.assertIsNone(user_pre)

            early_login = await client.post("/api/v1/auth/login", json={"email": self.email, "password": self.password})
            self.assertEqual(early_login.status_code, 403)
            self.assertEqual(early_login.json().get("code"), "EMAIL_NOT_VERIFIED")

            raw_tok = f"rawtoken{self.ts}123456789012345678"
            await self.pool.execute("UPDATE app_auth.email_verifications SET verification_token_hash = $1 WHERE email_normalized = $2", hash_token(raw_tok), self.email)

            complete_res = await client.post("/api/v1/auth/complete-registration", json={
                "token": raw_tok, "password": self.password
            })
            self.assertEqual(complete_res.status_code, 200)
            self.assertEqual(complete_res.json().get("code"), "REGISTRATION_COMPLETED")

            deleted_pending = await self.pool.fetchrow("SELECT * FROM app_auth.email_verifications WHERE email_normalized = $1", self.email)
            self.assertIsNone(deleted_pending)

            user_db = await self.pool.fetchrow("SELECT * FROM app_auth.users WHERE email_normalized = $1", self.email)
            self.assertIsNotNone(user_db)
            self.assertIsNotNone(user_db["email_verified_at"])
            self.assertTrue(user_db["password_hash"].startswith("$2b$"))
            self.assertNotIn(self.password, user_db["password_hash"])

            login_res = await client.post("/api/v1/auth/login", json={"email": self.email, "password": self.password})
            self.assertEqual(login_res.status_code, 200)
            login_data = login_res.json()
            self.assertEqual(login_data.get("code"), "LOGIN_SUCCESS")

            ret_user = login_data["data"]["user"]
            self.assertEqual(ret_user["email"], self.email)
            self.assertNotIn("password_hash", ret_user)
            self.assertNotIn("password", ret_user)
            self.assertIn("accessToken", login_data["data"])

            access_cookie = login_res.cookies.get("accessToken")
            refresh_cookie = login_res.cookies.get("refreshToken")
            self.assertIsNotNone(access_cookie)
            self.assertIsNotNone(refresh_cookie)

            session_row = await self.pool.fetchrow(
                "SELECT * FROM app_auth.refresh_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1", user_db["id"]
            )
            self.assertIsNotNone(session_row)
            self.assertIsNotNone(session_row["token_hash"])
            self.assertIsNone(session_row["revoked_at"])

            me_res = await client.get("/api/v1/auth/me")
            self.assertEqual(me_res.status_code, 200)
            self.assertEqual(me_res.json()["data"]["user"]["email"], self.email)

            client.cookies.clear()
            unauth_res = await client.get("/api/v1/auth/me")
            self.assertEqual(unauth_res.status_code, 401)

            client.cookies.set("refreshToken", refresh_cookie)
            refresh_res = await client.post("/api/v1/auth/refresh-token")
            self.assertEqual(refresh_res.status_code, 200)
            self.assertEqual(refresh_res.json().get("code"), "TOKEN_REFRESHED")
            new_refresh_cookie = refresh_res.cookies.get("refreshToken")
            self.assertIsNotNone(new_refresh_cookie)

            old_session = await self.pool.fetchrow("SELECT * FROM app_auth.refresh_tokens WHERE id = $1", session_row["id"])
            self.assertIsNotNone(old_session["revoked_at"])

            client.cookies.set("refreshToken", new_refresh_cookie)
            logout_res = await client.post("/api/v1/auth/logout")
            self.assertEqual(logout_res.status_code, 200)
            self.assertEqual(logout_res.json().get("code"), "LOGOUT_SUCCESS")

            current_session = await self.pool.fetchrow("SELECT * FROM app_auth.refresh_tokens WHERE token_hash = $1", hash_token(new_refresh_cookie))
            self.assertIsNotNone(current_session["revoked_at"])

if __name__ == "__main__":
    unittest.main()
