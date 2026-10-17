ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS entry_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_timestamp TIMESTAMPTZ;

UPDATE trading.trades
SET entry_timestamp = COALESCE(
      entry_timestamp,
      entry_time,
      timestamp,
      CASE WHEN open_timestamp IS NULL THEN NULL ELSE TO_TIMESTAMP(CASE WHEN open_timestamp > 1000000000000 THEN open_timestamp / 1000.0 ELSE open_timestamp END) END,
      created_at
    ),
    exit_timestamp = COALESCE(
      exit_timestamp,
      exit_time,
      CASE WHEN close_timestamp IS NULL THEN NULL ELSE TO_TIMESTAMP(CASE WHEN close_timestamp > 1000000000000 THEN close_timestamp / 1000.0 ELSE close_timestamp END) END,
      entry_time,
      timestamp,
      CASE WHEN open_timestamp IS NULL THEN NULL ELSE TO_TIMESTAMP(CASE WHEN open_timestamp > 1000000000000 THEN open_timestamp / 1000.0 ELSE open_timestamp END) END,
      created_at
    );

ALTER TABLE trading.trades
  ALTER COLUMN entry_timestamp SET NOT NULL,
  ALTER COLUMN exit_timestamp SET NOT NULL;

DROP INDEX IF EXISTS trading.trades_user_timestamp_idx;

ALTER TABLE trading.trades
  DROP COLUMN IF EXISTS timestamp,
  DROP COLUMN IF EXISTS entry_time,
  DROP COLUMN IF EXISTS exit_time,
  DROP COLUMN IF EXISTS open_timestamp,
  DROP COLUMN IF EXISTS close_timestamp;

CREATE INDEX IF NOT EXISTS trades_user_entry_timestamp_idx
  ON trading.trades(user_id, entry_timestamp DESC);
CREATE INDEX IF NOT EXISTS trades_user_exit_timestamp_idx
  ON trading.trades(user_id, exit_timestamp DESC);

UPDATE trading_catalog.platforms
SET normalization_config = JSONB_SET(
  JSONB_SET(
    (normalization_config - 'fieldMapping') || JSONB_BUILD_OBJECT(
      'fieldMapping', ((normalization_config -> 'fieldMapping') - 'exit_time') || '{"exit_timestamp":"executionTimestamp","entry_timestamp":"positionEntryTimestamp"}'::jsonb
    ),
    '{transforms}', ((normalization_config -> 'transforms') - 'exit_time') || '{"exit_timestamp":"integer","entry_timestamp":"integer"}'::jsonb
  ),
  '{requiredFields}',
  '["unique_id","symbol","trade_type","quantity","price","exit_price","entry_timestamp","exit_timestamp"]'::jsonb
), updated_at = NOW()
WHERE slug = 'ctrader';
