function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function trimString(value, { max = 255, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : undefined;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (required && !trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

function enumValue(value, allowed, { required = false } = {}) {
  const normalized = trimString(value, { max: 64, required });
  if (normalized === undefined) return undefined;
  if (normalized === null) return null;

  const lower = normalized.toLowerCase();
  return allowed.includes(lower) ? lower : null;
}

function finiteNumber(value, { min = -Infinity, max = Infinity, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function isoDate(value, { required = false } = {}) {
  const normalized = trimString(value, { max: 32, required });
  if (normalized === undefined) return undefined;
  if (normalized === null || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
}

function timestampValue(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? null : undefined;
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

function currencyCode(value, { required = false } = {}) {
  const normalized = trimString(value, { max: 3, required });
  if (normalized === undefined) return undefined;
  if (normalized === null) return null;

  const upper = normalized.toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : null;
}

function rejectUnexpectedFields(body, allowedFields) {
  if (!isPlainObject(body)) return 'Payload must be a JSON object';

  const allowed = new Set(allowedFields);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  return unexpected.length > 0 ? `Unexpected fields: ${unexpected.join(', ')}` : null;
}

module.exports = {
  currencyCode,
  enumValue,
  finiteNumber,
  isPlainObject,
  isoDate,
  rejectUnexpectedFields,
  timestampValue,
  trimString,
};
