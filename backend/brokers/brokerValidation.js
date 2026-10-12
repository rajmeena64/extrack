function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value, field) {
  if (value === undefined) return { value: [] };
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return { error: `${field} must be an array of strings` };
  return { value: value.map((item) => item.trim()).filter(Boolean) };
}

function validateBroker(input = {}) {
  if (!isPlainObject(input)) return { error: 'Broker payload must be an object' };
  if (typeof input.name !== 'string' || !input.name.trim()) return { error: 'name is required' };
  if (input.name.trim().length > 150) return { error: 'name must be 150 characters or fewer' };
  if (input.logoPath !== undefined && input.logoPath !== null && typeof input.logoPath !== 'string') return { error: 'logoPath must be a string or null' };
  const arrays = {};
  for (const field of ['supportedInstruments', 'supportedTradeMethods', 'searchKeywords']) {
    const parsed = stringArray(input[field], field);
    if (parsed.error) return parsed;
    arrays[field] = parsed.value;
  }
  const importFieldMapping = input.importFieldMapping === undefined ? {} : input.importFieldMapping;
  if (!isPlainObject(importFieldMapping)) return { error: 'importFieldMapping must be a JSON object' };
  const isActive = input.isActive === undefined ? true : input.isActive;
  if (typeof isActive !== 'boolean') return { error: 'isActive must be a boolean' };
  const sortOrder = input.sortOrder === undefined ? 0 : input.sortOrder;
  if (!Number.isInteger(sortOrder)) return { error: 'sortOrder must be an integer' };
  return { value: { name: input.name.trim(), logoPath: input.logoPath?.trim() || null, ...arrays, importFieldMapping, isActive, sortOrder } };
}

module.exports = { isPlainObject, validateBroker };
