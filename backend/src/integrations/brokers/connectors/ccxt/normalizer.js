const { normalizeStoredSymbol } = require('../../../../domains/trading/trade.normalization');
function extractCurrency(symbol) {
  const str = String(symbol || '');
  if (str.includes(':')) return str.split(':')[1];
  if (str.includes('/')) return str.split('/')[1];
  return null;
}
function normalizeCcxtPosition(p, slug, connectionId) {
  if (!p) return null;
  const side = String(p.side || '').toLowerCase();
  if (side !== 'long' && side !== 'short') return null;
  const entryPrice = Number(p.entryPrice || 0);
  const exitPrice = Number(p.lastPrice || 0);
  const quantity = Number(p.contracts || 0);
  if (!(entryPrice > 0) || !(exitPrice > 0) || !(quantity > 0)) return null;
  const netPnl = Number(p.realizedPnl || 0);
  const openFee = Number(p.info?.openFee || 0);
  const closeFee = Number(p.info?.closeFee || 0);
  const totalCharges = openFee + closeFee;
  const grossPnl = netPnl + totalCharges;
  const pnlCurrency = p.marginAsset ?? extractCurrency(p.symbol);
  const orderId = p.info?.orderId;
  const posId = String(p.id ?? orderId ?? p.timestamp);
  const entryTime = p.info?.createdTime ? new Date(Number(p.info.createdTime)).toISOString() : new Date(p.timestamp || Date.now()).toISOString();
  const exitTime = new Date(p.timestamp || Date.now()).toISOString();
  const symbol = normalizeStoredSymbol(p.symbol) || p.symbol;
  return {
    unique_id: posId,
    symbol,
    side,
    entry_price: entryPrice,
    exit_price: exitPrice,
    quantity,
    entry_timestamp: entryTime,
    exit_timestamp: exitTime,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    pnl_currency: pnlCurrency,
    currency: pnlCurrency,
    charges: JSON.stringify({ openFee, closeFee, total: totalCharges }),
    total_charges: totalCharges,
    product_type: 'crypto',
    category: 'perpetual',
    status: 'closed',
    source: 'sync',
  };
}
module.exports = { normalizeCcxtPosition };
