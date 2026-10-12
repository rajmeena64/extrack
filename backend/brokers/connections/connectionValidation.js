const SENSITIVE_KEY_PATTERN = /(password|token|authorization|api[-_ ]?key|secret|cookie|credential|accesskey|refresh)/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function containsSensitiveKey(value, depth = 0) {
  if (depth > 5 || !value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => containsSensitiveKey(item, depth + 1));
  return Object.entries(value).some(([key, item]) => (
    SENSITIVE_KEY_PATTERN.test(key) || containsSensitiveKey(item, depth + 1)
  ));
}

function optionalString(value, field, max) {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { error: `${field} must be a string` };
  const normalized = value.trim();
  if (!normalized) return { value: null };
  if (normalized.length > max) return { error: `${field} must be ${max} characters or fewer` };
  return { value: normalized };
}

function validateMetadata(value) {
  if (value === undefined) return { value: {} };
  if (!isPlainObject(value)) return { error: 'metadata must be a JSON object' };
  if (Object.prototype.hasOwnProperty.call(value, 'binanceRetention')) return { error: 'metadata contains a reserved field' };
  if (containsSensitiveKey(value)) return { error: 'metadata must not contain credentials or secrets' };
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 16384) return { error: 'metadata must be 16 KB or smaller' };
  return { value };
}

function validateCreateConnection(input) {
  if (!isPlainObject(input)) return { error: 'Connection payload must be an object' };
  const allowed = new Set(['integrationId', 'externalAccountId', 'accountName', 'metadata']);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };
  if (typeof input.integrationId !== 'string' || !UUID_PATTERN.test(input.integrationId)) {
    return { error: 'integrationId must be a valid UUID' };
  }
  const externalAccountId = optionalString(input.externalAccountId, 'externalAccountId', 180);
  if (externalAccountId.error) return externalAccountId;
  const accountName = optionalString(input.accountName, 'accountName', 150);
  if (accountName.error) return accountName;
  const metadata = validateMetadata(input.metadata);
  if (metadata.error) return metadata;
  return {
    value: {
      integrationId: input.integrationId,
      externalAccountId: externalAccountId.value,
      accountName: accountName.value,
      metadata: metadata.value,
    },
  };
}

function validateUpdateConnection(input) {
  if (!isPlainObject(input)) return { error: 'Connection payload must be an object' };
  const allowed = new Set(['accountName', 'metadata']);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };
  if (!Object.keys(input).length) return { error: 'At least one field is required' };
  const value = {};
  if (Object.prototype.hasOwnProperty.call(input, 'accountName')) {
    const accountName = optionalString(input.accountName, 'accountName', 150);
    if (accountName.error) return accountName;
    value.accountName = accountName.value;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'metadata')) {
    const metadata = validateMetadata(input.metadata);
    if (metadata.error) return metadata;
    value.metadata = metadata.value;
  }
  return { value };
}

function validateIntegrationSelection(input) {
  if (!isPlainObject(input)) return { error: 'Connection payload must be an object' };
  if (Object.keys(input).length !== 1 || !Object.prototype.hasOwnProperty.call(input, 'integrationId')) {
    return { error: 'Only integrationId is allowed' };
  }
  if (typeof input.integrationId !== 'string' || !UUID_PATTERN.test(input.integrationId)) {
    return { error: 'integrationId must be a valid UUID' };
  }
  return { value: { integrationId: input.integrationId } };
}

module.exports = {
  UUID_PATTERN,
  containsSensitiveKey,
  validateCreateConnection,
  validateIntegrationSelection,
  validateUpdateConnection,
};
