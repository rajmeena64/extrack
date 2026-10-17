ALTER TABLE trading.trade_executions DROP CONSTRAINT IF EXISTS trade_executions_action_check;
UPDATE trading.trade_executions SET action = 'long' WHERE action = 'buy';
UPDATE trading.trade_executions SET action = 'short' WHERE action = 'sell';
ALTER TABLE trading.trade_executions ADD CONSTRAINT trade_executions_action_check CHECK (action IN ('long', 'short', 'buy', 'sell'));
