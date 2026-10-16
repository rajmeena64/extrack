import { createDefaultDatafeed } from "./defaultDatafeed";
import { getDatabaseInstrumentDigits } from "@/features/markets/components/MarketTerminal/utils/instrumentDigits";
import { subscribeMarketStream } from "@/features/markets/components/MarketTerminal/marketStream";
import { formatShortTimeframe } from "../utils/chartHelpers";
import api from "@/utils/common/serve";

export const mapResolution = formatShortTimeframe;

const getBarTime = (msTime, res) => {
  const s = String(res ?? "15").trim();
  const m = s.match(/^(\d*)([a-zA-Z]*)$/);
  const val = parseInt(m?.[1] || "1", 10) || 1;
  const unit = m?.[2] || "m";
  if (unit === "M" || unit.toLowerCase().startsWith("mo")) {
    const dt = new Date(msTime);
    const bm = Math.floor(dt.getUTCMonth() / val) * val;
    return Date.UTC(dt.getUTCFullYear(), bm, 1);
  }
  const sec = Math.floor(msTime / 1000);
  const u = unit.toLowerCase();
  if (u.startsWith("w")) {
    return (Math.floor((sec - 345600) / (val * 604800)) * (val * 604800) + 345600) * 1000;
  }
  const mult = u.startsWith("d") ? 86400 : u.startsWith("h") ? 3600 : 60;
  return Math.floor(sec / (val * mult)) * (val * mult) * 1000;
};

export function createTvDatafeed({ queryClient, uniqueId } = {}) {
  const defaultFeed = createDefaultDatafeed({ queryClient, uniqueId });
  const subscriptions = new Map();
  const latestBars = new Map();
  const activeSubs = new Map();

  return {
    onReady: (cb) => {
      setTimeout(() => {
        cb({
          supports_search: true,
          supports_group_request: false,
          supported_resolutions: ["1", "2", "3", "5", "10", "15", "30", "45", "60", "120", "180", "240", "1D", "1W", "1M", "3M", "6M", "12M"],
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
        });
      }, 0);
    },

    searchSymbols: async (userInput, exchange, symbolType, onResultReady) => {
      try {
        const { data } = await api.get("/instruments", { params: { search: userInput } });
        const list = Array.isArray(data?.instruments) ? data.instruments : Array.isArray(data) ? data : [];
        onResultReady(
          list.slice(0, 50).map((item) => ({
            symbol: item.symbol,
            full_name: item.symbol,
            description: item.name,
            exchange: "Entrack",
            ticker: item.symbol,
            type: item.category,
          }))
        );
      } catch {
        onResultReady([]);
      }
    },

    resolveSymbol: async (symbolName, onResolve, onError) => {
      try {
        const cleanName = symbolName.includes(":") ? symbolName.split(":")[1] : symbolName;
        const digits = await getDatabaseInstrumentDigits(cleanName);
        const precision = Number.isInteger(digits) && digits >= 0 && digits <= 8 ? digits : 2;
        onResolve({
          name: cleanName,
          full_name: cleanName,
          description: cleanName,
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          ticker: cleanName,
          exchange: "Entrack",
          minmov: 1,
          pricescale: Math.pow(10, precision),
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: ["1", "2", "3", "5", "10", "15", "30", "45", "60", "120", "180", "240", "1D", "1W", "1M", "3M", "6M", "12M"],
          volume_precision: 2,
          data_status: "streaming",
        });
      } catch (e) {
        onError(e?.message || "Resolve failed");
      }
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistory, onError) => {
      try {
        const { to, countBack, firstDataRequest } = periodParams;
        const toMs = Number.isFinite(Number(to)) ? Number(to) * 1000 : Infinity;
        const res = await defaultFeed.getBars({
          symbol: symbolInfo.name,
          timeframe: mapResolution(resolution),
          to: toMs < Infinity ? toMs - 1 : undefined,
          countBack: 1000,
          firstDataRequest,
        });
        const rawBars = (res?.candles || []).map((c) => ({
          time: typeof c.time === "number" && c.time < 1e11 ? c.time * 1000 : c.time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume || 0),
        }));
        const bars = firstDataRequest ? rawBars : rawBars.filter((b) => b.time < toMs);
        if (bars.length > 0) {
          const key = `${symbolInfo.name}_${resolution}`;
          const lastCandle = bars[bars.length - 1];
          latestBars.set(key, { ...lastCandle });
          const sub = activeSubs.get(key);
          if (sub && sub.lastBar && sub.lastBar.time === lastCandle.time) {
            sub.lastBar.open = lastCandle.open;
            sub.lastBar.high = Math.max(sub.lastBar.high, lastCandle.high);
            sub.lastBar.low = Math.min(sub.lastBar.low, lastCandle.low);
          }
        }
        onHistory(bars, { noData: bars.length === 0 });
      } catch (e) {
        onError(e?.message || "Fetch bars failed");
      }
    },

    subscribeBars: (symbolInfo, resolution, onRealtime, subscriberUID) => {
      const key = `${symbolInfo.name}_${resolution}`;
      const subState = {
        lastBar: latestBars.get(key) ? { ...latestBars.get(key) } : null,
      };
      activeSubs.set(key, subState);
      const unsub = subscribeMarketStream({
        symbols: [symbolInfo.name],
        onTick: (tick) => {
          const price = Number(tick?.last ?? 0);
          if (price > 0) {
            const rawTime = Number(tick?.timestamp ?? tick?.time ?? Date.now());
            const msTime = rawTime < 1e11 ? rawTime * 1000 : rawTime;
            const barTime = getBarTime(msTime, resolution);
            if (!subState.lastBar || barTime > subState.lastBar.time) {
              const openPrice = Number(tick?.open) > 0 ? Number(tick.open) : price;
              const highPrice = Number(tick?.high) > 0 ? Math.max(Number(tick.high), price) : price;
              const lowPrice = Number(tick?.low) > 0 ? Math.min(Number(tick.low), price) : price;
              subState.lastBar = { time: barTime, open: openPrice, high: highPrice, low: lowPrice, close: price, volume: Number(tick?.volume ?? 0) };
            } else {
              subState.lastBar = {
                ...subState.lastBar,
                high: Math.max(subState.lastBar.high, price, Number(tick?.high || 0)),
                low: Math.min(subState.lastBar.low, price, Number(tick?.low || Infinity)),
                close: price,
                volume: subState.lastBar.volume + Number(tick?.volume ?? 0),
              };
            }
            latestBars.set(key, { ...subState.lastBar });
            onRealtime(subState.lastBar);
          }
        },
      });
      subscriptions.set(subscriberUID, () => {
        unsub();
        activeSubs.delete(key);
      });
    },

    unsubscribeBars: (subscriberUID) => {
      const unsub = subscriptions.get(subscriberUID);
      if (unsub) {
        unsub();
        subscriptions.delete(subscriberUID);
      }
    },
  };
}
