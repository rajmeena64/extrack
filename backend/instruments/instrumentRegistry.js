const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJsonFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

function normalizeInstrument(rawInstrument, filePath) {
  const symbol = String(rawInstrument?.symbol || '').trim().toUpperCase();
  const name = String(rawInstrument?.name || '').trim();
  const type = String(rawInstrument?.type || '').trim().toLowerCase();
  const category = String(rawInstrument?.category || '').trim().toLowerCase();

  if (!symbol || !name || !type || !category) {
    throw new Error(`Invalid instrument in ${filePath}`);
  }

  return {
    symbol,
    name,
    type,
    category,
  };
}

function loadInstruments() {
  const instruments = [];
  const bySymbol = new Map();

  for (const filePath of listJsonFiles(DATA_DIR)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed)) {
      throw new Error(`Instrument file must contain an array: ${filePath}`);
    }

    for (const rawInstrument of parsed) {
      const instrument = normalizeInstrument(rawInstrument, filePath);

      if (bySymbol.has(instrument.symbol)) {
        throw new Error(`Duplicate instrument symbol: ${instrument.symbol}`);
      }

      bySymbol.set(instrument.symbol, instrument);
      instruments.push(instrument);
    }
  }

  return {
    instruments: Object.freeze(instruments),
    bySymbol,
  };
}

const registry = loadInstruments();

function normalizeSymbol(symbol) {
  return String(symbol || '').trim().toUpperCase();
}

function normalizeType(type) {
  const normalizedType = String(type || '').trim().toLowerCase();
  const aliases = {
    commodities: 'commodity',
    stocks: 'stock',
    indices: 'index',
  };

  return aliases[normalizedType] || normalizedType;
}

function getAllInstruments() {
  return registry.instruments;
}

function getInstrumentsByType(type) {
  const normalizedType = normalizeType(type);
  if (!normalizedType) return [];

  return registry.instruments.filter((instrument) => instrument.type === normalizedType);
}

function searchInstruments(query) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return registry.instruments;

  return registry.instruments.filter((instrument) => (
    instrument.symbol.toLowerCase().includes(normalizedQuery) ||
    instrument.name.toLowerCase().includes(normalizedQuery) ||
    instrument.type.toLowerCase().includes(normalizedQuery) ||
    instrument.category.toLowerCase().includes(normalizedQuery)
  ));
}

function getInstrumentBySymbol(symbol) {
  return registry.bySymbol.get(normalizeSymbol(symbol)) || null;
}

function isAllowedSymbol(symbol) {
  return Boolean(getInstrumentBySymbol(symbol));
}

module.exports = {
  getAllInstruments,
  getInstrumentsByType,
  searchInstruments,
  getInstrumentBySymbol,
  isAllowedSymbol,
};
