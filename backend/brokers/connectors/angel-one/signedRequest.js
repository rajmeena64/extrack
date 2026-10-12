const SMARTAPI_BASE_URL = 'https://apiconnect.angelbroking.com';

async function smartApiRequest(path, options = {}) {
  const {
    method = 'GET',
    apiKey = '',
    jwtToken = '',
    body = null,
    timeoutMs = 10000,
  } = options;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': '127.0.0.1',
    'X-ClientPublicIP': '127.0.0.1',
    'X-MACAddress': 'FE-80-00-00-00-00',
    'X-PrivateKey': apiKey,
  };

  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${SMARTAPI_BASE_URL}${path}`, fetchOptions);
    clearTimeout(timeoutId);

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.status === false) {
      const message = json.message || response.statusText;
      const error = new Error(`SmartAPI Error: ${message}`);
      const errCode = String(json.errorcode || '').toUpperCase();
      const isCredentialError = !response.ok || json.status === false || errCode.startsWith('AG') || errCode.startsWith('AB') || /invalid|auth|credential|pin|totp|key|password|permission|denied|token/i.test(message);
      error.code = isCredentialError ? 'INVALID_CREDENTIALS' : 'PROVIDER_ERROR';
      error.details = message;
      throw error;
    }

    return json.data ?? json;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const err = new Error('Angel One SmartAPI request timed out');
      err.code = 'TIMEOUT';
      throw err;
    }
    throw error;
  }
}

module.exports = { smartApiRequest, SMARTAPI_BASE_URL };
