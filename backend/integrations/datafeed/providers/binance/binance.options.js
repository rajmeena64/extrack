const OPTIONS_BASE_URL = 'https://eapi.binance.com';
const VALID_INTERVALS = new Set([
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '8h', '12h',
  '1d', '3d', '1w', '1M',
]);

const fetchJsonKlines = async (baseUrl, path, params) => {
  const url = `${baseUrl}${path}?${params.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: 'Binance API error',
        status: response.status,
        details: text.substring(0, 300),
      };
    }

    const error = new Error(payload?.msg || payload?.error || payload?.details || `Binance API error (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Fetch Binance Option Contract mark klines.
 */
async function fetchOptionMarkKlines({ contractSymbol, interval, startTime, endTime, limit = 1000 }) {
  if (!contractSymbol || !VALID_INTERVALS.has(interval)) {
    throw new Error('Invalid option chart parameters');
  }

  const params = new URLSearchParams({
    symbol: contractSymbol,
    interval,
    limit: String(Math.min(Math.max(Number(limit) || 1000, 1), 1000)),
  });

  if (Number.isFinite(startTime)) params.set('startTime', String(Math.floor(startTime)));
  if (Number.isFinite(endTime)) params.set('endTime', String(Math.floor(endTime)));

  return fetchJsonKlines(OPTIONS_BASE_URL, '/eapi/v1/markKlines', params);
}

module.exports = {
  fetchOptionMarkKlines,
};
