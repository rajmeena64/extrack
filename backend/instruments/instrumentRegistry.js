const feedClient = require('../integrations/ctrader/feed.client');
const { normalizeStoredSymbol } = require('../shared/utils/symbols');

const CACHE_TTL_MS = Math.min(
  Math.max(Number(process.env.INSTRUMENT_CACHE_TTL_MS) || 5 * 60 * 1000, 30 * 1000),
  60 * 60 * 1000
);

const registry = {
  instruments: Object.freeze([]),
  bySymbol: new Map(),
  byRequestSymbol: new Map(),
  expiresAt: 0,
  lastRefreshAt: 0,
  lastError: null,
};

let refreshPromise = null;

function normalizeSymbol(symbol) {
  return normalizeStoredSymbol(symbol);
}

function normalizeType(type) {
  const normalizedType = String(type || '').trim().toLowerCase();
  const aliases = {
    commodities: 'commodity',
    stocks: 'stock',
    indices: 'index',
    metal: 'commodity',
    metals: 'commodity',
  };

  return aliases[normalizedType] || normalizedType;
}

function classifyInstrument(symbol, source = {}) {
  const cleanSymbol = normalizeSymbol(symbol);
  const haystack = `${cleanSymbol} ${source.description || ''} ${source.category || ''} ${source.assetClassName || ''}`.toLowerCase();

  if (/(crypto|coin|token|digital|bitcoin|ethereum)/.test(haystack)) {
    return { type: 'crypto', category: 'crypto' };
  }

  if (/^(BTC|ETH|LTC|DOGE|ADA|SOL|XRP|BNB|DOT|AVAX|TRX|LINK|MATIC)/.test(cleanSymbol)) {
    return { type: 'crypto', category: 'crypto' };
  }

  if (/^(XAU|XAG|XPT|XPD)/.test(cleanSymbol) || /(gold|silver|palladium|platinum|metal)/.test(haystack)) {
    return { type: 'commodity', category: 'metals' };
  }

  if (/(oil|brent|wti|gas|energy)/.test(haystack)) {
    return { type: 'commodity', category: 'energy' };
  }

  if (/(index|indices|nasdaq|dow|spx|us500|ustec|dax|ftse)/.test(haystack)) {
    return { type: 'index', category: 'index' };
  }

  if (/^[A-Z]{6}$/.test(cleanSymbol)) {
    return { type: 'forex', category: 'forex' };
  }

  return { type: 'stock', category: 'stocks' };
}

function normalizeInstrument(rawInstrument) {
  const requestSymbol = String(rawInstrument?.name || rawInstrument?.symbol || rawInstrument?.normalizedName || '').trim();
  const symbol = normalizeSymbol(rawInstrument?.normalizedName || requestSymbol);
  if (!symbol || !requestSymbol) return null;

  const classification = classifyInstrument(symbol, rawInstrument);
  const name = String(
    rawInstrument?.description ||
    rawInstrument?.displayName ||
    rawInstrument?.symbolName ||
    requestSymbol
  ).trim();

  return {
    id: rawInstrument?.id ?? symbol,
    symbol,
    requestSymbol,
    name,
    type: classification.type,
    category: classification.category,
    broker: rawInstrument?.broker || 'ctrader',
    source: 'ctrader-feed-service',
    digits: Number.isFinite(Number(rawInstrument?.digits)) ? Number(rawInstrument.digits) : undefined,
    subscribed: rawInstrument?.subscribed === true,
    hasQuote: rawInstrument?.hasQuote === true,
  };
}

function setRegistry(instruments) {
  const bySymbol = new Map();
  const byRequestSymbol = new Map();
  const unique = [];

  for (const instrument of instruments) {
    if (!instrument?.symbol || bySymbol.has(instrument.symbol)) continue;
    bySymbol.set(instrument.symbol, instrument);
    byRequestSymbol.set(normalizeSymbol(instrument.requestSymbol), instrument);
    unique.push(instrument);
  }

  registry.instruments = Object.freeze(unique);
  registry.bySymbol = bySymbol;
  registry.byRequestSymbol = byRequestSymbol;
  registry.expiresAt = Date.now() + CACHE_TTL_MS;
  registry.lastRefreshAt = Date.now();
  registry.lastError = null;
}

async function refreshInstrumentCache({ force = false } = {}) {
  if (!force && registry.instruments.length && Date.now() < registry.expiresAt) {
    return registry.instruments;
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await feedClient.getFeedSymbols();
      const symbols = Array.isArray(response?.symbols) ? response.symbols : [];
      const instruments = symbols.map(normalizeInstrument).filter(Boolean);

      if (!instruments.length) {
        const error = new Error('Feed returned no instruments');
        error.status = 503;
        throw error;
      }

      setRegistry(instruments);
      return registry.instruments;
    } catch (error) {
      registry.lastError = error;
      if (registry.instruments.length) return registry.instruments;
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function getAllInstruments() {
  return refreshInstrumentCache();
}

async function getInstrumentsByType(type) {
  const normalizedType = normalizeType(type);
  if (!normalizedType) return [];
  const instruments = await refreshInstrumentCache();

  return instruments.filter((instrument) => instrument.type === normalizedType || instrument.category === normalizedType);
}

async function searchInstruments(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const instruments = await refreshInstrumentCache();
  if (!normalizedQuery) return instruments;

  return instruments.filter((instrument) => (
    instrument.symbol.toLowerCase().includes(normalizedQuery) ||
    instrument.requestSymbol.toLowerCase().includes(normalizedQuery) ||
    instrument.name.toLowerCase().includes(normalizedQuery) ||
    instrument.type.toLowerCase().includes(normalizedQuery) ||
    instrument.category.toLowerCase().includes(normalizedQuery)
  ));
}

async function getInstrumentBySymbol(symbol) {
  await refreshInstrumentCache();
  const normalized = normalizeSymbol(symbol);

  return registry.bySymbol.get(normalized) || registry.byRequestSymbol.get(normalized) || null;
}

async function isAllowedSymbol(symbol) {
  return Boolean(await getInstrumentBySymbol(symbol));
}

function getInstrumentCacheStatus() {
  return {
    count: registry.instruments.length,
    expiresAt: registry.expiresAt,
    lastRefreshAt: registry.lastRefreshAt,
    healthy: registry.instruments.length > 0 && !registry.lastError,
    stale: registry.instruments.length > 0 && Date.now() >= registry.expiresAt,
    lastError: registry.lastError ? 'Instrument cache refresh failed' : null,
  };
}

module.exports = {
  getAllInstruments,
  getInstrumentsByType,
  searchInstruments,
  getInstrumentBySymbol,
  getInstrumentCacheStatus,
  isAllowedSymbol,
  refreshInstrumentCache,
};
