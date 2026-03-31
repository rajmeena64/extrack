// ctrader.js

const axios = require('axios');
const WebSocket = require('ws');
const protobuf = require("protobufjs");
const fs = require('fs');
const path = require('path');

let root;
let ws;
let heartbeatInterval;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let isConnecting = false;

// =======================
// CONFIG
// =======================
const ctraderConfig = {
  clientId: process.env.CTRADER_CLIENT_ID,
  clientSecret: process.env.CTRADER_CLIENT_SECRET,

  accessToken: "9VMuhNMkPzVkYRLzymH8sBrlSeebQfYPqq0PGEqK-c8",
  refreshToken: "KCYw_qYlQr5RSuvZ-Al_FonWy8o7sHMpGvVnwy8BHV0",
  expiresAt: Date.now() + (1800 * 1000),

  accountId: 9934489 , // Will be auto-detected
  isDemo: true,
  
  // Store symbols and current symbol ID
  symbols: new Map(),
  currentSymbolId: null,
  
  // Store accounts info
  accounts: [],
  currentAccount: null,
};

// =======================
// CHECK PROTO FILES EXIST
// =======================
function checkProtoFiles() {
  const protoFiles = [
    "./proto/OpenApiMessages.proto",
    "./proto/OpenApiModelMessages.proto",
    "./proto/OpenApiCommonMessages.proto",
    "./proto/OpenApiCommonModelMessages.proto"
  ];
  
  for (const file of protoFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Proto file not found: ${file}`);
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
      "./proto/OpenApiMessages.proto",
      "./proto/OpenApiModelMessages.proto",
      "./proto/OpenApiCommonMessages.proto",
      "./proto/OpenApiCommonModelMessages.proto"
    ]);

    console.log("✅ Proto loaded successfully");
    
  } catch (err) {
    console.error("❌ Failed to load protos:", err.message);
    throw err;
  }
}

// =======================
// GET ACCOUNTS VIA WEB API
// =======================
async function getAccountsViaWeb() {
  try {
    console.log("📡 Fetching accounts from cTrader Web API...");
    
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
    
    console.log("✅ Accounts fetched successfully");
    console.log("📋 Available accounts:", JSON.stringify(response.data, null, 2));
    
    ctraderConfig.accounts = response.data || [];
    
    if (ctraderConfig.accounts.length > 0) {
      // Find the demo account
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true || acc.type === 'demo');
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false || acc.type === 'live');
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.id || demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
        console.log(`✅ Using demo account: ${ctraderConfig.accountId} - ${demoAccount.name || 'Demo Account'}`);
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.id || liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
        console.log(`✅ Using live account: ${ctraderConfig.accountId} - ${liveAccount.name || 'Live Account'}`);
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].id || ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
        console.log(`✅ Using first available account: ${ctraderConfig.accountId}`);
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    console.error("❌ Failed to fetch accounts via Web API:", err.response?.data || err.message);
    return [];
  }
}

// =======================
// GET ACCOUNTS VIA OPENAPI
// =======================
async function getAccountsViaOpenAPI() {
  try {
    console.log("📡 Fetching accounts from cTrader OpenAPI...");
    
    const response = await axios.get(
      "https://openapi.ctrader.com/v1/accounts",
      {
        headers: {
          'Authorization': `Bearer ${ctraderConfig.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log("✅ Accounts fetched successfully");
    console.log("📋 Available accounts:", JSON.stringify(response.data, null, 2));
    
    ctraderConfig.accounts = response.data.accounts || [];
    
    if (ctraderConfig.accounts.length > 0) {
      const demoAccount = ctraderConfig.accounts.find(acc => acc.isDemo === true);
      const liveAccount = ctraderConfig.accounts.find(acc => acc.isDemo === false);
      
      if (ctraderConfig.isDemo && demoAccount) {
        ctraderConfig.accountId = demoAccount.accountId;
        ctraderConfig.currentAccount = demoAccount;
        console.log(`✅ Using demo account: ${ctraderConfig.accountId} - ${demoAccount.name || 'Demo Account'}`);
      } else if (!ctraderConfig.isDemo && liveAccount) {
        ctraderConfig.accountId = liveAccount.accountId;
        ctraderConfig.currentAccount = liveAccount;
        console.log(`✅ Using live account: ${ctraderConfig.accountId} - ${liveAccount.name || 'Live Account'}`);
      } else if (ctraderConfig.accounts[0]) {
        ctraderConfig.accountId = ctraderConfig.accounts[0].accountId;
        ctraderConfig.currentAccount = ctraderConfig.accounts[0];
        console.log(`✅ Using first available account: ${ctraderConfig.accountId}`);
      }
    }
    
    return ctraderConfig.accounts;
  } catch (err) {
    console.error("❌ Failed to fetch accounts via OpenAPI:", err.response?.data || err.message);
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
    console.log("⚠️ Could not fetch accounts automatically");
    console.log("💡 Please check your access token and client credentials");
    console.log("💡 You may need to manually set the account ID in the config");
    
    // Fall back to asking user to manually enter account ID
    console.log("\n📝 To get your account ID:");
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

    console.log("🔄 Token refreshed successfully");
    return true;
  } catch (err) {
    console.error("❌ Refresh failed:", err.response?.data || err.message);
    return false;
  }
}

// =======================
// ENSURE TOKEN VALID
// =======================
async function ensureValidToken() {
  if (Date.now() >= (ctraderConfig.expiresAt - (5 * 60 * 1000))) {
    console.log("⚠️ Token expiring soon → refreshing...");
    return await refreshAccessToken();
  }
  return true;
}

// =======================
// SEND MESSAGE WITH REQUEST ID
// =======================
let requestIdCounter = 1;
const pendingRequests = new Map();

function sendMessage(payloadType, payloadData, waitForResponse = false) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error("❌ WebSocket not connected");
    return null;
  }
  
  try {
    const Message = root.lookupType("ProtoMessage");
    const requestId = requestIdCounter++;
    
    let payloadTypeName;
    switch(payloadType) {
      case 2100: payloadTypeName = "ProtoOAApplicationAuthReq"; break;
      case 2102: payloadTypeName = "ProtoOAAccountAuthReq"; break;
      case 2104: payloadTypeName = "ProtoOASymbolsListReq"; break;
      case 2106: payloadTypeName = "ProtoOAPingReq"; break;
      case 2137: payloadTypeName = "ProtoOAGetTrendbarsReq"; break;
      default: payloadTypeName = null;
    }
    
    let encodedPayload;
    if (payloadTypeName) {
      const PayloadType = root.lookupType(payloadTypeName);
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
    console.log(`📤 Sent message type: ${payloadType}, requestId: ${requestId}`);
    return requestId;
  } catch (err) {
    console.error("❌ Failed to send message:", err.message);
    return null;
  }
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
  console.log("📤 Application Auth sent");
}

