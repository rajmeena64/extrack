//contsants.js
// export const API_URL = "http://localhost:5000";


// export const WS_URL = "ws://localhost:5000";


// export const API_URL = "http://10.203.185.251:5000";
// export const WS_URL = "ws://10.203.185.251:5000";





// src/constants.js

const PROD_API_FALLBACK = 'https://extrack-backend-9xk0.onrender.com';
const DEV_API_FALLBACK = 'http://localhost:5000';

const normalizeUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const getBrowserHostname = () => {
  if (typeof window === 'undefined') return '';
  return String(window.location.hostname || '').trim().toLowerCase();
};

const isLocalHostname = (hostname) => {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const isLocalUrl = (value) => {
  try {
    return isLocalHostname(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
};

const resolveApiUrl = () => {
  const envUrl = normalizeUrl(import.meta.env.VITE_URL);
  const hostname = getBrowserHostname();

  if (envUrl && (isLocalHostname(hostname) || !isLocalUrl(envUrl))) {
    return envUrl;
  }

  return isLocalHostname(hostname) ? DEV_API_FALLBACK : PROD_API_FALLBACK;
};

const resolveWsUrl = (apiUrl) => {
  const envWsUrl = normalizeUrl(import.meta.env.VITE_WS_URL);
  const hostname = getBrowserHostname();

  if (envWsUrl && (isLocalHostname(hostname) || !isLocalUrl(envWsUrl))) {
    return envWsUrl.replace(/^http/i, (protocol) =>
      protocol.toLowerCase() === 'https' ? 'wss' : 'ws'
    );
  }

  return apiUrl.replace(/^http/i, (protocol) =>
    protocol.toLowerCase() === 'https' ? 'wss' : 'ws'
  );
};

export const API_URL = resolveApiUrl();
export const WS_URL = resolveWsUrl(API_URL);
