// ctrader.js

const axios = require('axios');
const WebSocket = require('ws');
const protobuf = require("protobufjs");
const fs = require('fs');
const _path = require('path');
const pool = require('../config/database');
const { authCheck } = require('./auth');
const { normalizeStoredSymbol } = require('../utils/symbols');

let root;
let ws;
let heartbeatInterval;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let isConnecting = false;
let tokenStoreReady = false;
let tokensLoadedFromStore = false;
let tokenRefreshBlockedUntil = 0;
let lastTokenRefreshError = '';
const ADMIN_ACCOUNT_TYPES = new Set(['admin', 'superadmin']);
const PROTO_DIR = _path.join(__dirname, '..', 'proto');
const PRICE_SCALE = 100000;
const CTRADER_PERIODS = {
  M1: 1,
  M2: 2,
  M3: 3,
  M4: 4,
  M5: 5,
  M10: 6,
  M15: 7,
  M30: 8,
  H1: 9,
  H4: 10,
  H12: 11,
  D1: 12,
  W1: 13,
  MN1: 14,
};
const CTRADER_INTERVALS = {
  '1m': CTRADER_PERIODS.M1,
  '3m': CTRADER_PERIODS.M3,
  '5m': CTRADER_PERIODS.M5,
  '15m': CTRADER_PERIODS.M15,
  '30m': CTRADER_PERIODS.M30,
  '1h': CTRADER_PERIODS.H1,
  '4h': CTRADER_PERIODS.H4,
  '1d': CTRADER_PERIODS.D1,
  '1w': CTRADER_PERIODS.W1,
  '1M': CTRADER_PERIODS.MN1,
};
const RESPONSE_TYPE_NAMES = {
  2101: 'ProtoOAApplicationAuthRes',
  2103: 'ProtoOAAccountAuthRes',
  2115: 'ProtoOASymbolsListRes',
  2138: 'ProtoOAGetTrendbarsRes',
  2142: 'ProtoOAErrorRes',
  2146: 'ProtoOAGetTickDataRes',
};
const EXPECTED_RESPONSE_BY_REQUEST = {
  2100: 2101,
  2102: 2103,
  2114: 2115,
  2137: 2138,
  2145: 2146,
};

