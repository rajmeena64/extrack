ALTER TABLE trading_catalog.instruments 
  ALTER COLUMN contract_size TYPE NUMERIC,
  ALTER COLUMN tick_size TYPE NUMERIC,
  ALTER COLUMN pip_size TYPE NUMERIC,
  ALTER COLUMN min_quantity TYPE NUMERIC,
  ALTER COLUMN max_quantity TYPE NUMERIC,
  ALTER COLUMN quantity_step TYPE NUMERIC;

CREATE OR REPLACE FUNCTION trading_catalog.trg_clean_instrument_scales()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_size IS NOT NULL THEN
    NEW.contract_size := TRIM_SCALE(NEW.contract_size);
  END IF;
  IF NEW.tick_size IS NOT NULL THEN
    NEW.tick_size := TRIM_SCALE(NEW.tick_size);
  END IF;
  IF NEW.pip_size IS NOT NULL THEN
    NEW.pip_size := TRIM_SCALE(NEW.pip_size);
  END IF;
  IF NEW.min_quantity IS NOT NULL THEN
    NEW.min_quantity := TRIM_SCALE(NEW.min_quantity);
  END IF;
  IF NEW.max_quantity IS NOT NULL THEN
    NEW.max_quantity := TRIM_SCALE(NEW.max_quantity);
  END IF;
  IF NEW.quantity_step IS NOT NULL THEN
    NEW.quantity_step := TRIM_SCALE(NEW.quantity_step);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_instrument_scales_before ON trading_catalog.instruments;
CREATE TRIGGER trg_clean_instrument_scales_before
BEFORE INSERT OR UPDATE ON trading_catalog.instruments
FOR EACH ROW EXECUTE FUNCTION trading_catalog.trg_clean_instrument_scales();

UPDATE trading_catalog.instruments SET
  contract_size = TRIM_SCALE(contract_size),
  tick_size = TRIM_SCALE(tick_size),
  pip_size = TRIM_SCALE(pip_size),
  min_quantity = TRIM_SCALE(min_quantity),
  max_quantity = TRIM_SCALE(max_quantity),
  quantity_step = TRIM_SCALE(quantity_step);

CREATE OR REPLACE FUNCTION trading.trg_clean_trade_floats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity IS NOT NULL THEN
    NEW.quantity := TRIM_SCALE(ROUND(NEW.quantity, 8));
  END IF;
  IF NEW.entry_price IS NOT NULL THEN
    NEW.entry_price := TRIM_SCALE(ROUND(NEW.entry_price, 8));
  END IF;
  IF NEW.exit_price IS NOT NULL THEN
    NEW.exit_price := TRIM_SCALE(ROUND(NEW.exit_price, 8));
  END IF;
  IF NEW.gross_pnl IS NOT NULL THEN
    NEW.gross_pnl := TRIM_SCALE(ROUND(NEW.gross_pnl, 4));
  END IF;
  IF NEW.net_pnl IS NOT NULL THEN
    NEW.net_pnl := TRIM_SCALE(ROUND(NEW.net_pnl, 4));
  END IF;
  IF NEW.total_charges IS NOT NULL THEN
    NEW.total_charges := TRIM_SCALE(ROUND(NEW.total_charges, 4));
  END IF;
  IF NEW.stop_loss IS NOT NULL THEN
    NEW.stop_loss := TRIM_SCALE(ROUND(NEW.stop_loss, 8));
  END IF;
  IF NEW.take_profit IS NOT NULL THEN
    NEW.take_profit := TRIM_SCALE(ROUND(NEW.take_profit, 8));
  END IF;
  IF NEW.percent_change IS NOT NULL THEN
    NEW.percent_change := TRIM_SCALE(ROUND(NEW.percent_change, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_trade_floats_before ON trading.trades;
CREATE TRIGGER trg_clean_trade_floats_before
BEFORE INSERT OR UPDATE ON trading.trades
FOR EACH ROW EXECUTE FUNCTION trading.trg_clean_trade_floats();

UPDATE trading.trades SET
  quantity = TRIM_SCALE(ROUND(quantity, 8)),
  entry_price = TRIM_SCALE(ROUND(entry_price, 8)),
  exit_price = TRIM_SCALE(ROUND(exit_price, 8)),
  gross_pnl = TRIM_SCALE(ROUND(gross_pnl, 4)),
  net_pnl = TRIM_SCALE(ROUND(net_pnl, 4)),
  total_charges = TRIM_SCALE(ROUND(total_charges, 4)),
  stop_loss = CASE WHEN stop_loss IS NOT NULL THEN TRIM_SCALE(ROUND(stop_loss, 8)) ELSE NULL END,
  take_profit = CASE WHEN take_profit IS NOT NULL THEN TRIM_SCALE(ROUND(take_profit, 8)) ELSE NULL END,
  percent_change = CASE WHEN percent_change IS NOT NULL THEN TRIM_SCALE(ROUND(percent_change, 6)) ELSE NULL END;
