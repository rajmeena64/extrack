export const DASHBOARD_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', shortLabel: 'Dollar', symbol: '$', flag: '/assets/flags/4x3/usd.svg' },
  { code: 'USC', label: 'US Cent', shortLabel: 'USC', symbol: '¢', flag: '/assets/flags/4x3/usd.svg' },
  { code: 'INR', label: 'Indian Rupee', shortLabel: 'INR', symbol: '₹', flag: '/assets/flags/4x3/inr.svg' },
  { code: 'EUR', label: 'Euro', shortLabel: 'Euro', symbol: '€', flag: '/assets/flags/4x3/eur.svg' },
  { code: 'GBP', label: 'British Pound', shortLabel: 'Pound', symbol: '£', flag: '/assets/flags/4x3/gbp.svg' },
  { code: 'JPY', label: 'Japanese Yen', shortLabel: 'Yen', symbol: '¥', flag: '/assets/flags/4x3/jpy.svg' },
  { code: 'AUD', label: 'Australian Dollar', shortLabel: 'AUD', symbol: 'A$', flag: '/assets/flags/4x3/aud.svg' },
  { code: 'CAD', label: 'Canadian Dollar', shortLabel: 'CAD', symbol: 'C$', flag: '/assets/flags/4x3/cad.svg' },
  { code: 'CHF', label: 'Swiss Franc', shortLabel: 'CHF', symbol: 'Fr', flag: '/assets/flags/4x3/chf.svg' },
  { code: 'AED', label: 'UAE Dirham', shortLabel: 'AED', symbol: 'AED', flag: '/assets/flags/4x3/aed.svg' },
  { code: 'SGD', label: 'Singapore Dollar', shortLabel: 'SGD', symbol: 'S$', flag: '/assets/flags/4x3/sgd.svg' },
];

export const CURRENCY_SYMBOLS = {
  USD: '$', USC: '¢', USDT: '$', USDC: '$', INR: '₹', EUR: '€',
  GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'Fr', AED: 'AED', SGD: 'S$',
};

const CURRENCY_MAP = DASHBOARD_CURRENCIES.reduce((map, c) => {
  map[c.code] = c;
  return map;
}, {});

export const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[String(code || '').trim().toUpperCase()] || CURRENCY_MAP[String(code || '').trim().toUpperCase()]?.symbol || '$';

export const normalizeCurrencyCode = (code, fallback = 'USD') => {
  const norm = String(code || '').trim().toUpperCase();
  return CURRENCY_MAP[norm] ? norm : fallback;
};

export const getCurrencyMeta = (code) => {
  const norm = normalizeCurrencyCode(code);
  return CURRENCY_MAP[norm] || { code: norm, symbol: getCurrencySymbol(norm) };
};

export function formatCurrency(value, currencyCode, options = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '--';
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = options.decimals ?? 2;
  const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const sign = num < 0 ? '-' : (options.showPlus && num > 0 ? '+' : '');
  return `${sign}${symbol}${formatted}`;
}

export function formatCompactCurrency(value, currencyCode) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${getCurrencySymbol(currencyCode)}0`;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const sym = getCurrencySymbol(currencyCode);
  if (abs >= 100000) return `${sign}${sym}${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}${sym}${(abs / 1000).toFixed(2)}K`;
  return `${sign}${sym}${abs.toFixed(0)}`;
}

export const convertCurrency = (value) => Number(value) || 0;
export const convertTradePnlForDisplay = (trade) => trade;
