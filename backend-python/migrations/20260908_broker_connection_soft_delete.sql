ALTER TABLE broker_connections.user_broker_connections
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

UPDATE broker_connections.user_broker_connections
SET deleted_at = COALESCE(
  NULLIF(metadata->'binanceRetention'->>'deletedAt', '')::timestamptz,
  updated_at,
  NOW()
)
WHERE metadata ? 'binanceRetention'
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS user_broker_connections_active_idx
  ON broker_connections.user_broker_connections(user_id)
  WHERE deleted_at IS NULL;
