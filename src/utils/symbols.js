export function normalizeStoredSymbol(value) {
  let rawSymbol = String(value || "").trim().toUpperCase();

  if (!rawSymbol) return "";

  if (rawSymbol.includes(":")) {
    rawSymbol = rawSymbol.split(":").pop();
  }

  return rawSymbol
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}
