function validateCredentials(payload) {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Payload must be an object' };
  }

  const { connectionId, apiKey, clientCode, password, totpSecret } = payload;

  if (typeof connectionId !== 'string' || !connectionId.trim()) {
    return { error: 'Connection ID is required' };
  }
  if (typeof apiKey !== 'string' || !apiKey.trim() || apiKey.length > 256) {
    return { error: 'Valid API Key is required' };
  }
  if (typeof clientCode !== 'string' || !clientCode.trim() || clientCode.length > 64) {
    return { error: 'Valid Client Code is required' };
  }
  if (typeof password !== 'string' || !password.trim() || password.length > 128) {
    return { error: 'Valid Password/PIN is required' };
  }
  if (typeof totpSecret !== 'string' || !totpSecret.trim() || totpSecret.length > 256) {
    return { error: 'Valid TOTP Secret Key is required' };
  }

  return {
    value: {
      connectionId: connectionId.trim(),
      apiKey: apiKey.trim(),
      clientCode: clientCode.trim(),
      password: password.trim(),
      totpSecret: totpSecret.trim(),
    },
  };
}

module.exports = { validateCredentials };
