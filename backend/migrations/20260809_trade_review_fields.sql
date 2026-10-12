SET LOCAL lock_timeout = '5s';

ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS setup TEXT,
  ADD COLUMN IF NOT EXISTS mistakes TEXT,
  ADD COLUMN IF NOT EXISTS custom_tags TEXT;
