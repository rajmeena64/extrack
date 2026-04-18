//contsants.js
// export const API_URL = "http://localhost:5000";


// export const WS_URL = "ws://localhost:5000";


// export const API_URL = "http://10.203.185.251:5000";
// export const WS_URL = "ws://10.203.185.251:5000";





// src/constants.js

const rawApiUrl = String(import.meta.env.VITE_URL || '').trim();
const rawWsUrl = String(import.meta.env.VITE_WS_URL || '').trim();

const normalizeUrl = (value) => value.replace(/\/+$/, '');

export const API_URL = normalizeUrl(rawApiUrl);
export const WS_URL = rawWsUrl
  ? normalizeUrl(rawWsUrl)
  : API_URL.replace(/^http/i, (protocol) => (protocol.toLowerCase() === 'https' ? 'wss' : 'ws'));
