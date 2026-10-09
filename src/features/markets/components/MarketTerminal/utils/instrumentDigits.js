import api from '@/utils/common/serve';

export const instrumentDigitsCache = new Map();

export const getDatabaseInstrumentDigits = async (symbol) => {
  const key = String(symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!key) return null;
  if (instrumentDigitsCache.has(key)) return instrumentDigitsCache.get(key);
  try {
    const { data } = await api.get('/instruments', { params: { search: key } });
    const instruments = Array.isArray(data?.instruments) ? data.instruments : Array.isArray(data) ? data : [];
    const match = instruments.find((item) => {
      const sym = String(item?.symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      const name = String(item?.name || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      const dName = String(item?.displayName || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      return sym === key || name === key || dName === key || sym.startsWith(key) || key.startsWith(sym);
    });
    const digits = Number(match?.digits ?? 2);
    const resolved = Number.isInteger(digits) && digits >= 0 && digits <= 8 ? digits : null;
    instrumentDigitsCache.set(key, resolved);
    return resolved;
  } catch {
    return null;
  }
};

export const readInstrumentDigits = (digitsBySymbol, symbol) => (
  digitsBySymbol[String(symbol || '').replace(/[^a-z0-9]/gi, '').toUpperCase()]
);

export const countDecimalDigits = (value) => {
  const text = String(value ?? '');
  if (!text || text.includes('e') || text.includes('E')) return 0;
  const decimalPart = text.split('.')[1] || '';
  return decimalPart.replace(/0+$/, '').length;
};

export const inferPriceDigits = (tick, bid, ask) => {
  const configured = Number(tick?.digits ?? 2);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 8) {
    return Math.min(configured, 8);
  }
  const inferred = Math.min(Math.max(
    countDecimalDigits(tick?.bid ?? bid),
    countDecimalDigits(tick?.ask ?? ask),
    countDecimalDigits(tick?.last ?? null)
  ), 8);

  if (inferred > 0) return inferred;
  return null;
};
