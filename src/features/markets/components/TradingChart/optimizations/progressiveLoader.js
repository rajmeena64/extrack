import { INTERVAL_MS, TF_MAP } from "../utils/chartHelpers";

export const INITIAL_FAST_BARS = 300;
export const INITIAL_CHUNK_BARS = 5000;
export const SCROLL_CHUNK_BARS = 3000;
export const EDGE_LOAD_THRESHOLD_BARS = 2500;

export async function hydrateBackgroundCandles({
  symbol,
  timeframe,
  currentCandles,
  activeDatafeed,
  onHydrated,
  isCancelled,
}) {
  if (!symbol || !activeDatafeed?.getBars || !Array.isArray(currentCandles) || currentCandles.length === 0) {
    return;
  }

  const oldestTime = currentCandles[0].time;
  const intervalSec = Math.max((INTERVAL_MS[timeframe] || INTERVAL_MS["1m"]) / 1000, 1);
  const remainingCount = INITIAL_CHUNK_BARS - currentCandles.length;

  if (remainingCount <= 0) return;

  const normalizedTf = TF_MAP[timeframe] || timeframe;

  try {
    const bgResult = await activeDatafeed.getBars({
      symbol,
      timeframe: normalizedTf,
      from: undefined,
      to: (oldestTime - 1) * 1000,
      countBack: Math.min(remainingCount, 1000),
      firstDataRequest: false,
    });

    if (isCancelled && isCancelled()) return;

    const bgCandles = Array.isArray(bgResult) ? bgResult : bgResult?.candles || [];
    if (bgCandles.length > 0 && onHydrated) {
      onHydrated(bgCandles);
    }
  } catch {
  }
}