// =======================
// ACCOUNT AUTH
// =======================
function sendAccountAuth() {
  if (!ctraderConfig.accountId) {
    console.error("❌ No account ID available.");
    console.log("💡 Please provide a valid account ID in the config");
    console.log("💡 You can find your account ID in cTrader platform under Settings -> Accounts");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    accessToken: ctraderConfig.accessToken,
  };
  
  sendMessage(2102, payload);
  console.log(`📤 Account Auth sent for account ID: ${ctraderConfig.accountId}`);
}

// =======================
// REQUEST SYMBOLS
// =======================
function requestSymbols() {
  if (!ctraderConfig.accountId) {
    console.error("❌ No account ID available");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
  };
  
  sendMessage(2104, payload);
  console.log("📤 Symbols request sent");
}

// =======================
// REQUEST CANDLES
// =======================
function requestCandles(symbolId = null, period = "M1", count = 100) {
  const targetSymbolId = symbolId || ctraderConfig.currentSymbolId;
  
  if (!targetSymbolId) {
    console.error("❌ No symbol ID available. Request symbols first.");
    return;
  }
  
  if (!ctraderConfig.accountId) {
    console.error("❌ No account ID available");
    return;
  }
  
  const payload = {
    ctidTraderAccountId: parseInt(ctraderConfig.accountId),
    symbolId: targetSymbolId,
    period: period,
    count: count,
  };
  
  sendMessage(2137, payload);
  console.log(`📤 Candle request sent for symbol ${targetSymbolId}`);
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
    console.error(`❌ Max reconnection attempts reached`);
    return;
  }
  
  reconnectAttempts++;
  console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
  
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
    
    stopHeartbeat();
    await ensureValidToken();
    
    // Try to get accounts automatically
    await getAccounts();
    
    // If still no account ID, show error
    if (!ctraderConfig.accountId) {
      console.error("\n❌ Cannot connect: No valid account ID found");
      console.log("\n📝 To fix this:");
      console.log("1. Log in to your cTrader platform");
      console.log("2. Go to Settings → Accounts");
      console.log("3. Find your demo account ID (usually a 7-8 digit number)");
      console.log("4. Update the accountId in ctraderConfig to that number");
      console.log("5. Restart the application\n");
      isConnecting = false;
      return;
    }

    const url = ctraderConfig.isDemo
      ? "wss://demo.ctraderapi.com:5035"
      : "wss://live.ctraderapi.com:5035";

    console.log(`🔌 Connecting to ${url}...`);
    console.log(`📋 Using account ID: ${ctraderConfig.accountId}`);
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("✅ WebSocket connected");
      reconnectAttempts = 0;
      isConnecting = false;
      sendAppAuth();
      startHeartbeat();
    });

    ws.on("message", (data) => {
      handleMessage(data);
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket error:", err.message);
    });

    ws.on("close", (code, reason) => {
      console.log(`❌ WebSocket closed: ${code} - ${reason}`);
      isConnecting = false;
      stopHeartbeat();
      reconnect();
    });

  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    isConnecting = false;
    reconnect();
  }
}

