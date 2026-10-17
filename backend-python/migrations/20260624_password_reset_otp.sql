ALTER TABLE app_auth.password_resets
  ALTER COLUMN token_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS otp_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS password_resets_otp_hash_unique
  ON app_auth.password_resets(otp_hash)
  WHERE otp_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS password_resets_user_active_idx
  ON app_auth.password_resets(user_id, created_at DESC)
  WHERE used_at IS NULL;
