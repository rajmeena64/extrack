SET LOCAL lock_timeout = '5s';

ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS execution_score SMALLINT
  CHECK (execution_score BETWEEN 0 AND 100);
