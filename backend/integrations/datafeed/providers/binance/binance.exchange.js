const FUTURES_BASE_URL = 'https://fapi.binance.com';

/**
 * Fetch active Binance USD-M futures trading symbols list.
 */
async function getExchangeSymbols() {
  const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/exchangeInfo`);

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.symbols || [])
    .filter((s) => s.status === 'TRADING')
    .map((s) => ({
      symbol: s.symbol,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      contractType: s.contractType,
    }));
}

/**
 * Validate a symbol on Binance USD-M futures.
 */
async function validateFuturesSymbol(rawSymbol) {
  const symbolUpper = String(rawSymbol || '').trim().toUpperCase();
  const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/exchangeInfo`);

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data = await response.json();
  const symbolInfo = (data.symbols || []).find((s) => s.symbol === symbolUpper);

  return {
    symbol: symbolUpper,
    isValid: Boolean(symbolInfo),
    info: symbolInfo || null,
    message: symbolInfo
      ? 'Valid futures symbol'
      : 'Invalid symbol for USD-M Futures. Try BTCUSDT, ETHUSDT, etc.',
  };
}

module.exports = {
  getExchangeSymbols,
  validateFuturesSymbol,
};
