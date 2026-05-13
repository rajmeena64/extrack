const FOREX_SYMBOL_RE = /^[A-Z]{6}$/;
const METAL_SYMBOL_RE = /^X(AU|AG)USD$/;
const FOREX_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"]);
const BROKER_SUFFIXES = ["ECN", "RAW", "PRO", "MINI", "MICRO", "CASH", "PERP", "SWAP", "FUTURES"];
const KNOWN_QUOTES = ["USDT", "USDC", "BUSD", "USD"];

export function isForexPair(symbol) {
  return (
    FOREX_SYMBOL_RE.test(symbol) &&
    FOREX_CURRENCIES.has(symbol.slice(0, 3)) &&
    FOREX_CURRENCIES.has(symbol.slice(3, 6))
  );
}

function stripKnownSuffixes(symbol) {
  let normalized = symbol;

  for (const suffix of BROKER_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized.length > suffix.length + 2) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  return normalized;
}

function findForexPair(symbol) {
  for (let index = 0; index <= symbol.length - 6; index += 1) {
    const candidate = symbol.slice(index, index + 6);
    if (isForexPair(candidate)) {
      return candidate;
    }
  }

  return "";
}

function findOriginalCaseQuote(rawSymbol) {
  for (const quote of KNOWN_QUOTES) {
    const quoteIndex = rawSymbol.indexOf(quote);
    if (quoteIndex > 0) {
      return rawSymbol.slice(0, quoteIndex + quote.length).replace(/[^A-Z0-9]/g, "");
    }
  }

  return "";
}

export function normalizeStoredSymbol(value) {
  let rawSymbol = String(value || "").trim();

  if (!rawSymbol) return "";

  if (rawSymbol.includes(":")) {
    rawSymbol = rawSymbol.split(":").pop();
  }

  const originalCaseQuote = findOriginalCaseQuote(rawSymbol.replace(/\s+/g, ""));

  let normalized = rawSymbol
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");

  normalized = stripKnownSuffixes(normalized);

  const forexCandidate = findForexPair(normalized);
  if (isForexPair(forexCandidate)) {
    return forexCandidate;
  }

  const metalCandidate = normalized.match(/X(AU|AG)USD/);
  if (metalCandidate) {
    return metalCandidate[0];
  }

  if (originalCaseQuote) {
    return originalCaseQuote;
  }

  for (const quote of KNOWN_QUOTES) {
    const quoteIndex = normalized.indexOf(quote);
    if (quoteIndex > 0) {
      return normalized.slice(0, quoteIndex + quote.length);
    }
  }

  const indexedCandidate = normalized.match(/^([A-Z]{2,10}\d{2,})[A-Z]*$/);
  if (indexedCandidate) {
    return indexedCandidate[1];
  }

  return normalized;
}
