ALTER TABLE trading.instruments
  ADD COLUMN IF NOT EXISTS market_source VARCHAR(30) NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS source_symbol VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

UPDATE trading.instruments
SET source_symbol = COALESCE(source_symbol, symbol), market_source = COALESCE(market_source, 'seed')
WHERE source_symbol IS NULL;

ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_category_check;
ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_asset_class_check;
ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_product_type_check;
ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_quantity_type_check;
ALTER TABLE trading.instruments DROP CONSTRAINT IF EXISTS instruments_pnl_calculation_mode_check;

ALTER TABLE trading.instruments
  ADD CONSTRAINT instruments_category_check CHECK (category IN ('forex_cfd', 'crypto')),
  ADD CONSTRAINT instruments_asset_class_check CHECK (asset_class IN ('forex', 'metal', 'index', 'energy', 'agriculture', 'bond', 'crypto', 'other')),
  ADD CONSTRAINT instruments_product_type_check CHECK (product_type IN ('forex', 'cfd', 'crypto_spot', 'perpetual')),
  ADD CONSTRAINT instruments_quantity_type_check CHECK (quantity_type IN ('lot', 'unit')),
  ADD CONSTRAINT instruments_pnl_calculation_mode_check CHECK (pnl_calculation_mode IN ('price_difference_contract', 'price_difference_quantity'));

CREATE INDEX IF NOT EXISTS instruments_market_source_idx ON trading.instruments(market_source, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS instruments_source_symbol_unique
  ON trading.instruments(market_source, source_symbol);