// =======================
// HANDLE MESSAGE
// =======================
function handleMessage(data) {
  try {
    const Message = root.lookupType("ProtoMessage");
    const decoded = Message.decode(new Uint8Array(data));
    
    console.log(`📩 Received message type: ${decoded.payloadType}`);

    switch(decoded.payloadType) {
      case 2101:
        console.log("✅ Application authorized");
        setTimeout(() => sendAccountAuth(), 500);
        break;
      
      case 2103:
        try {
          const AccAuthRes = root.lookupType("ProtoOAAccountAuthRes");
          const accAuthData = AccAuthRes.decode(decoded.payload);
          
          if (accAuthData.success) {
            console.log("✅ Account authorized successfully");
            setTimeout(() => requestSymbols(), 500);
          } else {
            console.error("❌ Account auth failed:", accAuthData.errorMessage);
          }
        } catch (err) {
          console.log("✅ Account authorization successful");
          setTimeout(() => requestSymbols(), 500);
        }
        break;
      
      case 2105:
        try {
          const SymbolsRes = root.lookupType("ProtoOASymbolsListRes");
          const symbolsData = SymbolsRes.decode(decoded.payload);
          
          if (symbolsData.symbols && symbolsData.symbols.length > 0) {
            symbolsData.symbols.forEach(symbol => {
              ctraderConfig.symbols.set(symbol.symbolId, {
                id: symbol.symbolId,
                name: symbol.symbolName,
                description: symbol.description
              });
              
              if (!ctraderConfig.currentSymbolId) {
                ctraderConfig.currentSymbolId = symbol.symbolId;
              }
            });
            
            console.log(`✅ Loaded ${ctraderConfig.symbols.size} symbols`);
            console.log(`📊 Available symbols: ${Array.from(ctraderConfig.symbols.values()).slice(0, 10).map(s => s.name).join(', ')}...`);
            
            if (ctraderConfig.currentSymbolId) {
              requestCandles();
            }
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
            
            console.log(`📊 Received ${candles.length} candles`);
            if (candles.length > 0) {
              console.log(`📈 Latest candle: ${new Date(candles[candles.length-1].time * 1000).toISOString()} | O:${candles[candles.length-1].open} H:${candles[candles.length-1].high} L:${candles[candles.length-1].low} C:${candles[candles.length-1].close}`);
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
          console.error("❌ Error:", errorData.errorCode);
        } catch (err) {
          console.error("❌ Error received");
        }
        break;
      
      default:
        // Ignore unhandled types
        break;
    }
    
  } catch (err) {
    console.error("❌ Failed to handle message:", err.message);
  }
}

// =======================
// ROUTES
// =======================
function registerCtraderRoutes(app) {
  
  app.get("/api/start-ctrader", async (req, res) => {
    try {
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
  
  app.get("/api/ctrader-status", (req, res) => {
    res.json({
      success: true,
      connected: ws && ws.readyState === WebSocket.OPEN,
      accountId: ctraderConfig.accountId,
      symbolCount: ctraderConfig.symbols.size,
      currentSymbolId: ctraderConfig.currentSymbolId
    });
  });
  
  app.get("/api/ctrader-symbols", (req, res) => {
    res.json({
      success: true,
      symbols: Array.from(ctraderConfig.symbols.values()),
      currentSymbolId: ctraderConfig.currentSymbolId
    });
  });
}

function cleanup() {
  stopHeartbeat();
  if (ws) {
    ws.removeAllListeners();
    ws.close();
    ws = null;
  }
  isConnecting = false;
  reconnectAttempts = 0;
}

module.exports = {
  registerCtraderRoutes,
  cleanup
};