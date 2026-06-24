function normalizeStoredSymbol(value) {
  let rawSymbol = String(value || "").trim();

  if (!rawSymbol) return "";

  if (rawSymbol.includes(":")) {
    rawSymbol = rawSymbol.split(":").pop();
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

  return rawSymbol
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

module.exports = {
  normalizeStoredSymbol,
};
