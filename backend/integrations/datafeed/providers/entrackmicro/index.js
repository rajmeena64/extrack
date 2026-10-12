const redis = require('../../../../infra/db/redis');
const feedService = require('../../../../infra/entrackmicro/feedservice');
const microStream = require('./micro.stream');

module.exports = {
  fetchFromRedis: async ({ symbol, limit = 700 }) => {
    const requestedLimit = Math.min(Math.max(Number(limit) || 1, 1), 700);
    const normSymbol = String(symbol || '').trim().toUpperCase();
    const redisKey = `feed:candles:${normSymbol}:1m`;
    const t0 = Date.now();
    try {
      const raw = await redis.lrange(redisKey, -requestedLimit, -1);
      const tLrange = Date.now() - t0;
      const tParseStart = Date.now();
      const parsed = [];
      if (raw && raw.length > 0) {
        for (const s of raw) {
          try {
            const c = JSON.parse(s);
            if (Array.isArray(c) && Number.isFinite(c[0])) {
              parsed.push({
                time: c[0],
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5] || 0,
              });
            }
          } catch {}
        }
      }
      const tParse = Date.now() - tParseStart;
      return { candles: parsed, tLrange, tParse };
    } catch {
      return { candles: [], tLrange: Date.now() - t0, tParse: 0 };
    }
  },
  fetchFromCtrader: async ({ symbol, timeframe = '1m', startTime, endTime, limit = 1000 }) => {
    const normSymbol = String(symbol || '').trim().toUpperCase();
    const parsedLimit = Math.min(Math.max(Number(limit) || 1, 1), 2000);
    const nowSec = Math.floor(Date.now() / 1000);
    const result = await feedService.getKlines(normSymbol, {
      interval: timeframe,
      startTime: startTime || (nowSec - parsedLimit * 60),
      endTime: endTime || nowSec,
      limit: parsedLimit,
    });
    return result?.candles || [];
  },
  fetchCandles: async ({ symbol, timeframe = '1m', startTime, endTime, limit = 1440 }) => {
    const requestedLimit = Math.min(Math.max(Number(limit) || 1, 1), 1440);
    const normSymbol = String(symbol || '').trim().toUpperCase();

    if (!startTime && !endTime && normSymbol && timeframe === '1m') {
      const redisKey = `feed:candles:${normSymbol}:1m`;
      try {
        const raw = await redis.lrange(redisKey, -requestedLimit, -1);
        if (raw && raw.length > 0) {
          const parsed = [];
          for (const s of raw) {
            try {
              const c = JSON.parse(s);
              if (Array.isArray(c) && Number.isFinite(c[0])) parsed.push(c);
            } catch {}
          }
          if (parsed.length > 0) return { candles: parsed, source: 'REDIS' };
        }
      } catch {}
    }

    const result = await feedService.getKlines(normSymbol, {
      interval: timeframe,
      startTime,
      endTime,
      limit: requestedLimit,
    });
    return { candles: result?.candles || [], source: 'CTRADER-API' };
  },
  getQuote: feedService.getQuote,
  getQuotes: feedService.getQuotes,
  getMarketData: feedService.getMarketData,
  getKlines: feedService.getKlines,
  getFeedSymbols: feedService.getFeedSymbols,
  startFeedStream: microStream.startFeedStream,
  stopFeedStream: microStream.stopFeedStream,
  updateFeedStreamSymbols: microStream.updateFeedStreamSymbols,
};
