ALTER TABLE broker_connections.oauth_states
  ADD COLUMN IF NOT EXISTS connection_id UUID
  REFERENCES broker_connections.user_broker_connections(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS broker_connections.user_broker_connections_account_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS user_broker_connections_account_unique_idx
  ON broker_connections.user_broker_connections (
    user_id,
    integration_id,
    LOWER(BTRIM(external_account_id))
  )
  WHERE NULLIF(BTRIM(external_account_id), '') IS NOT NULL;

COMMENT ON COLUMN broker_connections.oauth_states.connection_id IS
  'Saved user connection that initiated this one-time OAuth flow.';
