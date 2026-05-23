# Secure Auth Deployment Checklist

## Migration

1. Confirm these constraints/indexes exist:
   - `users_email_normalized_unique`
   - `pending_users.email_normalized` unique
   - `pending_users.verification_token_hash` unique
   - `refresh_tokens_token_hash_unique`
   - `password_reset_tokens.token_hash` unique
2. Confirm old users have `email_normalized`, `email_original`, `password_hash`, and `email_verified_at` backfilled.

## Environment

For local backend development, keep backend secrets in `backend/.env` only. Do not keep a second backend env file under `backend/server/.env`.

Production must use platform environment variables instead of checked-in `.env` files:

- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` as a strong random secret
- `FRONTEND_URL` with no trailing slash
- `ALLOWED_ORIGINS` as a comma-separated origin list
- `COOKIE_SECURE=true`
- a production email provider SMTP/API bridge, not a personal Gmail account

## Auth Flow Tests

1. Signup with a new email creates no row in `public."user"` and one row in `pending_users`.
2. Signup email contains `/verify-email?token=...`.
3. Verification creates the real user, sets `email_verified_at`, and deletes the pending row.
4. Expired verification token returns `TOKEN_EXPIRED`.
5. Duplicate active pending signup returns `PENDING_VERIFICATION`.
6. Duplicate registered signup returns `EMAIL_REGISTERED`.
7. Login before verification fails with `EMAIL_NOT_VERIFIED`.
8. Login with wrong email or password returns only `Invalid email or password`.
9. Login sets HttpOnly `accessToken` and `refreshToken` cookies.
10. `/api/auth/refresh-token` rotates the refresh token and revokes the old row.
11. Reusing a revoked refresh token revokes active sessions for that user.
12. Logout revokes the current refresh token and clears cookies.
13. Forgot password always returns the same generic success message.
14. Reset password marks the reset token used and revokes sessions.
15. Change password requires current password and revokes sessions.
16. `/api/auth/me` returns no password hash, tokens, or secret fields.

## Security Decisions

- Real accounts are not created until email verification succeeds.
- Raw verification, reset, and refresh tokens are never stored in the database; only SHA-256 hashes are stored.
- Passwords are hashed with bcrypt cost 12.
- Refresh tokens are HttpOnly cookies and rotate on every refresh.
- Access tokens are short-lived and also stored in HttpOnly cookies for existing route compatibility.
- Email and mobile values are normalized before storage.
- Login and forgot-password responses avoid account enumeration.
- Auth records can be cleaned with:

```sql
DELETE FROM pending_users WHERE verification_expires_at <= NOW();
DELETE FROM password_reset_tokens WHERE expires_at <= NOW() OR used_at IS NOT NULL;
DELETE FROM refresh_tokens WHERE expires_at <= NOW() OR revoked_at IS NOT NULL;
```
