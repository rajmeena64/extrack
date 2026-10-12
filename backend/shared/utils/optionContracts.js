const BINANCE_OPTION = /^([A-Z0-9]{2,20})-(\d{2})(\d{2})(\d{2})-(\d+(?:\.\d+)?)-(C|P)$/;

function normalizeOptionContractInput(value) {
  const symbol = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9._:-]{1,64}$/.test(symbol) ? symbol : '';
}

function parseOptionContractSymbol(brokerSlug, value) {
  if (brokerSlug !== 'binance') return null;
  const symbol = normalizeOptionContractInput(value);
  const match = symbol.match(BINANCE_OPTION);
  if (!match || symbol.length > 64 || Number(match[5]) <= 0) return null;
  const year = 2000 + Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return {
    symbol,
    underlyingSymbol: match[1],
    expiryDate: `${year}-${match[3]}-${match[4]}`,
    strikePrice: match[5],
    optionType: match[6] === 'C' ? 'call' : 'put',
  };
}

module.exports = { normalizeOptionContractInput, parseOptionContractSymbol };
