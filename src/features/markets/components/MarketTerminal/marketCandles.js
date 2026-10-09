const getBucketTime = (seconds, interval) => {
  const raw = String(interval || '1m').trim();
  const lower = raw.toLowerCase();
  if (lower === '1w' || lower.endsWith('w') || lower.includes('week')) {
    const d = new Date(seconds * 1000);
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }
  if (raw === '1M' || lower === '1mo' || lower.includes('month')) {
    const d = new Date(seconds * 1000);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }
  const m = /^([1-9]\d*)(m|min|minute|minutes|h|hr|hour|hours|d|day|days)$/i.exec(raw);
  if (m) {
    const val = Number(m[1]);
    const u = m[2].toLowerCase();
    const step = u.startsWith('d') ? val * 86400 : u.startsWith('h') ? val * 3600 : val * 60;
    return Math.floor(seconds / step) * step;
  }
  return Math.floor(seconds / 60) * 60;
};

export const buildStreamCandle = ({ price, priceDigits, timestamp, interval, existingCandles = [] }) => {
  const digits = Number.isInteger(priceDigits) && priceDigits >= 0 && priceDigits <= 8 ? priceDigits : 5;
  const roundPrice = (value) => Number(Number(value).toFixed(digits));
  const nextPrice = roundPrice(price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) return null;
  const rawTimestamp = Number(timestamp || Date.now() / 1000);
  const seconds = rawTimestamp > 1e12 ? Math.floor(rawTimestamp / 1000) : Math.floor(rawTimestamp);
  const time = getBucketTime(seconds, interval);
  const previous = existingCandles[existingCandles.length - 1];
  if (previous && Number(previous.time) > time) return null;
  if (previous && Number(previous.time) === time) {
    return {
      time,
      open: roundPrice(previous.open),
      high: roundPrice(Math.max(Number(previous.high), nextPrice)),
      low: roundPrice(Math.min(Number(previous.low), nextPrice)),
      close: nextPrice,
    };
  }
  return { time, open: nextPrice, high: nextPrice, low: nextPrice, close: nextPrice };
};
