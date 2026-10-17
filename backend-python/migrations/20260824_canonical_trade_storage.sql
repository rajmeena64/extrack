SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS trading.trade_market_details (
  trade_id BIGINT PRIMARY KEY REFERENCES trading.trades(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_market_details_object_check CHECK (jsonb_typeof(details) = 'object')
);

CREATE INDEX IF NOT EXISTS trade_market_details_product_type_idx
  ON trading.trade_market_details(product_type);

CREATE TABLE IF NOT EXISTS trading.trade_calculations (
  trade_id BIGINT PRIMARY KEY REFERENCES trading.trades(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trade_calculations_snapshot_object_check CHECK (jsonb_typeof(snapshot) = 'object')
);

ALTER TABLE trading.journal_entries
  ADD COLUMN IF NOT EXISTS setup TEXT,
  ADD COLUMN IF NOT EXISTS mistakes TEXT,
  ADD COLUMN IF NOT EXISTS custom_tags TEXT,
  ADD COLUMN IF NOT EXISTS execution_score SMALLINT,
  ADD COLUMN IF NOT EXISTS review_summary TEXT,
  ADD COLUMN IF NOT EXISTS is_breakeven BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_execution_score_check'
      AND conrelid = 'trading.journal_entries'::regclass
  ) THEN
    ALTER TABLE trading.journal_entries
      ADD CONSTRAINT journal_entries_execution_score_check
      CHECK (execution_score IS NULL OR execution_score BETWEEN 0 AND 100);
  END IF;
END $$;

INSERT INTO trading.trade_market_details (trade_id, product_type, details)
SELECT id, product_type, product_details
FROM trading.trades
WHERE product_type IS NOT NULL
  AND product_details IS NOT NULL
  AND product_details <> '{}'::jsonb
ON CONFLICT (trade_id) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  details = trading.trade_market_details.details || EXCLUDED.details,
  updated_at = NOW();

INSERT INTO trading.trade_calculations (trade_id, snapshot)
SELECT id, calculation_snapshot
FROM trading.trades
WHERE calculation_snapshot IS NOT NULL
  AND calculation_snapshot <> '{}'::jsonb
ON CONFLICT (trade_id) DO UPDATE SET
  snapshot = EXCLUDED.snapshot,
  updated_at = NOW();

INSERT INTO trading.journal_entries (
  user_id, trade_id, setup, mistakes, custom_tags, execution_score, review_summary
)
SELECT user_id, id, setup, mistakes, custom_tags, execution_score, review_summary
FROM trading.trades
WHERE setup IS NOT NULL OR mistakes IS NOT NULL OR custom_tags IS NOT NULL
  OR execution_score IS NOT NULL OR review_summary IS NOT NULL
ON CONFLICT (user_id, trade_id) WHERE trade_id IS NOT NULL DO UPDATE SET
  setup = COALESCE(trading.journal_entries.setup, EXCLUDED.setup),
  mistakes = COALESCE(trading.journal_entries.mistakes, EXCLUDED.mistakes),
  custom_tags = COALESCE(trading.journal_entries.custom_tags, EXCLUDED.custom_tags),
  execution_score = COALESCE(trading.journal_entries.execution_score, EXCLUDED.execution_score),
  review_summary = COALESCE(trading.journal_entries.review_summary, EXCLUDED.review_summary),
  updated_at = NOW();

INSERT INTO trading.journal_entries (user_id, journal_date, is_breakeven)
SELECT user_id, entry_timestamp::date, BOOL_OR(is_breakeven)
FROM trading.trades
WHERE entry_timestamp IS NOT NULL
GROUP BY user_id, entry_timestamp::date
ON CONFLICT (user_id, journal_date) WHERE journal_date IS NOT NULL DO UPDATE SET
  is_breakeven = EXCLUDED.is_breakeven,
  updated_at = NOW();

UPDATE trading.trades
SET custom_fields = custom_fields || JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
      'legacySymbolPath', symbol_path,
      'legacySymbolDescription', symbol_description
    ))
WHERE symbol_path IS NOT NULL OR symbol_description IS NOT NULL;

UPDATE trading.trades
SET side = COALESCE(side, CASE LOWER(BTRIM(trade_type))
      WHEN 'buy' THEN 'buy'
      WHEN 'sell' THEN 'sell'
    END),
    entry_price = COALESCE(entry_price, price),
    net_pnl = CASE
      WHEN status = 'open' AND gross_pnl IS NULL AND net_pnl IS NULL AND final_pnl IS NULL THEN NULL
      ELSE COALESCE(final_pnl, net_pnl, pnl)
    END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM trading.trades WHERE side IS NULL) THEN
    RAISE EXCEPTION 'canonical trade migration found rows without side';
  END IF;
  IF EXISTS (SELECT 1 FROM trading.trades WHERE entry_price IS NULL) THEN
    RAISE EXCEPTION 'canonical trade migration found rows without entry price';
  END IF;
  IF EXISTS (
    SELECT 1 FROM trading.trades
    WHERE trade_type IS NOT NULL AND LOWER(BTRIM(trade_type)) <> side
  ) THEN
    RAISE EXCEPTION 'canonical trade migration found conflicting trade side aliases';
  END IF;
  IF EXISTS (
    SELECT 1 FROM trading.trades
    WHERE price IS NOT NULL AND price <> entry_price
  ) THEN
    RAISE EXCEPTION 'canonical trade migration found conflicting entry price aliases';
  END IF;
END $$;

ALTER TABLE trading.trades
  ALTER COLUMN side SET NOT NULL,
  ALTER COLUMN entry_price SET NOT NULL,
  DROP COLUMN IF EXISTS legacy_id,
  DROP COLUMN IF EXISTS trade_type,
  DROP COLUMN IF EXISTS position_direction,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS pnl,
  DROP COLUMN IF EXISTS final_pnl,
  DROP COLUMN IF EXISTS product_details,
  DROP COLUMN IF EXISTS calculation_snapshot,
  DROP COLUMN IF EXISTS symbol_path,
  DROP COLUMN IF EXISTS symbol_description,
  DROP COLUMN IF EXISTS setup,
  DROP COLUMN IF EXISTS mistakes,
  DROP COLUMN IF EXISTS custom_tags,
  DROP COLUMN IF EXISTS execution_score,
  DROP COLUMN IF EXISTS review_summary,
  DROP COLUMN IF EXISTS is_breakeven;
