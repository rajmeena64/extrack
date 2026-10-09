const OPTION_CONTRACT_PATTERN = /^([A-Z0-9]{2,20})-(\d{2})(\d{2})(\d{2})-(\d+(?:\.\d+)?)-(C|P)$/;

export function normalizeStoredSymbol(value) {
  let rawSymbol = String(value || "").trim();
  if (!rawSymbol) return "";
  if (rawSymbol.includes(":")) {
    const parts = rawSymbol.split(":");
    rawSymbol = parts[0].includes("/") ? parts[0] : parts.pop();
  }
  rawSymbol = rawSymbol.replace(/\s+/g, "");
  const separatorSuffixMatch = rawSymbol.match(/^(.+?)[._-][a-z][a-z0-9]*$/);
  if (separatorSuffixMatch) {
    rawSymbol = separatorSuffixMatch[1];
  } else {
    const lowercaseSuffixMatch = rawSymbol.match(/^([A-Z0-9]{3,})([a-z][a-z0-9]*)$/);
    if (lowercaseSuffixMatch) {
      rawSymbol = lowercaseSuffixMatch[1];
    }
  }
  return rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeOptionContractInput(arg1, arg2) {
  const value = arg2 !== undefined ? arg2 : arg1;
  return String(value || '').toUpperCase().replace(/\s+/g, '').slice(0, 64).replace(/[^A-Z0-9.-]/g, '');
}

export function parseOptionContractSymbol(arg1, arg2) {
  const symbol = normalizeOptionContractInput(arg1, arg2);
  const match = symbol.match(OPTION_CONTRACT_PATTERN);
  if (!match || Number(match[5]) <= 0) return null;
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
