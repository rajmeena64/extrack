CREATE SCHEMA IF NOT EXISTS system;

CREATE TABLE IF NOT EXISTS system.service_secrets (
  id TEXT PRIMARY KEY,
  current_secret TEXT NOT NULL,
  previous_secret TEXT,
  rotated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  previous_valid_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT service_secrets_expiry_check CHECK (expires_at > rotated_at)
);

REVOKE ALL ON TABLE system.service_secrets FROM PUBLIC;

