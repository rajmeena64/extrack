const { PRICE_SCALE } = require('./constants');
const { ctraderConfig } = require('./state');

function normalizeSymbolName(symbolName) {
  return String(symbolName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function cacheAssets(assetsData) {
  const assets = Array.isArray(assetsData)
    ? assetsData
    : (assetsData?.assets || assetsData?.asset || []);
  // Assets are available if needed for symbol conversions
  return assets;
}

function cacheSymbols(symbolsData) {
  const symbols = Array.isArray(symbolsData)
    ? symbolsData
    : (symbolsData?.symbols || symbolsData?.symbol || []);

  if (!symbols.length) {
    return;
  }

  symbols.forEach((symbol) => {
    const id = Number(symbol.symbolId || symbol.id);

    if (!Number.isFinite(id)) {
      return;
    }

    const name = symbol.symbolName || symbol.name || '';
    ctraderConfig.symbols.set(id, {
      id,
      name,
      displayName: symbol.displayName || name,
      requestSymbol: symbol.symbolName || name,
      normalizedName: normalizeSymbolName(name),
      description: symbol.description,
      digits: Number.isFinite(Number(symbol.digits)) ? Number(symbol.digits) : null,
      pipPosition: Number.isFinite(Number(symbol.pipPosition)) ? Number(symbol.pipPosition) : null,
      baseAsset: symbol.baseAsset,
      quoteAsset: symbol.quoteAsset,
    });

    if (!ctraderConfig.currentSymbolId) {
      ctraderConfig.currentSymbolId = id;
    }
  });
}

function cacheSymbolDetails(symbolsData) {
  const symbols = Array.isArray(symbolsData)
    ? symbolsData
    : (symbolsData?.symbols || symbolsData?.symbol || []);

  symbols.forEach((symbol) => {
    const id = Number(symbol.symbolId || symbol.id);
    if (!Number.isFinite(id)) return;

    const existing = ctraderConfig.symbols.get(id) || {};
    const name = existing.name || symbol.symbolName || symbol.name || '';
    ctraderConfig.symbols.set(id, {
      ...existing,
      id,
      name,
      displayName: existing.displayName || symbol.displayName || symbol.symbolName || name,
      requestSymbol: existing.requestSymbol || symbol.symbolName || name,
      normalizedName: existing.normalizedName || normalizeSymbolName(name),
      description: existing.description || symbol.description,
      digits: Number.isFinite(Number(symbol.digits)) ? Number(symbol.digits) : existing.digits ?? null,
      pipPosition: Number.isFinite(Number(symbol.pipPosition)) ? Number(symbol.pipPosition) : existing.pipPosition ?? null,
    });
  });
}

function findExactSymbolMatch(symbol) {
  if (Number.isFinite(Number(symbol)) && ctraderConfig.symbols.has(Number(symbol))) {
    return ctraderConfig.symbols.get(Number(symbol));
  }
  const normalized = normalizeSymbolName(symbol);
  if (!normalized) return null;

  // 1. Direct match by candidate normalized name or raw name
  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.normalizedName === normalized || candidate.name === symbol) {
      return candidate;
    }
  }

  // 2. Match by candidate's displayName or requestSymbol
  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.displayName && normalizeSymbolName(candidate.displayName) === normalized) {
      return candidate;
    }
    if (candidate.requestSymbol && normalizeSymbolName(candidate.requestSymbol) === normalized) {
      return candidate;
    }
  }

  // 3. Match by baseAsset & quoteAsset
  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.baseAsset && candidate.quoteAsset) {
      const pair = `${candidate.baseAsset}${candidate.quoteAsset}`.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (pair === normalized) {
        return candidate;
      }
    }
  }

  return null;
}

function resolveSymbolId(symbol) {
  return findExactSymbolMatch(symbol)?.id || null;
}

function trendbarToBinanceKline(trendbar) {
  const low = Number(trendbar.low) / PRICE_SCALE;
  const open = (Number(trendbar.low) + Number(trendbar.deltaOpen || 0)) / PRICE_SCALE;
  const close = (Number(trendbar.low) + Number(trendbar.deltaClose || 0)) / PRICE_SCALE;
  const high = (Number(trendbar.low) + Number(trendbar.deltaHigh || 0)) / PRICE_SCALE;
  const openTime = Number(trendbar.utcTimestampInMinutes) * 60 * 1000;
  const volume = Number(trendbar.volume || 0);

  return [
    openTime,
    String(open),
    String(high),
    String(low),
    String(close),
    String(volume),
    openTime,
    '0',
    volume,
    '0',
    '0',
    '0',
  ];
}

module.exports = {
  cacheAssets,
  cacheSymbols,
  cacheSymbolDetails,
  findExactSymbolMatch,
  normalizeSymbolName,
  resolveSymbolId,
  trendbarToBinanceKline,
};
