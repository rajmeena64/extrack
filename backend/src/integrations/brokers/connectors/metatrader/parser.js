const { normalizeStoredSymbol } = require('../../../../domains/trading/trade.normalization');
function normalizeMetaTraderTrade(rawTrade, userId, connectionId, accountCurrency = 'USD') {
  if (!rawTrade || typeof rawTrade !== 'object') return null;
  const symbol = normalizeStoredSymbol(rawTrade.symbol);
  if (!symbol) return null;
  const entryTs = Number(rawTrade.entry_timestamp);
  const exitTs = Number(rawTrade.exit_timestamp);
  if (!Number.isFinite(entryTs) || entryTs <= 0) return null;
  const entryIso = new Date(entryTs * 1000).toISOString();
  const exitIso = Number.isFinite(exitTs) && exitTs > 0 ? new Date(exitTs * 1000).toISOString() : entryIso;
  const quantity = Number(rawTrade.quantity) || 0;
  const entryPrice = Number(rawTrade.entry_price) || 0;
  const exitPrice = Number(rawTrade.exit_price) || null;
  const grossPnl = Number(rawTrade.gross_pnl) || 0;
  const netPnl = Number(rawTrade.net_pnl) || grossPnl;
  const charges = Math.abs(Number(rawTrade.charges) || 0);
  return {
    unique_id: `mt5-${rawTrade.trade_key}`,
    external_id: String(rawTrade.trade_key),
    user_id: userId,
    broker_connection_id: connectionId,
    symbol,
    side: rawTrade.side === 'short' ? 'short' : 'long',
    quantity,
    quantity_unit: 'lot',
    entry_price: entryPrice,
    exit_price: exitPrice,
    entry_timestamp: entryIso,
    exit_timestamp: exitIso,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    total_charges: charges,
    charges: charges > 0 ? { commission: charges } : {},
    pnl_currency: accountCurrency,
    currency: accountCurrency,
    stop_loss: rawTrade.stop_loss ? Number(rawTrade.stop_loss) : null,
    take_profit: rawTrade.take_profit ? Number(rawTrade.take_profit) : null,
    close_reason: rawTrade.close_reason || null,
    status: 'closed',
    source: 'sync',
    category: 'forex_cfd',
    product_type: 'forex_cfd',
  };
}
module.exports = { normalizeMetaTraderTrade };
