const { normalizeProductType, normalizeTradeSide, normalizeStoredSymbol } = require('../../../../domains/trading/trade.normalization');
const firstValue = (o, ...k) => k.map(x => o?.[x]).find(v => v !== undefined && v !== null && v !== '');
function toIsoTimestamp(value) {
  if (!value) return null;
  const d = new Date(Number(value) || value);
  if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return null;
  return d.toISOString();
}
function normalizeCTraderDeal(deal, userId, connectionId, mappingConfig = null) {
  if (!deal || typeof deal !== 'object') return null;
  const defaults = mappingConfig?.defaults || {};
  const dealId = String(firstValue(deal, 'dealId', 'id', 'external_id') || '').trim();
  if (!dealId) return null;
  const rawSymbol = String(firstValue(deal, 'symbolName', 'symbol') || '').trim();
  if (!rawSymbol) return null;
  const symbol = normalizeStoredSymbol(rawSymbol);
  const tradeSide = String(firstValue(deal, 'tradeSide', 'side') || '').toUpperCase();
  const side = normalizeTradeSide(tradeSide.includes('SELL') ? 'short' : 'long');
  const isApiObject = deal.dealId !== undefined || deal.executionTimestamp !== undefined;
  const rawVolume = Number(firstValue(deal, 'volume', 'quantity') || 0);
  const volume = isApiObject ? rawVolume / 100 : rawVolume;
  const price = Number(firstValue(deal, 'executionPrice', 'price', 'entry_price') || 0);
  const divisor = isApiObject ? 100 : 1;
  const grossPnl = Number(deal.grossProfit || 0) / divisor;
  const commission = Math.abs(Number(deal.commission || 0) / divisor);
  const swap = Number(deal.swap || 0) / divisor;
  const netPnl = deal.netProfit !== undefined && deal.netProfit !== null
    ? Number(deal.netProfit) / divisor
    : grossPnl - commission + swap;
  const timeVal = firstValue(deal, 'executionTimestamp', 'closingTimestamp', 'timestamp', 'entry_timestamp');
  const timestamp = toIsoTimestamp(timeVal);
  if (!timestamp) return null;
  const rawCategory = String(firstValue(deal, 'category', 'product_type') || '').toLowerCase();
  let productType = 'forex';
  let category = 'forex_cfd';
  if (rawCategory.includes('crypto') || rawCategory.includes('btc') || rawCategory.includes('eth')) {
    productType = 'spot'; category = 'crypto';
  } else if (rawCategory.includes('stock') || rawCategory.includes('equity')) {
    productType = 'equity'; category = 'equity';
  }
  const totalCharges = commission + Math.abs(swap);
  return {
    user_id: userId,
    broker_connection_id: connectionId,
    external_id: dealId,
    unique_id: dealId,
    symbol,
    side,
    entry_price: price,
    exit_price: price,
    quantity: volume > 0 ? volume : 1,
    entry_timestamp: timestamp,
    exit_timestamp: timestamp,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    pnl_currency: defaults.pnl_currency || 'USD',
    total_charges: totalCharges,
    charges: totalCharges > 0 ? totalCharges : 0,
    product_type: normalizeProductType(productType),
    category,
    status: defaults.status || 'closed',
  };
}
function parseCTraderCsvRow(row, userId, connectionId, mappingConfig = null) {
  return normalizeCTraderDeal(row, userId, connectionId, mappingConfig);
}
module.exports = {
  normalizeCTraderDeal,
  parseCTraderCsvRow,
};
