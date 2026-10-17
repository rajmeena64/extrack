SET LOCAL lock_timeout = '5s';

ALTER TABLE trading.trades
  ADD COLUMN IF NOT EXISTS stop_loss NUMERIC,
  ADD COLUMN IF NOT EXISTS take_profit NUMERIC;

WITH instrument_matches AS (
  SELECT DISTINCT ON (trade.id)
    trade.id,
    instrument.id AS instrument_id,
    COALESCE(NULLIF(instrument.asset_class, ''), NULLIF(instrument.category, '')) AS category
  FROM trading.trades trade
  JOIN trading_catalog.instruments instrument ON instrument.is_active = TRUE AND (
    UPPER(REGEXP_REPLACE(instrument.symbol, '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(trade.symbol, '[^A-Z0-9]', '', 'g'))
    OR UPPER(REGEXP_REPLACE(instrument.source_symbol, '[^A-Z0-9]', '', 'g')) = UPPER(REGEXP_REPLACE(trade.symbol, '[^A-Z0-9]', '', 'g'))
  )
  ORDER BY trade.id, instrument.sort_order, instrument.id
)
UPDATE trading.trades trade
SET instrument_id = COALESCE(trade.instrument_id, match.instrument_id),
    category = COALESCE(match.category, NULLIF(BTRIM(trade.category), ''), 'other')
FROM instrument_matches match
WHERE match.id = trade.id;

UPDATE trading.trades
SET unique_id = CASE
      WHEN ticket IS NOT NULL THEN COALESCE(NULLIF(LOWER(platform), ''), 'trade') || ':'
        || COALESCE(account_id::text, user_id::text) || ':' || ticket::text
      ELSE 'trade:' || user_id::text || ':' || id::text
    END,
    category = COALESCE(NULLIF(BTRIM(category), ''), 'other')
WHERE unique_id IS NULL OR BTRIM(unique_id) = '' OR category IS NULL OR BTRIM(category) = '';

DROP INDEX IF EXISTS trading.trades_sync_ticket_unique;
ALTER TABLE trading.trades
  ALTER COLUMN unique_id SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  DROP COLUMN IF EXISTS ticket;

DROP INDEX IF EXISTS trading.trades_user_unique_id_unique;
CREATE UNIQUE INDEX trades_user_unique_id_unique ON trading.trades(user_id, unique_id);

UPDATE trading_catalog.platforms
SET normalization_config = JSONB_SET(
  JSONB_SET(
    normalization_config || '{"derivePercentChange":true}'::jsonb,
    '{fieldMapping}',
    COALESCE(normalization_config -> 'fieldMapping', '{}'::jsonb)
      || '{"category":"symbolCategoryName","stop_loss":"stopLoss","take_profit":"takeProfit"}'::jsonb
  ),
  '{transforms}',
  COALESCE(normalization_config -> 'transforms', '{}'::jsonb)
    || '{"category":"string","stop_loss":"number","take_profit":"number"}'::jsonb
), updated_at = NOW()
WHERE slug = 'ctrader';
