const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_PATTERN = /^(?:\.{3}|placeholder|change[-_ ]?me|your[-_ ]?(?:api|secret)[-_ ]?key)$/i;
function validateCredentials(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Credential payload must be an object' };
  const unexpected = Object.keys(input).filter((key) => !['connectionId', 'environment', 'apiKey', 'secretKey'].includes(key));
  if (unexpected.length) return { error: `Unexpected fields: ${unexpected.join(', ')}` };
  if (!UUID_PATTERN.test(String(input.connectionId || ''))) return { error: 'connectionId must be a valid UUID' };
  if (!['real', 'demo'].includes(input.environment)) return { error: 'environment must be real or demo' };
  for (const field of ['apiKey', 'secretKey']) {
    if (typeof input[field] !== 'string') return { error: `${field} must be a string` };
    const value = input[field].trim();
    if (!value || PLACEHOLDER_PATTERN.test(value)) return { error: `${field} is required` };
    if (value.length > 256) return { error: `${field} must be 256 characters or fewer` };
  }
  return { value: {
    connectionId: input.connectionId,
    environment: input.environment,
    apiKey: input.apiKey.trim(),
    secretKey: input.secretKey.trim(),
  } };
}
module.exports = { UUID_PATTERN, validateCredentials };
