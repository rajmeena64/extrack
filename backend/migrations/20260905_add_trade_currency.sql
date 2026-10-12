-- Add independent currency column to trading.trades
ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- Backfill existing trade rows using pnl_currency or default USD
UPDATE trading.trades
SET currency = COALESCE(currency, pnl_currency, 'USD')
WHERE currency IS NULL;
