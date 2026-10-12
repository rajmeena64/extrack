CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS trading;

CREATE TABLE IF NOT EXISTS trading.brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL UNIQUE,
  logo_path TEXT,
  supported_instruments TEXT[] NOT NULL DEFAULT '{}',
  supported_platforms TEXT[] NOT NULL DEFAULT '{}',
  supported_trade_methods TEXT[] NOT NULL DEFAULT '{}',
  import_field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(import_field_mapping) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS brokers_name_lower_unique_idx ON trading.brokers(LOWER(name));
CREATE INDEX IF NOT EXISTS brokers_active_sort_idx ON trading.brokers(is_active, sort_order, name);
