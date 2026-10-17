-- Migration: Update internal category in trading_catalog.instruments for exact API/stream data routing
-- Categories: 'spot', 'perpetual', 'future', 'forex', 'cfd', 'stock', 'option', 'bond'

BEGIN;

ALTER TABLE trading_catalog.instruments DROP CONSTRAINT IF EXISTS instruments_category_check;

UPDATE trading_catalog.instruments
SET category = CASE
  WHEN product_type = 'crypto' AND (source_symbol LIKE '%PERP%' OR name ILIKE '%perpetual%' OR description ILIKE '%perpetual%') THEN 'perpetual'
  WHEN product_type = 'crypto' AND (source_symbol ~ '[0-9]{4}$' OR description ILIKE '%future%') THEN 'future'
  WHEN product_type = 'crypto' THEN 'spot'
  WHEN product_type = 'forex_cfd' AND asset_class = 'forex' THEN 'forex'
  WHEN product_type = 'forex_cfd' THEN 'cfd'
  WHEN product_type = 'stock_etf' THEN 'stock'
  WHEN product_type = 'future' THEN 'future'
  WHEN product_type = 'option' THEN 'option'
  WHEN product_type = 'bond' THEN 'bond'
  ELSE COALESCE(category, 'spot')
END;

ALTER TABLE trading_catalog.instruments
  ADD CONSTRAINT instruments_category_check
  CHECK (category IN ('spot', 'perpetual', 'future', 'forex', 'cfd', 'stock', 'option', 'bond', 'crypto', 'metals', 'energy', 'index', 'forex_cfd', 'stocks'));

COMMIT;
