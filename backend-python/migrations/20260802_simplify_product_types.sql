-- Migration: Simplify product_type across instruments and trades
-- Allowed product_types: 'stock_etf', 'crypto', 'forex_cfd', 'option', 'future', 'bond'

BEGIN;

-- 1. Update trading_catalog.instruments
ALTER TABLE trading_catalog.instruments DROP CONSTRAINT IF EXISTS instruments_product_type_check;

UPDATE trading_catalog.instruments
SET product_type = CASE
  WHEN product_type IN ('crypto_spot', 'perpetual', 'crypto') OR category = 'crypto' OR asset_class = 'crypto' THEN 'crypto'
  WHEN product_type IN ('forex', 'cfd', 'forex_cfd') OR category IN ('forex', 'forex_cfd', 'metals') OR asset_class IN ('forex', 'metal', 'energy', 'index') THEN 'forex_cfd'
  WHEN product_type IN ('stock', 'equity', 'stock_etf') OR category IN ('stocks', 'equity') THEN 'stock_etf'
  WHEN product_type IN ('futures', 'future') THEN 'future'
  WHEN product_type = 'option' THEN 'option'
  WHEN product_type = 'bond' THEN 'bond'
  ELSE 'forex_cfd'
END;

ALTER TABLE trading_catalog.instruments
  ADD CONSTRAINT instruments_product_type_check
  CHECK (product_type IN ('stock_etf', 'crypto', 'forex_cfd', 'option', 'future', 'bond'));

-- 2. Update trading.trades
UPDATE trading.trades
SET product_type = CASE
  WHEN product_type IN ('crypto_spot', 'perpetual', 'crypto') OR category = 'crypto' THEN 'crypto'
  WHEN product_type IN ('forex', 'cfd', 'forex_cfd') OR category IN ('forex', 'forex_cfd', 'metals') THEN 'forex_cfd'
  WHEN product_type IN ('stock', 'equity', 'stock_etf') OR category IN ('stocks', 'equity') THEN 'stock_etf'
  WHEN product_type IN ('futures', 'future') THEN 'future'
  WHEN product_type = 'option' THEN 'option'
  WHEN product_type = 'bond' THEN 'bond'
  ELSE 'forex_cfd'
END
WHERE product_type IS NOT NULL;

-- 3. Update trading.manual_trades if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'trading' AND table_name = 'manual_trades' AND column_name = 'product_type'
  ) THEN
    UPDATE trading.manual_trades
    SET product_type = CASE
      WHEN product_type IN ('crypto_spot', 'perpetual', 'crypto') OR category = 'crypto' THEN 'crypto'
      WHEN product_type IN ('forex', 'cfd', 'forex_cfd') OR category IN ('forex', 'forex_cfd', 'metals') THEN 'forex_cfd'
      WHEN product_type IN ('stock', 'equity', 'stock_etf') OR category IN ('stocks', 'equity') THEN 'stock_etf'
      WHEN product_type IN ('futures', 'future') THEN 'future'
      WHEN product_type = 'option' THEN 'option'
      WHEN product_type = 'bond' THEN 'bond'
      ELSE 'forex_cfd'
    END
    WHERE product_type IS NOT NULL;
  END IF;
END $$;

COMMIT;
