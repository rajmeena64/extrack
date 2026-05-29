const INTERVAL_SECONDS = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
};

export function generateMockCandles(timeframe = '1m', count = 320) {
  const interval = INTERVAL_SECONDS[timeframe] || 60;
  const now = Math.floor(Date.now() / 1000);
  const start = now - count * interval;
  let lastClose = 68000;

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 8) * 120 + Math.cos(index / 21) * 260;
    const drift = index * 2.7;
    const open = lastClose;
    const close = 68000 + wave + drift + Math.sin(index / 3) * 80;
    const high = Math.max(open, close) + 80 + Math.abs(Math.sin(index)) * 140;
    const low = Math.min(open, close) - 80 - Math.abs(Math.cos(index / 2)) * 120;
    lastClose = close;

    return {
      time: start + index * interval,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number((24 + Math.abs(Math.sin(index / 4)) * 80).toFixed(2)),
    };
  });
}
