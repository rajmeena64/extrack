CREATE OR REPLACE FUNCTION notify_db_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'id', COALESCE(NEW.id::text, OLD.id::text, '')
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_instruments_db_change ON trading_catalog.instruments;
CREATE TRIGGER trg_instruments_db_change
AFTER INSERT OR UPDATE OR DELETE ON trading_catalog.instruments
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

DROP TRIGGER IF EXISTS trg_trades_db_change ON trading.trades;
CREATE TRIGGER trg_trades_db_change
AFTER INSERT OR UPDATE OR DELETE ON trading.trades
FOR EACH ROW EXECUTE FUNCTION notify_db_change();
