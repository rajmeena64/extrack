import api from "@/utils/common/serve";
import { normalizeChartCandle, TF_MAP } from "../utils/chartHelpers";
import { subscribeMarketStream } from "@/features/markets/components/MarketTerminal/marketStream";
import {
  getCachedCandles,
  setCachedCandles,
  prefetchSymbolCandles,
} from "../optimizations";

const candlesCache = new Map();
const noMoreDataBeforeMap = new Map();

export function createDefaultDatafeed({ queryClient, uniqueId } = {}) {
  return {
    getBars: async ({ symbol, timeframe, from, to, countBack = 1000, firstDataRequest = false }) => {
      const interval = TF_MAP[timeframe] || timeframe;
      const limit = firstDataRequest ? Math.max(Number(countBack) || 1000, 1000) : (Number(countBack) || 1000);
      const cacheKey = `${symbol}_${interval}`;

      const params = { symbol, timeframe: interval };
      if (uniqueId) params.uniqueId = uniqueId;
      if (firstDataRequest) params.firstDataRequest = "true";
      if (Number.isFinite(Number(from)) && Number(from) > 0) params.startTime = Math.floor(Number(from));
      if (Number.isFinite(Number(to)) && Number(to) > 0) params.endTime = Math.floor(Number(to));

      const endSec = params.endTime ? (params.endTime > 1e11 ? Math.floor(params.endTime / 1000) : params.endTime) : null;
      const noMoreBefore = noMoreDataBeforeMap.get(cacheKey);

      if (endSec !== null && noMoreBefore !== undefined && endSec <= noMoreBefore) {
        return { candles: [], noData: true, fromCache: true };
      }

      if (firstDataRequest && candlesCache.has(cacheKey)) {
        const cached = candlesCache.get(cacheKey);
        if (Date.now() - cached.ts < 60000) {
          return { candles: cached.candles, noData: cached.candles.length === 0, fromCache: true };
        }
      }

      params.limit = Math.min(Number(limit) || 1000, 1000);

      const fetchFn = async () => {
        try {
          const { data } = await api.get("/datafeed/candles", { params });
          const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.candles) ? data.candles : Array.isArray(data) ? data : [];
          if (rows.length === 0) {
            if (endSec !== null) noMoreDataBeforeMap.set(cacheKey, Math.min(noMoreDataBeforeMap.get(cacheKey) ?? Infinity, endSec));
            return { candles: [], noData: true };
          }

          const seen = new Set();
          const candles = rows
            .map(normalizeChartCandle)
            .filter((c) => {
              if (!Number.isFinite(c.time) || !Number.isFinite(c.open) || !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close)) return false;
              if (seen.has(c.time)) return false;
              seen.add(c.time);
              return true;
            })
            .sort((a, b) => a.time - b.time);

          if (firstDataRequest) {
            candlesCache.set(cacheKey, { candles, ts: Date.now() });
          }

          return { candles, noData: candles.length === 0 };
        } catch {
          return { candles: [], noData: true };
        }
      };

      if (queryClient && !firstDataRequest) {
        return queryClient.fetchQuery({
          queryKey: ["datafeed-candles", symbol, interval, params.startTime ?? "latest", params.endTime ?? "latest", limit],
          queryFn: fetchFn,
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
          retry: false,
        });
      }

      return fetchFn();
    },

    subscribeBars: ({ symbol, timeframe, priceDigits, onTick, onQuote }) => {
      if (!symbol) return () => {};
      return subscribeMarketStream({
        symbols: [symbol],
        onTick: (tick) => {
          onQuote?.(tick);
          const price = Number(tick?.last ?? 0);
          if (price > 0) {
            onTick?.({
              price,
              priceDigits: Number.isFinite(Number(tick?.priceDigits)) ? Number(tick.priceDigits) : priceDigits,
              timestamp: tick?.timestamp ?? tick?.time ?? null,
              timeframe,
            });
          }
        },
      });
    },
  };
}

export const prefetchCandles = prefetchSymbolCandles;
