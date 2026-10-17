DROP TABLE IF EXISTS app_auth.mobile_verifications;
DROP TABLE IF EXISTS app_auth.mobile_signup_otps;

ALTER TABLE app_auth.users
  DROP COLUMN IF EXISTS phone_verified;
