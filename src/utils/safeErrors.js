export const SAFE_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to perform this action.",
  VALIDATION_FAILED: 'Please check the details and try again.',
  REQUEST_TIMEOUT: 'Request timed out. Please try again.',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again.',
  MARKET_DATA_UNAVAILABLE: 'Unable to load market data right now.',
  CHART_DATA_UNAVAILABLE: 'Unable to load chart data right now.',
  LIVE_FEED_UNAVAILABLE: 'Live prices are temporarily unavailable.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
};

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const INTERNAL_DETAIL_PATTERN = /(mt5|ctrader|binance|clickhouse|r2|parquet|protobuf|websocket|kline|candle|sql|database|token|secret|authorization|password|stack|trace|provider|broker|object not found|decode failed|query failed|api error|service error)/i;

export function getUserSafeError(error, fallbackMessage = DEFAULT_MESSAGE) {
  const status = error?.response?.status;
  const code = error?.response?.data?.code || error?.code;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (code && SAFE_ERROR_MESSAGES[code]) return SAFE_ERROR_MESSAGES[code];
  if (status === 401) return SAFE_ERROR_MESSAGES.AUTH_REQUIRED;
  if (status === 403) return SAFE_ERROR_MESSAGES.FORBIDDEN;
  if (status === 408 || code === 'ECONNABORTED') return SAFE_ERROR_MESSAGES.REQUEST_TIMEOUT;
  if (status === 429) return SAFE_ERROR_MESSAGES.RATE_LIMITED;
  if (status >= 500) return fallbackMessage || DEFAULT_MESSAGE;

  if (
    typeof serverMessage === 'string' &&
    Object.values(SAFE_ERROR_MESSAGES).includes(serverMessage) &&
    !INTERNAL_DETAIL_PATTERN.test(serverMessage)
  ) {
    return serverMessage;
  }

  return fallbackMessage || DEFAULT_MESSAGE;
}

export const CHART_ERROR_MESSAGE = SAFE_ERROR_MESSAGES.CHART_DATA_UNAVAILABLE;
export const LIVE_FEED_ERROR_MESSAGE = SAFE_ERROR_MESSAGES.LIVE_FEED_UNAVAILABLE;
