const TRADE_STATUSES = new Set(['open', 'closed', 'cancelled', 'liquidated']);

function normalizeTradeSide(value) {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (['buy', 'b', 'long', '1'].includes(str)) return 'long';
  if (['sell', 's', 'short', '2'].includes(str)) return 'short';
  return str;
}

function normalizeTradeStatus(value, exitTimestamp) {
  if (value && TRADE_STATUSES.has(String(value).toLowerCase())) {
    return String(value).toLowerCase();
  }
  return exitTimestamp ? 'closed' : 'open';
}

function normalizeProductType(value) {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (['crypto_spot', 'perpetual', 'crypto'].includes(str)) return 'crypto';
  if (['forex', 'cfd', 'forex_cfd', 'fx', 'metal'].includes(str)) return 'forex_cfd';
  if (['future', 'futures'].includes(str)) return 'future';
  if (['option', 'options'].includes(str)) return 'option';
  return str;
}

function validateTimestamps(entryAt, exitAt) {
  const entry = new Date(entryAt);
  const exit = exitAt ? new Date(exitAt) : null;
  if (Number.isNaN(entry.valueOf())) throw new Error('Entry timestamp is invalid');
  if (exit && Number.isNaN(exit.valueOf())) throw new Error('Exit timestamp is invalid');
  if (exit && exit < entry) throw new Error('Exit time cannot be before entry time');
  return {
    entryTimestamp: entry.toISOString(),
    exitTimestamp: exit ? exit.toISOString() : null
  };
}

function buildTradeResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    uniqueId: row.unique_id,
    userId: row.user_id,
    brokerConnectionId: row.broker_connection_id,
    symbol: row.symbol,
    side: row.side,
    status: row.status,
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    exitPrice: row.exit_price !== null ? Number(row.exit_price) : null,
    entryTimestamp: row.entry_timestamp,
    exitTimestamp: row.exit_timestamp,
    grossPnl: row.gross_pnl !== null ? Number(row.gross_pnl) : null,
    netPnl: row.net_pnl !== null ? Number(row.net_pnl) : null,
    totalCharges: row.total_charges !== null ? Number(row.total_charges) : 0,
    pnlCurrency: row.pnl_currency,
    stopLoss: row.stop_loss !== null ? Number(row.stop_loss) : null,
    takeProfit: row.take_profit !== null ? Number(row.take_profit) : null,
    percentChange: row.percent_change !== null ? Number(row.percent_change) : null,
    productType: row.product_type,
    category: row.category,
    strategy: row.strategy,
    notes: row.notes,
    attachments: Array.isArray(row.attachments) ? row.attachments : (typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : []),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeStoredSymbol(value) {
  let s = String(value || '').trim();
  if (!s) return '';
  if (s.includes(':')) {
    const parts = s.split(':');
    s = parts[0].includes('/') ? parts[0] : parts.pop();
  }
  s = s.replace(/\s+/g, '');
  const sep = s.match(/^(.+?)[._-][a-z][a-z0-9]*$/);
  if (sep) s = sep[1];
  else {
    const lower = s.match(/^([A-Z0-9]{3,})([a-z][a-z0-9]*)$/);
    if (lower) s = lower[1];
  }
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = {
  normalizeTradeSide,
  normalizeTradeStatus,
  normalizeProductType,
  validateTimestamps,
  buildTradeResponse,
  normalizeStoredSymbol
};
