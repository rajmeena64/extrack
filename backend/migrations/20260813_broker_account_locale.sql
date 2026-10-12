ALTER TABLE broker_connections.user_broker_connections
  ADD COLUMN IF NOT EXISTS account_currency VARCHAR(16),
  ADD COLUMN IF NOT EXISTS time_zone VARCHAR(64);

COMMENT ON COLUMN broker_connections.user_broker_connections.account_currency IS
  'Broker account deposit currency reported by the connected provider.';

COMMENT ON COLUMN broker_connections.user_broker_connections.time_zone IS
  'Timezone used to interpret provider timestamps. cTrader Open API timestamps are UTC.';
