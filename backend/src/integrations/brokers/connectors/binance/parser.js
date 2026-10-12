const { normalizeProductType, normalizeTradeSide, normalizeStoredSymbol } = require('../../../../domains/trading/trade.normalization');
const firstValue = (o, ...k) => k.map(x => o?.[x]).find(v => v !== undefined && v !== null && v !== '');
function toIsoTimestamp(value) {
  if (!value) return null;
  const d = new Date(Number(value) || value);
  if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return null;
  return d.toISOString();
}
function normalizeBinanceFill(fill, userId, connectionId, mappingConfig = null) {
  if (!fill || typeof fill !== 'object') return null;
  const defaults = mappingConfig?.defaults || {};
  const externalId = String(firstValue(fill, 'id', 'tradeId', 'orderId', 'external_id') || '').trim();
  if (!externalId) return null;
  const rawSymbol = String(firstValue(fill, 'symbol', 'pair') || '').trim();
  if (!rawSymbol) return null;
  const symbol = normalizeStoredSymbol(rawSymbol);
  const isBuyer = fill.isBuyer !== undefined ? Boolean(fill.isBuyer) : (String(fill.side || '').toUpperCase() === 'BUY');
  const side = normalizeTradeSide(isBuyer ? 'long' : 'short');
  const price = Number(firstValue(fill, 'price', 'entry_price') || 0);
  const quantity = Number(firstValue(fill, 'qty', 'quantity') || 0);
  const commission = Math.abs(Number(firstValue(fill, 'commission', 'charges') || 0));
  const commissionAsset = String(fill.commissionAsset || defaults.pnl_currency || 'USDT').toUpperCase();
  const timeVal = firstValue(fill, 'time', 'transactTime', 'entry_timestamp');
  const timestamp = toIsoTimestamp(timeVal);
  if (!timestamp) return null;
  const rawCategory = String(firstValue(fill, 'category', 'contractType', 'product_type') || 'spot').toLowerCase();
  let productType = 'spot';
  let category = 'crypto';
  if (rawCategory.includes('future') || rawCategory.includes('linear') || rawCategory.includes('perpetual')) {
    productType = rawCategory.includes('perpetual') ? 'perpetual' : 'future';
    category = 'crypto';
  }
  const realizedPnl = Number(firstValue(fill, 'realizedPnl', 'net_pnl') || 0);
  return {
    user_id: userId,
    broker_connection_id: connectionId,
    external_id: externalId,
    unique_id: externalId,
    symbol,
    side,
    entry_price: price,
    exit_price: price,
    quantity,
    entry_timestamp: timestamp,
    exit_timestamp: timestamp,
    gross_pnl: realizedPnl,
    net_pnl: realizedPnl - commission,
    pnl_currency: commissionAsset,
    charges: commission,
    product_type: normalizeProductType(productType),
    category,
    status: defaults.status || 'closed',
  };
}
function parseBinanceCsvRow(row, userId, connectionId, mappingConfig = null) {
  return normalizeBinanceFill(row, userId, connectionId, mappingConfig);
}
module.exports = {
  normalizeBinanceFill,
  parseBinanceCsvRow,
};
