ALTER TABLE trading.manual_trades
  ADD COLUMN IF NOT EXISTS exchange_id text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS quantity_unit text,
  ADD COLUMN IF NOT EXISTS entry_time timestamptz,
  ADD COLUMN IF NOT EXISTS exit_time timestamptz,
  ADD COLUMN IF NOT EXISTS gross_pnl numeric,
  ADD COLUMN IF NOT EXISTS net_pnl numeric,
  ADD COLUMN IF NOT EXISTS final_pnl numeric,
  ADD COLUMN IF NOT EXISTS pnl_currency text,
  ADD COLUMN IF NOT EXISTS pnl_source text,
  ADD COLUMN IF NOT EXISTS product_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS charges jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE trading.manual_trades
SET product_type = COALESCE(product_type, CASE category WHEN 'stocks' THEN 'stock' WHEN 'crypto' THEN 'crypto_spot' WHEN 'forex' THEN 'forex' ELSE 'cfd' END),
    final_pnl = COALESCE(final_pnl, pnl), net_pnl = COALESCE(net_pnl, pnl), pnl_source = COALESCE(pnl_source, 'user_provided'),
    entry_time = COALESCE(entry_time, timestamp), exit_time = COALESCE(exit_time, timestamp)
WHERE product_type IS NULL OR final_pnl IS NULL;
