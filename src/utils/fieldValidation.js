const DECIMAL_INPUT_PATTERN = /^\d*(?:\.\d*)?$/;
const SIGNED_DECIMAL_INPUT_PATTERN = /^-?\d*(?:\.\d*)?$/;

export function sanitizeDecimalInput(value) {
  const text = String(value || "").trim();
  return DECIMAL_INPUT_PATTERN.test(text) ? text : null;
}

export function sanitizeSignedDecimalInput(value) {
  const text = String(value || "").trim();
  return SIGNED_DECIMAL_INPUT_PATTERN.test(text) ? text : null;
}

export function parseTradeNumber(value, { min = -Infinity, required = true } = {}) {
  const text = String(value ?? "").trim();

  if (text === "") {
    return required ? null : 0;
  }

  const numericValue = Number(text);
  if (!Number.isFinite(numericValue) || numericValue < min) {
    return null;
  }

  return numericValue;
}
