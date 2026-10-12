const { normalizeProductType, normalizeTradeSide, normalizeStoredSymbol } = require('../../../../domains/trading/trade.normalization');
const firstValue = (o, ...k) => k.map(x => o?.[x]).find(v => v !== undefined && v !== null && v !== '');
function extractValue(fill, keys) {
  if (!fill || !keys) return null;
  const keyList = Array.isArray(keys) ? keys : [keys];
  for (const k of keyList) {
    const matchedKey = Object.keys(fill).find((key) => key.trim().toLowerCase() === String(k).trim().toLowerCase());
    if (matchedKey && fill[matchedKey] !== undefined && fill[matchedKey] !== null && String(fill[matchedKey]).trim() !== '') {
      return fill[matchedKey];
    }
  }
  return null;
}
function toIsoTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime()) || d.getTime() <= 0) return null;
  return d.toISOString();
}
function normalizeAngelOneFill(fill, userId, connectionId, mappingConfig = null) {
  if (!fill || typeof fill !== 'object') return null;
  const fm = mappingConfig?.fieldMapping || {};
  const defaults = mappingConfig?.defaults || {};
  const rawUniqueId = extractValue(fill, fm.unique_id) || firstValue(fill, 'fillid', 'tradeid', 'orderid');
  const uniqueId = String(rawUniqueId || '').trim();
  if (!uniqueId) return null;
  const rawSymbol = String(extractValue(fill, fm.symbol) || firstValue(fill, 'tradingsymbol', 'symbolname', 'symbol') || '').trim();
  if (!rawSymbol) return null;
  const symbol = normalizeStoredSymbol(rawSymbol);
  const rawSide = extractValue(fill, fm.side) || firstValue(fill, 'transactiontype', 'side');
  const side = normalizeTradeSide(rawSide);
  const price = Number(extractValue(fill, fm.price) || firstValue(fill, 'fillprice', 'price') || 0);
  const quantity = Number(extractValue(fill, fm.quantity) || firstValue(fill, 'fillsize', 'quantity', 'qty') || 0);
  const brokerage = Number(extractValue(fill, fm.charges) || firstValue(fill, 'brokerage', 'charges') || 0);
  const fillTime = extractValue(fill, fm.entry_timestamp) || fill.filltime;
  const timestamp = toIsoTimestamp(fillTime) || new Date().toISOString();
  const rawProduct = String(extractValue(fill, fm.product_type) || firstValue(fill, 'producttype', 'exchange') || '').toLowerCase();
  let productType = 'spot';
  if (rawProduct.includes('fut') || rawSymbol.endsWith('FUT')) productType = 'future';
  else if (rawProduct.includes('opt') || rawSymbol.endsWith('CE') || rawSymbol.endsWith('PE')) productType = 'option';
  return {
    user_id: userId,
    broker_connection_id: connectionId,
    unique_id: uniqueId,
    symbol,
    side,
    entry_price: price,
    exit_price: price,
    quantity,
    entry_timestamp: timestamp,
    exit_timestamp: timestamp,
    gross_pnl: 0,
    net_pnl: -brokerage,
    pnl_currency: defaults.pnl_currency || 'INR',
    charges: brokerage > 0 ? { brokerage } : {},
    total_charges: brokerage > 0 ? brokerage : 0,
    product_type: normalizeProductType(productType),
    category: productType === 'future' || productType === 'option' ? 'fno' : 'equity',
    status: defaults.status || 'closed',
    source: 'sync',
  };
}
function parseAngelOneCsvRow(row, userId, connectionId, mappingConfig = null) {
  if (!row || typeof row !== 'object') return null;
  const rawSymbol = String(
    extractValue(row, ['Scrip/Contract', 'Scrip', 'Contract', 'symbol', 'tradingsymbol']) || ''
  ).trim();
  if (!rawSymbol) return null;
  const rawUniqueId = extractValue(row, ['Trade ID', 'Order ID', 'tradeid', 'orderid']);
  const uniqueId = rawUniqueId
    ? String(rawUniqueId).trim()
    : `ANGEL-CSV-${rawSymbol}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const symbol = normalizeStoredSymbol(rawSymbol);
  const rawSide = extractValue(row, ['Buy/Sell', 'side', 'type', 'transactiontype']);
  const side = normalizeTradeSide(rawSide);
  const buyPrice = Number(extractValue(row, ['Buy Price', 'buyprice', 'open_price', 'entry_price']) || 0);
  const sellPrice = Number(extractValue(row, ['Sell Price', 'sellprice', 'close_price', 'exit_price']) || 0);
  const quantity = Number(extractValue(row, ['Quantity', 'qty', 'fillsize', 'lots']) || 0);
  const brokerage = Number(extractValue(row, 'Brokerage') || 0);
  const gst = Number(extractValue(row, 'GST') || 0);
  const stt = Number(extractValue(row, 'STT') || 0);
  const sebiTax = Number(extractValue(row, 'Sebi Tax') || 0);
  const turnoverCharges = Number(extractValue(row, 'Exchange Turnover Charges') || 0);
  const stampDuty = Number(extractValue(row, 'Stamp Duty') || 0);
  const otherCharges = Number(extractValue(row, 'Other Charges') || 0);
  const ipftCharges = Number(extractValue(row, 'IPFT Charges') || 0);
  const totalCharges = brokerage + gst + stt + sebiTax + turnoverCharges + stampDuty + otherCharges + ipftCharges;
  const entryPrice = side === 'long' ? buyPrice : (sellPrice > 0 ? sellPrice : buyPrice);
  const exitPrice = side === 'long' ? (sellPrice > 0 ? sellPrice : buyPrice) : buyPrice;
  if (!entryPrice || entryPrice <= 0 || !quantity || quantity <= 0) {
    return null;
  }
  const grossPnl = sellPrice > 0 && buyPrice > 0 ? (sellPrice - buyPrice) * quantity * (side === 'short' ? -1 : 1) : 0;
  const netPnl = grossPnl - totalCharges;
  const dateVal = extractValue(row, ['Date', 'trade_date', 'entry_timestamp']);
  const timestamp = toIsoTimestamp(dateVal);
  if (!timestamp) return null;
  const segment = String(extractValue(row, ['Segment', 'product_type']) || '').toLowerCase();
  let productType = 'equity';
  let category = 'equity';
  if (segment.includes('fut') || rawSymbol.endsWith('FUT')) { productType = 'future'; category = 'fno'; }
  else if (segment.includes('opt') || rawSymbol.endsWith('CE') || rawSymbol.endsWith('PE')) { productType = 'option'; category = 'fno'; }
  else if (segment.includes('fno') || segment.includes('f&o')) { productType = 'future'; category = 'fno'; }
  return {
    user_id: userId,
    broker_connection_id: connectionId,
    unique_id: uniqueId,
    symbol,
    side,
    entry_price: entryPrice,
    exit_price: exitPrice > 0 ? exitPrice : null,
    quantity,
    entry_timestamp: timestamp,
    exit_timestamp: timestamp,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    pnl_currency: 'INR',
    charges: totalCharges > 0 ? { brokerage, gst, stt, sebiTax, turnoverCharges, stampDuty, otherCharges, ipftCharges } : {},
    total_charges: totalCharges > 0 ? totalCharges : 0,
    product_type: normalizeProductType(productType),
    category,
    status: 'closed',
    source: 'file',
  };
}
module.exports = {
  normalizeAngelOneFill,
  parseAngelOneCsvRow,
  normalizeAngelOneTrade: normalizeAngelOneFill,
};