async function requireCtraderAdmin(req, res, next) {
  try {
    const userResult = await pool.query(
      `SELECT "accountType", "isDeleted" FROM public."user" WHERE "ID" = $1`,
      [req.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].isDeleted) {
      return res.status(403).json({ success: false, error: 'Admin account not found' });
    }

    const accountType = String(userResult.rows[0].accountType || '').toLowerCase();
    if (!ADMIN_ACCOUNT_TYPES.has(accountType)) {
      return res.status(403).json({
        success: false,
        error: 'cTrader integration is restricted to admin users',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify cTrader access',
    });
  }
}

// =======================
// CONFIG
// =======================
const ctraderConfig = {
  clientId: process.env.CTRADER_CLIENT_ID,
  clientSecret: process.env.CTRADER_CLIENT_SECRET,

  accessToken: process.env.CTRADER_ACCESS_TOKEN || '',
  refreshToken: process.env.CTRADER_REFRESH_TOKEN || '',
  expiresAt: Number(
    process.env.CTRADER_EXPIRES_AT ||
    (process.env.CTRADER_ACCESS_TOKEN ? Date.now() + (25 * 24 * 60 * 60 * 1000) : 0)
  ),

  accountId: process.env.CTRADER_ACCOUNT_ID ? Number(process.env.CTRADER_ACCOUNT_ID) : null,
  isDemo: String(process.env.CTRADER_IS_DEMO || 'true') === 'true',
  
  // Store symbols and current symbol ID
  symbols: new Map(),
  currentSymbolId: null,
  
  // Store accounts info
  accounts: [],
  currentAccount: null,
  isAppAuthed: false,
  isAccountAuthed: false,
};

async function ensureCtraderTokenStore() {
  if (tokenStoreReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_integrations (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      account_id BIGINT,
      is_demo BOOLEAN,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  tokenStoreReady = true;
}

async function loadCtraderTokensFromStore() {
  if (tokensLoadedFromStore) return;
  tokensLoadedFromStore = true;

  try {
    await ensureCtraderTokenStore();

    const result = await pool.query(
      `SELECT account_id, is_demo, access_token, refresh_token, expires_at
       FROM admin_integrations
       WHERE id = $1`,
      ['ctrader']
    );

    const row = result.rows[0];
    if (!row) return;

    if (row.account_id) {
      ctraderConfig.accountId = Number(row.account_id);
    }

    if (typeof row.is_demo === 'boolean') {
      ctraderConfig.isDemo = row.is_demo;
    }

    if (row.access_token) {
      ctraderConfig.accessToken = row.access_token;
    }

    if (row.refresh_token) {
      ctraderConfig.refreshToken = row.refresh_token;
    }

    if (row.expires_at) {
      ctraderConfig.expiresAt = Number(row.expires_at);
    } else if (row.access_token) {
      ctraderConfig.expiresAt = Date.now() + (25 * 24 * 60 * 60 * 1000);
    }

  } catch (error) {
    lastTokenRefreshError = error.message;
  }
}

async function saveCtraderTokensToStore() {
  try {
    await ensureCtraderTokenStore();

    await pool.query(
      `INSERT INTO admin_integrations
       (id, provider, account_id, is_demo, access_token, refresh_token, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         provider = EXCLUDED.provider,
         account_id = EXCLUDED.account_id,
         is_demo = EXCLUDED.is_demo,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        'ctrader',
        'ctrader',
        ctraderConfig.accountId || null,
        Boolean(ctraderConfig.isDemo),
        ctraderConfig.accessToken || null,
        ctraderConfig.refreshToken || null,
        Number(ctraderConfig.expiresAt || 0),
      ]
    );
  } catch (error) {
    lastTokenRefreshError = error.message;
  }
}

// =======================
// CHECK PROTO FILES EXIST
// =======================
function checkProtoFiles() {
  const protoFiles = [
    "OpenApiMessages.proto",
    "OpenApiModelMessages.proto",
    "OpenApiCommonMessages.proto",
    "OpenApiCommonModelMessages.proto"
  ];
  
  for (const file of protoFiles) {
    const protoPath = _path.join(PROTO_DIR, file);
    if (!fs.existsSync(protoPath)) {
      throw new Error(`Proto file not found: ${protoPath}`);
    }
  }
  return true;
}

// =======================
// LOAD PROTO
// =======================
async function loadProtos() {
  try {
    checkProtoFiles();
    
    root = await protobuf.load([
      _path.join(PROTO_DIR, "OpenApiMessages.proto"),
      _path.join(PROTO_DIR, "OpenApiModelMessages.proto"),
      _path.join(PROTO_DIR, "OpenApiCommonMessages.proto"),
      _path.join(PROTO_DIR, "OpenApiCommonModelMessages.proto")
    ]);

  } catch (err) {
    throw err;
  }
}

// =======================
// GET ACCOUNTS VIA WEB API
// =======================
async function getAccountsViaWeb() {
  try {
    // Try the correct cTrader API endpoint for getting accounts
    const response = await axios.get(
      "https://api.ctrader.com/v2/accounts",
      {
        headers: {
          'Authorization': `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    ctraderConfig.accounts = response.data || [];
    
    if (ctraderConfig.accounts.length > 0) {
      // Find the demo account
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true || acc.type === 'demo');
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false || acc.type === 'live');
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.id || demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.id || liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].id || ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    return [];
  }
}

// =======================
// GET ACCOUNTS VIA OPENAPI
// =======================
async function getAccountsViaOpenAPI() {
  try {
    const response = await axios.get(
      "https://openapi.ctrader.com/v1/accounts",
      {
        headers: {
          'Authorization': `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    ctraderConfig.accounts = response.data.accounts || [];
    
    if (ctraderConfig.accounts.length > 0) {
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true);
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false);
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    return [];
  }
}

// =======================
// GET ACCOUNTS - TRY BOTH METHODS
// =======================
async function getAccounts() {
  // Try both API endpoints
  let accounts = await getAccountsViaOpenAPI();
  
  if (accounts.length === 0) {
    accounts = await getAccountsViaWeb();
  }
  
  return accounts;
}

// =======================
// REFRESH TOKEN
// =======================
async function refreshAccessToken() {
  await loadCtraderTokensFromStore();

  if (Date.now() < tokenRefreshBlockedUntil) {
    return false;
  }

  if (!ctraderConfig.refreshToken || !ctraderConfig.clientId || !ctraderConfig.clientSecret) {
    lastTokenRefreshError = 'cTrader refresh token, client id, or client secret is missing';
    tokenRefreshBlockedUntil = Date.now() + (5 * 60 * 1000);
    return false;
  }

  try {
    const res = await axios.post(
      "https://openapi.ctrader.com/apps/token",
      null,
      {
        params: {
          grant_type: "refresh_token",
          refresh_token: ctraderConfig.refreshToken,
          client_id: ctraderConfig.clientId,
          client_secret: ctraderConfig.clientSecret,
        },
      }
    );

    const data = res.data;

    if (data?.errorCode) {
      throw new Error(`${data.errorCode}: ${data.description || 'cTrader token refresh failed'}`);
    }

    const accessToken = data.accessToken || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token;
    const expiresIn = data.expiresIn || data.expires_in || 1800;

    if (!accessToken) {
      throw new Error('cTrader token refresh response did not include an access token');
    }

    ctraderConfig.accessToken = accessToken;
    ctraderConfig.refreshToken = refreshToken || ctraderConfig.refreshToken;
    ctraderConfig.expiresAt = Date.now() + (Number(expiresIn) * 1000);

    await saveCtraderTokensToStore();

    tokenRefreshBlockedUntil = 0;
    lastTokenRefreshError = '';
    return true;
  } catch (err) {
    lastTokenRefreshError = err.response?.data?.description || err.message;
    tokenRefreshBlockedUntil = Date.now() + (5 * 60 * 1000);
    return false;
  }
}

// =======================
// ENSURE TOKEN VALID
// =======================
async function ensureValidToken() {
  await loadCtraderTokensFromStore();

  if (Date.now() >= (ctraderConfig.expiresAt - (5 * 60 * 1000))) {
    return await refreshAccessToken();
  }
  return true;
}

// =======================
// SEND MESSAGE WITH REQUEST ID
// =======================
let requestIdCounter = 1;
const pendingRequests = new Map();
let requestQueue = Promise.resolve();

function sendMessage(payloadType, payloadData, waitForResponse = false) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return null;
  }
  
  try {
    const Message = root.lookupType("ProtoMessage");
    const requestId = requestIdCounter++;
    
    let payloadTypeName;
    switch(payloadType) {
      case 2100: payloadTypeName = "ProtoOAApplicationAuthReq"; break;
      case 2102: payloadTypeName = "ProtoOAAccountAuthReq"; break;
      case 2114: payloadTypeName = "ProtoOASymbolsListReq"; break;
      case 51: payloadTypeName = "ProtoHeartbeatEvent"; break;
      case 2137: payloadTypeName = "ProtoOAGetTrendbarsReq"; break;
      case 2145: payloadTypeName = "ProtoOAGetTickDataReq"; break;
      default: payloadTypeName = null;
    }
    
    let encodedPayload;
    if (payloadTypeName) {
      const PayloadType = root.lookupType(payloadTypeName);
      const verificationError = PayloadType.verify(payloadData);
      if (verificationError) {
        throw new Error(`${payloadTypeName} ${verificationError}`);
      }
      encodedPayload = PayloadType.encode(payloadData).finish();
    } else {
      encodedPayload = payloadData;
    }
    
    const msg = Message.create({
      payloadType: payloadType,
      payload: encodedPayload,
      requestId: requestId,
    });
    
    if (waitForResponse) {
      pendingRequests.set(requestId, { 
        payloadType, 
        sentAt: Date.now(),
        resolve: null,
        reject: null
      });
    }
    
    ws.send(Message.encode(msg).finish());
    return requestId;
  } catch (err) {
    return null;
  }
}

function waitForResponse(requestId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const pending = pendingRequests.get(requestId);

    if (!pending) {
      reject(new Error('cTrader request was not queued'));
      return;
    }

    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('cTrader request timed out'));
    }, timeoutMs);

    pending.resolve = (value) => {
      clearTimeout(timeout);
      resolve(value);
    };

    pending.reject = (error) => {
      clearTimeout(timeout);
      reject(error);
    };
  });
}

function findPendingRequestByResponseType(responsePayloadType) {
  const matches = [];

  for (const [pendingRequestId, pending] of pendingRequests.entries()) {
    if (EXPECTED_RESPONSE_BY_REQUEST[pending.payloadType] === responsePayloadType) {
      matches.push([pendingRequestId, pending]);
    }
  }

  if (matches.length === 1) {
    return {
      requestId: matches[0][0],
      pending: matches[0][1],
    };
  }

  return null;
}

async function requestMessage(payloadType, payloadData, timeoutMs = 15000) {
  const runRequest = async () => {
    const requestId = sendMessage(payloadType, payloadData, true);

    if (!requestId) {
      throw new Error('Failed to send cTrader request');
    }

    return waitForResponse(requestId, timeoutMs);
  };

  const queuedRequest = requestQueue.catch(() => {}).then(runRequest);
  requestQueue = queuedRequest.catch(() => {});
  return queuedRequest;
}

// =======================
// APP AUTH
// =======================
function sendAppAuth() {
  const payload = {
    clientId: ctraderConfig.clientId,
    clientSecret: ctraderConfig.clientSecret,
  };
  
  sendMessage(2100, payload);
}

// =======================
// ACCOUNT AUTH
// =======================
function sendAccountAuth() {
  if (!ctraderConfig.accountId) {
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    accessToken: ctraderConfig.accessToken,
  };
  
  sendMessage(2102, payload);
}

// =======================
// REQUEST SYMBOLS
// =======================
function _requestSymbols() {
  if (!ctraderConfig.accountId) {
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
  };
  
  sendMessage(2114, payload);
}

async function requestSymbolsAsync() {
  if (!ctraderConfig.accountId) {
    throw new Error("No cTrader account ID available");
  }

  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
  };

  const symbolsData = await requestMessage(2114, payload);
  cacheSymbols(symbolsData);
  return Array.from(ctraderConfig.symbols.values());
}

// =======================
// REQUEST CANDLES
// =======================
function _requestCandles(symbolId = null, period = CTRADER_PERIODS.M1, count = 100) {
  const targetSymbolId = symbolId || ctraderConfig.currentSymbolId;
  
  if (!targetSymbolId) {
    return;
  }
  
  if (!ctraderConfig.accountId) {
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    symbolId: targetSymbolId,
    period: period,
    count: count,
  };
  
  sendMessage(2137, payload);
}

function normalizeSymbolName(symbolName) {
  return String(symbolName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function cacheSymbols(symbolsData) {
  if (!symbolsData?.symbols?.length && !symbolsData?.symbol?.length) {
    return;
  }

  const symbols = symbolsData.symbols || symbolsData.symbol || [];
  symbols.forEach((symbol) => {
    const id = Number(symbol.symbolId);

    if (!Number.isFinite(id)) {
      return;
    }

    ctraderConfig.symbols.set(id, {
      id,
      name: symbol.symbolName,
      normalizedName: normalizeSymbolName(symbol.symbolName),
      description: symbol.description,
    });

    if (!ctraderConfig.currentSymbolId) {
      ctraderConfig.currentSymbolId = id;
    }
  });
}

function findExactSymbolMatch(symbol) {
  const normalized = normalizeStoredSymbol(symbol);

  for (const candidate of ctraderConfig.symbols.values()) {
    if (candidate.normalizedName === normalized) {
      return candidate;
    }
  }

  return null;
}

function resolveSymbolId(symbol) {
  return findExactSymbolMatch(symbol)?.id || null;
}

function trendbarToBinanceKline(trendbar) {
  const low = Number(trendbar.low) / PRICE_SCALE;
  const open = (Number(trendbar.low) + Number(trendbar.deltaOpen || 0)) / PRICE_SCALE;
  const close = (Number(trendbar.low) + Number(trendbar.deltaClose || 0)) / PRICE_SCALE;
  const high = (Number(trendbar.low) + Number(trendbar.deltaHigh || 0)) / PRICE_SCALE;
  const openTime = Number(trendbar.utcTimestampInMinutes) * 60 * 1000;
  const volume = Number(trendbar.volume || 0);

  return [
    openTime,
    String(open),
    String(high),
    String(low),
    String(close),
    String(volume),
    openTime,
    '0',
    volume,
    '0',
    '0',
    '0',
  ];
}

async function requestTrendbars(symbolId, period, count, fromTimestamp, toTimestamp) {
  if (!symbolId) {
    throw new Error("No cTrader symbol ID available");
  }

  if (!ctraderConfig.accountId) {
    throw new Error("No cTrader account ID available");
  }

  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    symbolId: Number(symbolId),
    period,
    count,
  };

  if (Number.isFinite(fromTimestamp)) {
    payload.fromTimestamp = fromTimestamp;
  }

  if (Number.isFinite(toTimestamp)) {
    payload.toTimestamp = toTimestamp;
  }

  return requestMessage(2137, payload);
}

// =======================
// SEND HEARTBEAT PING
// =======================
function sendHeartbeat() {
  try {
    sendMessage(51, {});
  } catch (err) {
  }
}

// =======================
// START HEARTBEAT
// =======================
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendHeartbeat();
    }
  }, 30000);
}

// =======================
// STOP HEARTBEAT
// =======================
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// =======================
// RECONNECT
// =======================
async function reconnect() {
  if (isConnecting) {
    return;
  }
  
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return;
  }
  
  reconnectAttempts++;
  
  setTimeout(async () => {
    await connectSocket();
  }, 5000);
}

// =======================
// CONNECT SOCKET
// =======================
async function connectSocket() {
  if (isConnecting) {
    return;
  }
  
  isConnecting = true;
  
  try {
    if (ws) {
      ws.removeAllListeners();
      ws.close();
      ws = null;
    }
    ctraderConfig.isAppAuthed = false;
    ctraderConfig.isAccountAuthed = false;
    
    stopHeartbeat();
    const tokenReady = await ensureValidToken();
    if (!tokenReady) {
      throw new Error("cTrader access token could not be refreshed");
    }
    
    // Try to get accounts automatically
    await getAccounts();
    
    // If still no account ID, show error
    if (!ctraderConfig.accountId) {
      isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? "wss://demo.ctraderapi.com:5035"
      : "wss://live.ctraderapi.com:5035";

    ws = new WebSocket(url);

    ws.on("open", () => {
      reconnectAttempts = 0;
      isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    ws.on("message", (data) => {
      handleMessage(data);
    });

    ws.on("error", () => {});

    ws.on("close", () => {
      isConnecting = false;
      stopHeartbeat();
      reconnect();
    });

  } catch (err) {
    isConnecting = false;
    if (err.message.includes('access token could not be refreshed')) {
      return;
    }
    reconnect();
  }
}

async function waitForSocketReady(timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (
      ws &&
      ws.readyState === WebSocket.OPEN &&
      ctraderConfig.isAppAuthed &&
      ctraderConfig.isAccountAuthed
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('cTrader connection is not ready');
}

async function ensureCtraderReady() {
  if (!root) {
    await loadProtos();
  }

  if (
    !ws ||
    ws.readyState !== WebSocket.OPEN ||
    !ctraderConfig.isAppAuthed ||
    !ctraderConfig.isAccountAuthed
  ) {
    await connectSocket();
  }

  await waitForSocketReady();

  if (ctraderConfig.symbols.size === 0) {
    await requestSymbolsAsync();
  }
}

async function fetchCtraderKlines({ symbol, interval = '1m', startTime, endTime, limit = 1000 }) {
  const period = CTRADER_INTERVALS[interval];

  if (!period) {
    const error = new Error(`Unsupported cTrader interval: ${interval}`);
    error.status = 400;
    throw error;
  }

  await ensureCtraderReady();

  let symbolId = resolveSymbolId(symbol);

  if (!symbolId) {
    await requestSymbolsAsync();
    symbolId = resolveSymbolId(symbol);
  }

  if (!symbolId) {
    const normalizedSymbol = normalizeStoredSymbol(symbol);
    const error = new Error(`cTrader symbol not found: ${symbol}`);
    error.status = 404;
    error.payload = {
      error: error.message,
      symbol,
      normalizedSymbol,
      matchMode: 'exact',
      availableSymbolCount: ctraderConfig.symbols.size,
    };
    throw error;
  }

  const normalizedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 1000, 1), 1000);
  const numericStartTime = startTime ? Number(startTime) : undefined;
  const numericEndTime = endTime ? Number(endTime) : Date.now();
  const trendData = await requestTrendbars(
    symbolId,
    period,
    normalizedLimit,
    Number.isFinite(numericStartTime) ? numericStartTime : undefined,
    Number.isFinite(numericEndTime) ? numericEndTime : undefined
  );

  return (trendData?.trendbar || trendData?.trendbars || [])
    .map(trendbarToBinanceKline)
    .filter((kline) => {
      const openTime = Number(kline[0]);
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(numericStartTime) && openTime < numericStartTime) return false;
      if (Number.isFinite(numericEndTime) && openTime > numericEndTime) return false;
      return true;
    })
    .sort((a, b) => Number(a[0]) - Number(b[0]));
}

// =======================
// HANDLE MESSAGE
// =======================
function handleMessage(data) {
  try {
    const Message = root.lookupType("ProtoMessage");
    const decoded = Message.decode(new Uint8Array(data));
    const requestId = Number(decoded.requestId || 0);
    let resolvedRequestId = requestId;
    let pending = requestId ? pendingRequests.get(requestId) : null;

    if (!pending && !requestId) {
      const fallbackPending = findPendingRequestByResponseType(decoded.payloadType);
      if (fallbackPending) {
        resolvedRequestId = fallbackPending.requestId;
        pending = fallbackPending.pending;
      }
    }

    if (pending) {
      pendingRequests.delete(resolvedRequestId);

      if (decoded.payloadType === 2142) {
        try {
          const ErrorRes = root.lookupType("ProtoOAErrorRes");
          const errorData = ErrorRes.decode(decoded.payload);
          pending.reject(new Error(errorData.description || errorData.errorCode || "cTrader API error"));
        } catch (error) {
          pending.reject(error);
        }
        return;
      }

      const responseTypeName = RESPONSE_TYPE_NAMES[decoded.payloadType];

      if (!responseTypeName) {
        pending.reject(new Error(`Unexpected cTrader response type ${decoded.payloadType}`));
        return;
      }

      try {
        const ResponseType = root.lookupType(responseTypeName);
        pending.resolve(ResponseType.decode(decoded.payload));
      } catch (error) {
        pending.reject(error);
      }
      return;
    }

    switch(decoded.payloadType) {
      case 2101:
        ctraderConfig.isAppAuthed = true;
        setTimeout(() => sendAccountAuth(), 500);
        break;
      
      case 2103:
        try {
          const AccAuthRes = root.lookupType("ProtoOAAccountAuthRes");
          const _accAuthData = AccAuthRes.decode(decoded.payload);
          
          ctraderConfig.isAccountAuthed = true;
        } catch (_err) {
          ctraderConfig.isAccountAuthed = true;
        }
        break;
      
      case 2115:
        try {
          const SymbolsRes = root.lookupType("ProtoOASymbolsListRes");
          const symbolsData = SymbolsRes.decode(decoded.payload);
          
          const symbols = symbolsData.symbols || symbolsData.symbol || [];

          if (symbols.length > 0) {
            cacheSymbols(symbolsData);
          }
        } catch (err) {
        }
        break;
      
      case 2138:
        try {
          const TrendRes = root.lookupType("ProtoOAGetTrendbarsRes");
          const trendData = TrendRes.decode(decoded.payload);
          
          if (trendData.trendbars) {
            const candles = trendData.trendbars.map(c => ({
              time: Number(c.utcTimestamp) / 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close
            }));
            if (candles.length > 0) {
              global.lastCandles = candles;
            }
          }
        } catch (err) {
        }
        break;
      
      case 2142:
        try {
          const ErrorRes = root.lookupType("ProtoOAErrorRes");
          const errorData = ErrorRes.decode(decoded.payload);
          lastTokenRefreshError = errorData.errorCode || '';
        } catch (_err) {
        }
        break;
      
      default:
        // Ignore unhandled types
        break;
    }
    
  } catch (err) {
  }
}

// =======================
// ROUTES
// =======================
function registerCtraderRoutes(app) {
  
  app.get("/api/start-ctrader", authCheck, requireCtraderAdmin, async (req, res) => {
    try {
      if (!ctraderConfig.clientId || !ctraderConfig.clientSecret || !ctraderConfig.accessToken) {
        return res.status(500).json({ success: false, error: 'cTrader environment variables are not configured' });
      }

      cleanup();
      await loadProtos();
      await connectSocket();
      
      res.json({
        success: true,
        message: "cTrader started",
        accountId: ctraderConfig.accountId
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.get("/api/ctrader-status", authCheck, requireCtraderAdmin, (req, res) => {
    res.json({
      success: true,
    connected: ws && ws.readyState === WebSocket.OPEN,
      accountId: ctraderConfig.accountId,
      symbolCount: ctraderConfig.symbols.size,
      currentSymbolId: ctraderConfig.currentSymbolId,
      tokenRefreshBlockedUntil: tokenRefreshBlockedUntil || null,
      lastTokenRefreshError: lastTokenRefreshError || null
    });
  });
  
  app.get("/api/ctrader-symbols", authCheck, requireCtraderAdmin, async (req, res) => {
    try {
      await ensureCtraderReady();

      res.json({
        success: true,
        symbols: Array.from(ctraderConfig.symbols.values()),
        currentSymbolId: ctraderConfig.currentSymbolId
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message
      });
    }
  });

  app.get("/api/ctrader-klines", async (req, res) => {
    try {
      const { symbol, interval, startTime, endTime, limit } = req.query;

      if (!symbol || !interval) {
        return res.status(400).json({
          error: "Missing parameters",
          required: ["symbol", "interval"],
        });
      }

      const klines = await fetchCtraderKlines({
        symbol,
        interval,
        startTime,
        endTime,
        limit,
      });

      return res.json(klines);
    } catch (error) {
      return res.status(error.status || 500).json(error.payload || {
        error: error.message,
      });
    }
  });
}

function cleanup() {
  stopHeartbeat();
  if (ws) {
    ws.removeAllListeners();
    ws.close();
    ws = null;
  }
  ctraderConfig.isAppAuthed = false;
  ctraderConfig.isAccountAuthed = false;
  isConnecting = false;
  reconnectAttempts = 0;
}

module.exports = {
  registerCtraderRoutes,
  fetchCtraderKlines,
  ensureCtraderTokenStore,
  cleanup
};
