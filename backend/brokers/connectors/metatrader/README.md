# MetaTrader 5 Connector

Automated terminal sync connector for MetaTrader 5 accounts via Python worker engine and headless terminal execution.

## Supported Trade Methods
- `terminal_sync`: Automated on-demand sync of closed deals.

## Field Mapping
- `unique_id`: `mt5-${trade.trade_key}`
- `symbol`: Canonical normalized instrument symbol (e.g. `XAUUSD`, `EURUSD`).
- `side`: `long` (DEAL_TYPE_BUY) / `short` (DEAL_TYPE_SELL).
- `quantity`: Executed lot volume.
- `entry_price`: Open price of the position leg.
- `exit_price`: Close price of the matching deal.
- `entry_timestamp`: UTC ISO string converted from pure UTC Unix seconds.
- `exit_timestamp`: UTC ISO string converted from pure UTC Unix seconds.
- `gross_pnl`: Net deal profit before fees.
- `net_pnl`: Profit + Swap + Commission.
- `total_charges`: Absolute sum of commissions and swap.
- `stop_loss`: Captured from deal/order SL.
- `take_profit`: Captured from deal/order TP.
- `close_reason`: Categorized from MT5 `DEAL_REASON` (`manual`, `stop_loss`, `take_profit`, `stop_out`, `expert`).
