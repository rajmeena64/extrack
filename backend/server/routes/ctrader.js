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
  expiresAt: Date.now() + (1800 * 1000),

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

    console.log("Proto definitions loaded successfully");
    
  } catch (err) {
    console.error("Failed to load proto definitions:", err.message);
    throw err;
  }
}

// =======================
// GET ACCOUNTS VIA WEB API
// =======================
async function getAccountsViaWeb() {
  try {
    console.log("Fetching accounts from cTrader Web API");
    
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
    
    console.log("Accounts fetched successfully");
    console.log("Available cTrader accounts:", JSON.stringify(response.data, null, 2));
    
    ctraderConfig.accounts = response.data || [];
    
    if (ctraderConfig.accounts.length > 0) {
      // Find the demo account
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true || acc.type === 'demo');
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false || acc.type === 'live');
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.id || demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
        console.log(`Using demo account ${ctraderConfig.accountId} - ${demoAccount.name || 'Demo Account'}`);
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.id || liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
        console.log(`Using live account ${ctraderConfig.accountId} - ${liveAccount.name || 'Live Account'}`);
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].id || ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
        console.log(`Using first available cTrader account ${ctraderConfig.accountId}`);
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    console.error("Failed to fetch accounts from cTrader Web API:", err.response?.data || err.message);
    return [];
  }
}

