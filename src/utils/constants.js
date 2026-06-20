const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const toWebSocketUrl = (value) => {
  return normalizeUrl(value).replace(/^http/i, (protocol) =>
    protocol.toLowerCase() === 'https' ? 'wss' : 'ws'
  );
};

const resolveApiUrl = () => {
  const envUrl = normalizeUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_URL);

  if (!envUrl) {
    console.error('Missing required frontend env variable: VITE_API_URL or VITE_URL');
  }

  return envUrl;
};

const resolveWsUrl = (apiUrl) => {
  const envWsUrl = normalizeUrl(import.meta.env.VITE_WS_URL);

  return toWebSocketUrl(envWsUrl || apiUrl);
};

export const API_URL = resolveApiUrl();
export const WS_URL = resolveWsUrl(API_URL);
