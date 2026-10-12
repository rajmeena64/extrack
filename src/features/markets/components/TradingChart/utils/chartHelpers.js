import { normalizeStoredSymbol, normalizeOptionContractInput } from "@/utils/trading/symbols";

export const formatShortTimeframe = (tf) => {
  const s = String(tf ?? "15").trim();
  const m = s.match(/^(\d*)([a-zA-Z]*)$/);
  const val = parseInt(m?.[1] || "1", 10) || 1;
  const unit = m?.[2] || "";
  if (!unit) return val >= 60 && val % 60 === 0 ? `${val / 60}h` : `${val}m`;
  if (unit === "M" || unit.toLowerCase().startsWith("mo")) return `${val}M`;
  if (unit.toLowerCase().startsWith("h")) return `${val}h`;
  if (unit.toLowerCase().startsWith("d")) return `${val}d`;
  if (unit.toLowerCase().startsWith("w")) return `${val}w`;
  return `${val}m`;
};

export const TF_MAP = new Proxy({}, { get: (_, prop) => formatShortTimeframe(prop) });

export const TIMEFRAME_GROUPS = {
  minutes: [
    { value: "1m", label: "1 minute", short: "1m" },
    { value: "3m", label: "3 minutes", short: "3m" },
    { value: "5m", label: "5 minutes", short: "5m" },
    { value: "15m", label: "15 minutes", short: "15m" },
    { value: "30m", label: "30 minutes", short: "30m" },
  ],
  hours: [
    { value: "1h", label: "1 hour", short: "1h" },
    { value: "2h", label: "2 hours", short: "2h" },
    { value: "4h", label: "4 hours", short: "4h" },
  ],
  days: [{ value: "1d", label: "1 day", short: "1d" }],
  weeks: [{ value: "1w", label: "1 week", short: "1w" }],
  months: [{ value: "1M", label: "1 month", short: "1M" }],
};

export const normalizeChartCandle = (item) => {
  const open = Number(Array.isArray(item) ? item[1] : item.open);
  const high = Number(Array.isArray(item) ? item[2] : item.high);
  const low = Number(Array.isArray(item) ? item[3] : item.low);
  const close = Number(Array.isArray(item) ? item[4] : item.close);
  const rawTime = Number(Array.isArray(item) ? item[0] : item.time);
  return {
    time: rawTime > 10000000000 ? Math.floor(rawTime / 1000) : Math.floor(rawTime),
    open,
    high: Math.max(open, high, low, close),
    low: Math.min(open, high, low, close),
    close,
    volume: Number(Array.isArray(item) ? item[5] ?? 0 : item.volume ?? 0),
  };
};

export const getDurationTimeframe = (trades = []) => {
  const trade = trades.find((item) => Number.isFinite(Number(item?.entryTime)) && Number.isFinite(Number(item?.exitTime)));
  if (!trade) return "1m";
  const durationMs = Math.max(0, (Number(trade.exitTime) - Number(trade.entryTime)) * 1000);
  const hour = 3600000;
  if (durationMs < 2 * hour) return "1m";
  if (durationMs < 4 * hour) return "5m";
  if (durationMs < 8 * hour) return "15m";
  if (durationMs < 24 * hour) return "1h";
  if (durationMs <= 72 * hour) return "4h";
  return "1d";
};

export const resolveCleanedSymbol = ({ symbol, productType }) => {
  return String(productType).toLowerCase() === "option"
    ? normalizeOptionContractInput(symbol)
    : normalizeStoredSymbol(symbol);
};
