const SYMBOL_PATTERN = /^[A-Z0-9]{2,30}$/;
const { UUID_PATTERN } = require('../../connections/connectionValidation');

function optionalId(value, field) {
  if (value === undefined) return { value: undefined };
  const normalized = String(value).trim();
  if (!/^\d{1,20}$/.test(normalized)) return { error: `${field} must be a positive integer` };
  return { value: normalized };
}

function optionalTimestamp(value, field) {
  if (value === undefined) return { value: undefined };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > Date.now() + 60000) {
    return { error: `${field} must be a valid Unix timestamp in milliseconds` };
  }
  return { value: parsed };
}

function validateTradeQuery(input, market, maxWindowOverride) {
  const allowed = market === 'spot'
    ? new Set(['symbol', 'orderId', 'fromId', 'startTime', 'endTime', 'limit'])
    : new Set(['symbol', 'fromId', 'startTime', 'endTime', 'limit']);
  const unexpected = Object.keys(input || {}).filter((key) => !allowed.has(key));
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };

  const symbol = typeof input?.symbol === 'string' ? input.symbol.trim().toUpperCase() : '';
  if (!SYMBOL_PATTERN.test(symbol)) return { error: 'symbol is required and must be valid' };
  const limit = input.limit === undefined ? 500 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return { error: 'limit must be an integer from 1 to 1000' };

  const params = { symbol, limit };
  for (const field of ['fromId', ...(market === 'spot' ? ['orderId'] : [])]) {
    const parsed = optionalId(input[field], field);
    if (parsed.error) return parsed;
    if (parsed.value !== undefined) params[field] = parsed.value;
  }
  for (const field of ['startTime', 'endTime']) {
    const parsed = optionalTimestamp(input[field], field);
    if (parsed.error) return parsed;
    if (parsed.value !== undefined) params[field] = parsed.value;
  }
  if (params.startTime !== undefined && params.endTime !== undefined) {
    const { startTime, endTime } = params;
    const maxWindow = maxWindowOverride || (market === 'spot' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);
    if (endTime < startTime || endTime - startTime > maxWindow) {
      return { error: `${market === 'spot' ? 'Spot' : 'USD-M Futures'} time range is too large` };
    }
  }
  if (params.fromId !== undefined && (params.startTime !== undefined || params.endTime !== undefined)) {
    return { error: 'fromId cannot be combined with startTime or endTime' };
  }
  if (params.orderId !== undefined && (params.startTime !== undefined || params.endTime !== undefined)) {
    return { error: 'orderId cannot be combined with startTime or endTime' };
  }
  return { value: params };
}

function validateTradeSync(input, market) {
  if (market !== 'usdmFutures') return validateTradeQuery(input, market, 90 * 24 * 60 * 60 * 1000);
  const unexpected = Object.keys(input || {}).filter((key) => key !== 'limit');
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };
  const parsed = validateTradeQuery({ ...input, symbol: 'BTCUSDT' }, market);
  if (parsed.error) return parsed;
  delete parsed.value.symbol;
  return parsed;
}

function validateExportRange(input) {
  const unexpected = Object.keys(input || {}).filter((key) => !['connectionId', 'startTime', 'endTime'].includes(key));
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };
  if (!UUID_PATTERN.test(String(input?.connectionId || ''))) return { error: 'connectionId must be a valid UUID' };
  const start = optionalTimestamp(input?.startTime, 'startTime');
  const end = optionalTimestamp(input?.endTime, 'endTime');
  if (start.error || end.error || start.value === undefined || end.value === undefined) return { error: 'startTime and endTime are required' };
  if (end.value <= start.value || end.value - start.value > 366 * 24 * 60 * 60 * 1000) return { error: 'Binance export range must be one year or less' };
  return { value: { connectionId: input.connectionId, startTime: start.value, endTime: end.value } };
}

module.exports = { validateExportRange, validateTradeQuery, validateTradeSync };
