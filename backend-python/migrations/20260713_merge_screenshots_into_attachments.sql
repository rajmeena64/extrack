DO $$
DECLARE
  trade_row RECORD;
  parsed JSONB;
BEGIN
  FOR trade_row IN SELECT id, screenshots FROM trading.trades WHERE screenshots IS NOT NULL AND BTRIM(screenshots) <> '' LOOP
    BEGIN
      parsed := trade_row.screenshots::jsonb;
    EXCEPTION WHEN OTHERS THEN
      parsed := jsonb_build_array(trade_row.screenshots);
    END;

    IF jsonb_typeof(parsed) <> 'array' THEN
      parsed := jsonb_build_array(parsed);
    END IF;

    UPDATE trading.trades
    SET attachments = COALESCE(attachments, '[]'::jsonb) || parsed
    WHERE id = trade_row.id;
  END LOOP;
END $$;

ALTER TABLE trading.trades DROP COLUMN screenshots;
