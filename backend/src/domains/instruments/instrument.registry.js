const instrumentRepository = require('./instrument.repository');

const cache = { map: new Map(), list: [], ready: false };

async function refreshCache() {
  const rows = await instrumentRepository.fetchActiveInstruments();
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
  if (!cache.ready) await refreshCache();
}

function findBySymbol(symbol) {
  if (!symbol) return null;
  return cache.map.get(String(symbol).trim().toUpperCase()) || null;
}

async function getInstrument(symbol) {
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
    res = res.filter((i) => i.category.toLowerCase() === c || i.assetClass.toLowerCase() === c);
  }
  if (assetClass) {
    const a = assetClass.toLowerCase();
    res = res.filter((i) => i.assetClass.toLowerCase() === a);
  }
  if (productType) {
    const p = productType.toLowerCase();
    res = res.filter((i) => i.productType.toLowerCase() === p);
  }
  if (search) {
    const q = search.toLowerCase();
    res = res.filter((i) => i.symbol.toLowerCase().includes(q) || (i.name && i.name.toLowerCase().includes(q)));
  }
  return res.slice(0, limit);
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
    profitCurrency: instrument.profitCurrency
  };
}

module.exports = {
  calculationSnapshot,
  findBySymbol,
  getAllInstruments,
  getInstrument,
  list,
  refreshCache
};
