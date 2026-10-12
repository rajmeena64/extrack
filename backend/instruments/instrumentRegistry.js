const pool = require('../infra/db/supabase');

const SELECT = `id, symbol, name, display_name AS "displayName", category, asset_class AS "assetClass", product_type AS "productType", base_asset AS "baseAsset", quote_asset AS "quoteAsset", icon, profit_currency AS "profitCurrency", digits, TRIM_SCALE(contract_size)::text AS "contractSize", TRIM_SCALE(tick_size)::text AS "tickSize", TRIM_SCALE(pip_size)::text AS "pipSize"`;

const cache = { map: new Map(), list: [], ready: false };

async function refreshInstrumentCache() {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM trading_catalog.instruments WHERE is_active = TRUE ORDER BY sort_order, symbol`);
  cache.map.clear();
  cache.list = rows.map((r) => {
    const item = { ...r, symbol: r.symbol.toUpperCase() };
    cache.map.set(item.symbol, item);
    return item;
  });
  cache.ready = true;
  return cache.list;
}

async function ensureLoaded() {
  if (!cache.ready) await refreshInstrumentCache();
}

function findBySymbol(symbol) {
  if (!symbol) return null;
  return cache.map.get(String(symbol).trim().toUpperCase()) || null;
}

async function getInstrument(symbol) {
  await ensureLoaded();
  return findBySymbol(symbol);
}

async function getInstrumentBySymbol(symbol) {
  await ensureLoaded();
  return findBySymbol(symbol);
}

async function getAllInstruments() {
  await ensureLoaded();
  return cache.list;
}

async function list({ category, assetClass, productType, search, limit = 500 } = {}) {
  await ensureLoaded();
  let res = cache.list;
  if (category) {
    const c = category.toLowerCase();
    if (c === 'crypto') res = res.filter((i) => i.assetClass === 'crypto' || i.category === 'crypto');
    else if (c === 'forex_cfd') res = res.filter((i) => ['forex', 'cfd'].includes(i.category) || ['forex', 'forex_cfd', 'metal', 'energy'].includes(i.assetClass));
    else res = res.filter((i) => i.category?.toLowerCase() === c || i.assetClass?.toLowerCase() === c);
  }
  if (assetClass) res = res.filter((i) => i.assetClass?.toLowerCase() === assetClass.toLowerCase());
  if (productType) res = res.filter((i) => i.productType?.toLowerCase() === productType.toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    res = res.filter((i) => i.symbol.toLowerCase().includes(q) || (i.name && i.name.toLowerCase().includes(q)) || (i.displayName && i.displayName.toLowerCase().includes(q)));
  }
  return res.slice(0, limit);
}

async function listHistoricalSyncSymbols() {
  await ensureLoaded();
  return cache.list;
}

function calculationSnapshot(instrument) {
  if (!instrument) return null;
  return {
    instrumentId: instrument.id,
    symbol: instrument.symbol,
    assetClass: instrument.assetClass,
    productType: instrument.productType,
    contractSize: instrument.contractSize,
    tickSize: instrument.tickSize,
    pipSize: instrument.pipSize,
    profitCurrency: instrument.profitCurrency,
  };
}

module.exports = {
  calculationSnapshot,
  findBySymbol,
  getAllInstruments,
  getInstrument,
  getInstrumentBySymbol,
  list,
  listHistoricalSyncSymbols,
  refreshInstrumentCache,
};
