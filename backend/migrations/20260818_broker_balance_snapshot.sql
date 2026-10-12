ALTER TABLE broker_connections.user_broker_connections
  ADD COLUMN IF NOT EXISTS balance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS balance_updated_at TIMESTAMPTZ;

ALTER TABLE broker_connections.user_broker_connections
  DROP CONSTRAINT IF EXISTS user_broker_connections_balance_snapshot_object_check;

ALTER TABLE broker_connections.user_broker_connections
  ADD CONSTRAINT user_broker_connections_balance_snapshot_object_check
  CHECK (jsonb_typeof(balance_snapshot) = 'object');

COMMENT ON COLUMN broker_connections.user_broker_connections.balance_snapshot IS
  'Latest sanitized balances keyed by provider account or market. Updated in place; not a balance-history ledger.';
