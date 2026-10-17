SET LOCAL lock_timeout = '5s';

ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS review_summary TEXT;
