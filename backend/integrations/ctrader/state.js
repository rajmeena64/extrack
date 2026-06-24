const path = require('path');

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
  symbols: new Map(),
  currentSymbolId: null,
  accounts: [],
  currentAccount: null,
  latestTicks: new Map(),
  liveTickSubscriptions: new Set(),
  latestDepth: new Map(),
  depthSubscriptions: new Set(),
  chartLiveConsumers: new Map(),
  liveTrendbarSubscriptions: new Set(),
  latestTrendbars: new Map(),
  isAppAuthed: false,
  isAccountAuthed: false,
};

const connectionState = {
  root: null,
  ws: null,
  heartbeatInterval: null,
  reconnectAttempts: 0,
  isConnecting: false,
};

const tokenState = {
  storeReady: false,
  loadedFromStore: false,
  refreshBlockedUntil: 0,
  lastRefreshError: '',
};

const PROTO_DIR = path.join(__dirname, 'protobuf');

module.exports = {
  PROTO_DIR,
  connectionState,
  ctraderConfig,
  tokenState,
};