// =======================
// GET ACCOUNTS VIA OPENAPI
// =======================
async function getAccountsViaOpenAPI() {
  try {
    console.log("Fetching accounts from cTrader OpenAPI");
    
    const response = await axios.get(
      "https://openapi.ctrader.com/v1/accounts",
      {
        headers: {
          'Authorization': `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("Accounts fetched successfully");
    console.log("Available cTrader accounts:", JSON.stringify(response.data, null, 2));
    
    ctraderConfig.accounts = response.data.accounts || [];
    
    if (ctraderConfig.accounts.length > 0) {
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true);
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false);
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
        console.log(`Using demo account ${ctraderConfig.accountId} - ${demoAccount.name || 'Demo Account'}`);
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
        console.log(`Using live account ${ctraderConfig.accountId} - ${liveAccount.name || 'Live Account'}`);
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
        console.log(`Using first available cTrader account ${ctraderConfig.accountId}`);
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    console.error("Failed to fetch accounts from cTrader OpenAPI:", err.response?.data || err.message);
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
  
  if (accounts.length === 0) {
    console.warn("Could not fetch cTrader accounts automatically");
    console.log("Check your cTrader access token and client credentials.");
    console.log("You may need to set the account ID manually in the configuration.");
    
    // Fall back to asking user to manually enter account ID
    console.log("\nTo get your account ID:");
    console.log("1. Log in to cTrader Web or Desktop");
    console.log("2. Go to Settings -> Accounts");
    console.log("3. Find your demo account ID (usually a 7-digit number)");
    console.log("4. Update the accountId in ctraderConfig");
  }
  
  return accounts;
}

// =======================
// REFRESH TOKEN
// =======================
async function refreshAccessToken() {
  if (!ctraderConfig.refreshToken || !ctraderConfig.clientId || !ctraderConfig.clientSecret) {
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

    ctraderConfig.accessToken = data.accessToken;
    ctraderConfig.refreshToken = data.refreshToken || ctraderConfig.refreshToken;
    ctraderConfig.expiresAt = Date.now() + (data.expiresIn * 1000);

    console.log("cTrader access token refreshed successfully");
    return true;
  } catch (err) {
    console.error("Failed to refresh cTrader access token:", err.response?.data || err.message);
    return false;
  }
}

// =======================
// ENSURE TOKEN VALID
// =======================
async function ensureValidToken() {
  if (Date.now() >= (ctraderConfig.expiresAt - (5 * 60 * 1000))) {
    console.log("cTrader access token is expiring soon. Refreshing token.");
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
    console.error("cTrader WebSocket is not connected");
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
      case 2106: payloadTypeName = "ProtoOAPingReq"; break;
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
    console.log(`Sent cTrader message type ${payloadType} with request ID ${requestId}`);
    return requestId;
  } catch (err) {
    console.error("Failed to send cTrader message:", err.message);
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
  console.log("Sent cTrader application authentication request");
}

// =======================
// ACCOUNT AUTH
// =======================
function sendAccountAuth() {
  if (!ctraderConfig.accountId) {
    console.error("No cTrader account ID available.");
    console.log("Provide a valid cTrader account ID in the configuration.");
    console.log("You can find the account ID in the cTrader platform under Settings -> Accounts.");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    accessToken: ctraderConfig.accessToken,
  };
  
  sendMessage(2102, payload);
  console.log(`Sent account authentication request for cTrader account ${ctraderConfig.accountId}`);
}

// =======================
// REQUEST SYMBOLS
// =======================
function _requestSymbols() {
  if (!ctraderConfig.accountId) {
    console.error("No cTrader account ID available");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
  };
  
  sendMessage(2114, payload);
  console.log("Sent cTrader symbols request");
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
    console.error("No cTrader symbol ID available. Request symbols first.");
    return;
  }
  
  if (!ctraderConfig.accountId) {
    console.error("No cTrader account ID available");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    symbolId: targetSymbolId,
    period: period,
    count: count,
  };
  
  sendMessage(2137, payload);
  console.log(`Sent candle request for cTrader symbol ${targetSymbolId}`);
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

function resolveSymbolId(symbol) {
  const normalized = normalizeStoredSymbol(symbol);
  const alternatives = new Set([normalized]);

  if (normalized.endsWith('USDT')) {
    alternatives.add(`${normalized.slice(0, -4)}USD`);
  }

  for (const candidate of ctraderConfig.symbols.values()) {
    if (
      alternatives.has(candidate.normalizedName) ||
      alternatives.has(normalizeSymbolName(candidate.name))
    ) {
      return candidate.id;
    }
  }

  return null;
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
function sendPing() {
  if (!ctraderConfig.accountId) {
    return;
  }
  
  try {
    const payload = {
      ctidTraderAccountId: parseInt(ctraderConfig.accountId),
      timestamp: Date.now()
    };
    
    sendMessage(2106, payload);
  } catch (err) {
    // Silently fail if ping fails
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
    if (ws && ws.readyState === WebSocket.OPEN && ctraderConfig.accountId) {
      sendPing();
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
    console.error("Maximum cTrader reconnection attempts reached");
    return;
  }
  
  reconnectAttempts++;
  console.log(`Retrying cTrader connection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
  
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
    await ensureValidToken();
    
    // Try to get accounts automatically
    await getAccounts();
    
    // If still no account ID, show error
    if (!ctraderConfig.accountId) {
      console.error("\nCannot connect to cTrader: no valid account ID was found");
      console.log("\nTo fix this:");
      console.log("1. Log in to your cTrader platform");
      console.log("2. Go to Settings -> Accounts");
      console.log("3. Find your demo account ID (usually a 7-8 digit number)");
      console.log("4. Update the accountId in ctraderConfig to that number");
      console.log("5. Restart the application\n");
      isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? "wss://demo.ctraderapi.com:5035"
      : "wss://live.ctraderapi.com:5035";

    console.log(`Connecting to cTrader WebSocket at ${url}`);
    console.log(`Using cTrader account ID ${ctraderConfig.accountId}`);
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("cTrader WebSocket connected successfully");
      reconnectAttempts = 0;
      isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    ws.on("message", (data) => {
      handleMessage(data);
    });

    ws.on("error", (err) => {
      console.error("cTrader WebSocket error:", err.message);
    });

    ws.on("close", (code, reason) => {
      console.log(`cTrader WebSocket closed: ${code} - ${reason}`);
      isConnecting = false;
      stopHeartbeat();
      reconnect();
    });

  } catch (err) {
    console.error("Failed to connect to cTrader:", err.message);
    isConnecting = false;
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
    const error = new Error(`cTrader symbol not found: ${symbol}`);
    error.status = 404;
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
    
    console.log(`Received cTrader message type ${decoded.payloadType}`);
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
        console.log("cTrader application authorized successfully");
        ctraderConfig.isAppAuthed = true;
        setTimeout(() => sendAccountAuth(), 500);
        break;
      
      case 2103:
        try {
          const AccAuthRes = root.lookupType("ProtoOAAccountAuthRes");
          const _accAuthData = AccAuthRes.decode(decoded.payload);
          
          ctraderConfig.isAccountAuthed = true;
          console.log("cTrader account authorized successfully");
        } catch (_err) {
          ctraderConfig.isAccountAuthed = true;
          console.log("cTrader account authorization completed successfully");
        }
        break;
      
      case 2115:
        try {
          const SymbolsRes = root.lookupType("ProtoOASymbolsListRes");
          const symbolsData = SymbolsRes.decode(decoded.payload);
          
          const symbols = symbolsData.symbols || symbolsData.symbol || [];

          if (symbols.length > 0) {
            cacheSymbols(symbolsData);
            
            console.log(`Loaded ${ctraderConfig.symbols.size} cTrader symbols`);
            console.log(`Available cTrader symbols: ${Array.from(ctraderConfig.symbols.values()).slice(0, 10).map(s => s.name).join(', ')}...`);
          }
        } catch (err) {
          console.error("Failed to decode symbols:", err.message);
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
            
            console.log(`Received ${candles.length} cTrader candles`);
            if (candles.length > 0) {
              console.log(`Latest cTrader candle: ${new Date(candles[candles.length-1].time * 1000).toISOString()} | O:${candles[candles.length-1].open} H:${candles[candles.length-1].high} L:${candles[candles.length-1].low} C:${candles[candles.length-1].close}`);
              global.lastCandles = candles;
            }
          }
        } catch (err) {
          console.error("Failed to decode candles:", err.message);
        }
        break;
      
      case 2142:
        try {
          const ErrorRes = root.lookupType("ProtoOAErrorRes");
          const errorData = ErrorRes.decode(decoded.payload);
          console.error("cTrader API error:", errorData.errorCode);
        } catch (_err) {
          console.error("Received an error from cTrader");
        }
        break;
      
      default:
        // Ignore unhandled types
        break;
    }
    
  } catch (err) {
    console.error("Failed to handle cTrader message:", err.message);
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
      currentSymbolId: ctraderConfig.currentSymbolId
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
      return res.status(error.status || 500).json({
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
  cleanup
};
