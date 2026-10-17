ALTER TABLE trading.trades DROP CONSTRAINT IF EXISTS trades_side_check;
UPDATE trading.trades SET side = 'long' WHERE side = 'buy';
UPDATE trading.trades SET side = 'short' WHERE side = 'sell';
ALTER TABLE trading.trades ADD CONSTRAINT trades_side_check CHECK (side IS NULL OR side IN ('long', 'short'));
