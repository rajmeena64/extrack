import { normalizeStoredSymbol, normalizeOptionContractInput } from "@/utils/trading/symbols";

export const TIMEFRAME_GROUPS = {
  minutes: [
    { value: "1minute", label: "1 minute", short: "1m" },
    { value: "3minutes", label: "3 minutes", short: "3m" },
    { value: "5minutes", label: "5 minutes", short: "5m" },
    { value: "15minutes", label: "15 minutes", short: "15m" },
    { value: "30minutes", label: "30 minutes", short: "30m" },
  ],
  hours: [
    { value: "1hour", label: "1 hour", short: "1h" },
    { value: "2hours", label: "2 hours", short: "2h" },
    { value: "4hours", label: "4 hours", short: "4h" },
  ],
  days: [
    { value: "1day", label: "1 day", short: "1d" },
  ],
  weeks: [
    { value: "1week", label: "1 week", short: "1w" },
  ],
  months: [
    { value: "1month", label: "1 month", short: "1M" },
  ],
};

export const TIMEFRAMES = Object.values(TIMEFRAME_GROUPS).flatMap((g) => g.map((item) => item.value));

export const parseTimeframeMs = (tf) => {
  if (typeof tf !== "string" || !tf) return 60000;
  const match = /^([1-9]\d*)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks|M|mo|month|months)$/i.exec(tf.trim());
  if (!match) return 60000;
  const val = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("h")) return val * 3600000;
  if (unit.startsWith("d")) return val * 86400000;
  if (unit.startsWith("w")) return val * 604800000;
  if (match[2] === "M" || unit.startsWith("mo")) return val * 2592000000;
  return val * 60000;
};

export const TF_MAP = new Proxy({}, {
  get: (target, prop) => (typeof prop === "string" ? prop : String(prop)),
});

export const INTERVAL_MS = new Proxy({
  "1minute": 60 * 1000, "3minutes": 3 * 60 * 1000, "5minutes": 5 * 60 * 1000, "15minutes": 15 * 60 * 1000, "30minutes": 30 * 60 * 1000,
  "1hour": 60 * 60 * 1000, "2hours": 2 * 60 * 60 * 1000, "4hours": 4 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000, "1week": 7 * 24 * 60 * 60 * 1000, "1month": 30 * 24 * 60 * 60 * 1000,
}, {
  get: (target, prop) => (typeof prop === "string" ? (target[prop] || parseTimeframeMs(prop)) : parseTimeframeMs(prop)),
});

export const chartTimeToDate = (time) => {
  if (typeof time === "number") return new Date(time * 1000);
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return new Date(time.year, time.month - 1, time.day);
  }
  return null;
};

export const chartAxisDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export const chartAxisDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatChartLocalDateTime = (time) => {
  const date = chartTimeToDate(time);
  if (!date || Number.isNaN(date.getTime())) return "";
  if (typeof time === "object") return chartAxisDateFormatter.format(date);
  return chartAxisDateTimeFormatter.format(date);
};

export const chartTimeToSeconds = (time) => {
  if (typeof time === "number") return time;
  if (time && typeof time === "object" && "year" in time && "month" in time && "day" in time) {
    return Math.floor(new Date(time.year, time.month - 1, time.day).getTime() / 1000);
  }
  return null;
};

export const normalizeChartCandle = (item) => {
  const open = Number(Array.isArray(item) ? item[1] : item.open);
  const high = Number(Array.isArray(item) ? item[2] : item.high);
  const low = Number(Array.isArray(item) ? item[3] : item.low);
  const close = Number(Array.isArray(item) ? item[4] : item.close);
  const rawTime = Number(Array.isArray(item) ? item[0] : item.time);

  return {
    time: rawTime > 10_000_000_000 ? Math.floor(rawTime / 1000) : Math.floor(rawTime),
    open,
    high: Math.max(open, high, low, close),
    low: Math.min(open, high, low, close),
    close,
    volume: Number(Array.isArray(item) ? item[5] || 0 : item.volume || 0),
  };
};

export const getDurationTimeframe = (trades = []) => {
  const trade = trades.find(
    (item) => Number.isFinite(Number(item?.entryTime)) && Number.isFinite(Number(item?.exitTime))
  );
  if (!trade) return "1minute";

  const durationMs = Math.max(0, (Number(trade.exitTime) - Number(trade.entryTime)) * 1000);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (durationMs < 2 * hour) return "1minute";
  if (durationMs < 4 * hour) return "5minutes";
  if (durationMs < 8 * hour) return "15minutes";
  if (durationMs < day) return "1hour";
  if (durationMs <= 3 * day) return "4hours";
  return "1day";
};

export const resolveCleanedSymbol = ({ symbol, productType }) => {
  const isOption = String(productType || "").toLowerCase() === "option";
  return isOption
    ? normalizeOptionContractInput(symbol)
    : normalizeStoredSymbol(symbol) || "BTCUSDT";
};
