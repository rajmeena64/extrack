CREATE TABLE IF NOT EXISTS mt5_connection_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public."user"("ID") ON DELETE CASCADE,
  login_id TEXT NOT NULL,
  broker_server TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mt5_connection_requests_status_check
    CHECK (status IN (
      'pending',
      'connecting',
      'creating_terminal',
      'launching_terminal',
      'applying_ea',
      'connected',
      'failed'
    ))
);

CREATE TABLE IF NOT EXISTS mt5_vps_jobs (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES mt5_connection_requests(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL DEFAULT 'CREATE_MT5_INSTANCE',
  status TEXT NOT NULL DEFAULT 'pending',
  instance_key TEXT NOT NULL UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mt5_vps_jobs_type_check
    CHECK (job_type IN ('CREATE_MT5_INSTANCE')),
  CONSTRAINT mt5_vps_jobs_status_check
    CHECK (status IN ('pending', 'claimed', 'running', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS mt5_accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public."user"("ID") ON DELETE CASCADE,
  login_id TEXT,
  broker_server TEXT,
  instance_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mt5_accounts_status_check
    CHECK (status IN ('connected', 'disconnected', 'failed'))
);

ALTER TABLE mt5_accounts
  ADD COLUMN IF NOT EXISTS login_id TEXT,
  ADD COLUMN IF NOT EXISTS broker_server TEXT,
  ADD COLUMN IF NOT EXISTS instance_key TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS broker_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS server_name TEXT,
  ADD COLUMN IF NOT EXISTS investor_password TEXT,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_currency TEXT,
  ADD COLUMN IF NOT EXISTS temporary_currency TEXT,
  ADD COLUMN IF NOT EXISTS last_connected TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS mt5_accounts_instance_key_idx
  ON mt5_accounts(instance_key)
  WHERE instance_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS mt5_connection_requests_user_created_idx
  ON mt5_connection_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mt5_vps_jobs_pending_idx
  ON mt5_vps_jobs(status, created_at)
  WHERE status = 'pending';
