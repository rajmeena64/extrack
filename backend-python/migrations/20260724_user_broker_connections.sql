CREATE TABLE IF NOT EXISTS trading.user_broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES app_auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES trading.broker_integrations(id) ON DELETE RESTRICT,
  external_account_id VARCHAR(180),
  account_name VARCHAR(150),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  last_sync_status VARCHAR(30),
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_broker_connections_status_check CHECK (
    status IN ('pending', 'connected', 'disconnected', 'error', 'revoked')
  ),
  CONSTRAINT user_broker_connections_sync_status_check CHECK (
    last_sync_status IS NULL OR last_sync_status IN ('pending', 'running', 'success', 'failed')
  ),
  CONSTRAINT user_broker_connections_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS user_broker_connections_account_unique_idx
  ON trading.user_broker_connections (
    user_id,
    integration_id,
    COALESCE(NULLIF(LOWER(BTRIM(external_account_id)), ''), '__default__')
  );

CREATE INDEX IF NOT EXISTS user_broker_connections_user_created_idx
  ON trading.user_broker_connections(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_broker_connections_integration_idx
  ON trading.user_broker_connections(integration_id);

COMMENT ON TABLE trading.user_broker_connections IS
  'User-owned broker/platform connections. Credentials remain in connector-specific encrypted stores and must not be placed in metadata.';

