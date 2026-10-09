import api from "@/utils/common/serve";
import { normalizeChartCandle, TF_MAP } from "../utils/chartHelpers";
import { hasFreshCandleCache, setCachedCandles } from "./candleMemoryCache";

export async function prefetchSymbolCandles({ symbol, timeframe = "1m", countBack = 250 }) {
  if (!symbol) return;
  const interval = TF_MAP[timeframe] || timeframe;

  if (hasFreshCandleCache(symbol, interval)) {
    return;
  }

  try {
    const { data } = await api.get("/market-chart/candles", {
      params: { symbol, interval, limit: countBack },
    });
    const rows = Array.isArray(data) ? data : data?.candles;
    if (!Array.isArray(rows) || rows.length === 0) return;

    const candles = rows
      .map(normalizeChartCandle)
      .filter(
        (candle) =>
          Number.isFinite(candle.time) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close)
      )
      .sort((a, b) => a.time - b.time);

    if (candles.length > 0) {
      setCachedCandles(symbol, interval, candles);
    }
  } catch {
  }
}
