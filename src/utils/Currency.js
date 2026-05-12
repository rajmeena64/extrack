export const DASHBOARD_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', shortLabel: 'Dollar', symbol: '$', flag: '/assets/flags/4x3/usd.svg' },
  { code: 'USC', label: 'US Cent', shortLabel: 'USC', symbol: '¢', flag: '/assets/flags/4x3/usd.svg' },
  { code: 'INR', label: 'Indian Rupee', shortLabel: 'INR', symbol: '₹', flag: '/assets/flags/4x3/inr.svg' },
  { code: 'CNY', label: 'Chinese Yuan', shortLabel: 'Yuan', symbol: '¥', flag: '/assets/flags/4x3/cny.svg' },
  { code: 'EUR', label: 'Euro', shortLabel: 'Euro', symbol: '€', flag: '/assets/flags/4x3/eur.svg' },
];

const USD_VALUE = {
  USD: 1,
  USC: 0.01,
  INR: 1 / 94.425,
  CNY: 1 / 6.804,
  EUR: 1.175,
};

const CURRENCY_MAP = DASHBOARD_CURRENCIES.reduce((map, currency) => {
  map[currency.code] = currency;
  return map;
}, {});

export function normalizeCurrencyCode(code, fallback = 'USD') {
  const normalized = String(code || '').trim().toUpperCase();
  return CURRENCY_MAP[normalized] ? normalized : fallback;
}

export function getCurrencyMeta(code) {
  return CURRENCY_MAP[normalizeCurrencyCode(code)] || CURRENCY_MAP.USD;
}

export function convertCurrency(value, fromCode, toCode) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  const from = normalizeCurrencyCode(fromCode);
  const to = normalizeCurrencyCode(toCode);
  if (from === to) return numericValue;

  return (numericValue * USD_VALUE[from]) / USD_VALUE[to];
}

export function formatCurrency(value, currencyCode, options = {}) {
  const num = Number(value);
  const currency = getCurrencyMeta(currencyCode);
  const decimals = options.decimals ?? 2;

  if (!Number.isFinite(num)) {
    return `${currency.symbol}0.00`;
  }

  const sign = num < 0 ? '-' : '';
  return `${sign}${currency.symbol}${Math.abs(num).toFixed(decimals)}`;
}

export function formatCompactCurrency(value, currencyCode) {
  const num = Number(value);
  const currency = getCurrencyMeta(currencyCode);
  if (!Number.isFinite(num)) return `${currency.symbol}0`;

  const absolute = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (absolute >= 1000) {
    return `${sign}${currency.symbol}${(absolute / 1000).toFixed(2)}K`;
  }

  return `${sign}${currency.symbol}${absolute.toFixed(0)}`;
}
