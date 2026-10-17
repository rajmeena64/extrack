CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS trading;

CREATE TABLE IF NOT EXISTS trading.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(40) NOT NULL,
  asset_class VARCHAR(40) NOT NULL,
  sub_category VARCHAR(50),
  product_type VARCHAR(40) NOT NULL,
  base_asset VARCHAR(20),
  quote_asset VARCHAR(20),
  profit_currency VARCHAR(20),
  quantity_type VARCHAR(30) NOT NULL,
  contract_size NUMERIC(24, 10),
  contract_unit VARCHAR(50),
  digits SMALLINT,
  tick_size NUMERIC(24, 12),
  pip_size NUMERIC(24, 12),
  min_quantity NUMERIC(24, 10),
  max_quantity NUMERIC(24, 10),
  quantity_step NUMERIC(24, 10),
  pnl_calculation_mode VARCHAR(50) NOT NULL,
  supports_pips BOOLEAN NOT NULL DEFAULT FALSE,
  icon VARCHAR(100),
  search_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (symbol = UPPER(symbol)),
  CHECK (category = 'forex_cfd'),
  CHECK (asset_class IN ('forex', 'metal', 'index', 'energy', 'agriculture', 'bond')),
  CHECK (product_type IN ('forex', 'cfd')),
  CHECK (quantity_type = 'lot'),
  CHECK (pnl_calculation_mode = 'price_difference_contract'),
  CHECK (contract_size IS NULL OR contract_size > 0),
  CHECK (tick_size IS NULL OR tick_size > 0),
  CHECK (pip_size IS NULL OR pip_size > 0),
  CHECK (min_quantity IS NULL OR min_quantity > 0),
  CHECK (quantity_step IS NULL OR quantity_step > 0),
  CHECK (max_quantity IS NULL OR min_quantity IS NULL OR max_quantity >= min_quantity)
);

CREATE INDEX IF NOT EXISTS instruments_filters_idx
  ON trading.instruments(category, asset_class, product_type, is_active, sort_order);
CREATE INDEX IF NOT EXISTS instruments_search_keywords_gin_idx
  ON trading.instruments USING GIN(search_keywords);

ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS instrument_id UUID REFERENCES trading.instruments(id);
CREATE INDEX IF NOT EXISTS trades_instrument_id_idx ON trading.trades(instrument_id);
