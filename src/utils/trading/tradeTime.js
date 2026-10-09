export const BROWSER_TIME_ZONE = typeof Intl !== 'undefined' && Intl.DateTimeFormat
  ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  : 'UTC';

export const MAJOR_TIME_ZONES = [
  BROWSER_TIME_ZONE,
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Frankfurt',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export const TIME_ZONES = Array.from(new Set(MAJOR_TIME_ZONES));

export const TIME_ZONE_OPTIONS = TIME_ZONES.map((zone) => ({
  value: zone,
  label: zone.replaceAll('_', ' '),
}));

export const parseDateTimeInZone = (dateTimeStr, timeZone = BROWSER_TIME_ZONE) => {
  if (!dateTimeStr) return null;

  const match = String(dateTimeStr).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const d = new Date(dateTimeStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6] || 0);

  if (!timeZone || timeZone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  }

  const targetAsUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  const getOffsetMs = (timestamp) => {
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      const parts = dtf.formatToParts(new Date(timestamp));
      const partMap = {};
      for (const p of parts) {
        if (p.type !== 'literal') partMap[p.type] = Number(p.value);
      }
      if (partMap.hour === 24) partMap.hour = 0;
      const formattedAsUtcMs = Date.UTC(
        partMap.year,
        partMap.month - 1,
        partMap.day,
        partMap.hour,
        partMap.minute,
        partMap.second || 0
      );
      return formattedAsUtcMs - timestamp;
    } catch {
      return 0;
    }
  };

  const offsetMs = getOffsetMs(targetAsUtcMs);
  let utcMs = targetAsUtcMs - offsetMs;
  const offsetMs2 = getOffsetMs(utcMs);
  if (offsetMs2 !== offsetMs) {
    utcMs = targetAsUtcMs - offsetMs2;
  }

  return new Date(utcMs);
};

export const dateFromEpoch = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) return null;

    const numericValue = Number(trimmedValue);
    if (!Number.isNaN(numericValue)) {
      return dateFromEpoch(numericValue);
    }

    const date = new Date(trimmedValue);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  const milliseconds = numericValue < 1000000000000
    ? numericValue * 1000
    : numericValue;
  const date = new Date(milliseconds);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const getTradeOpenDate = (trade) => dateFromEpoch(trade?.entryAt);

export const getTradeCloseDate = (trade) => (
  dateFromEpoch(trade?.exitAt)
);

export const getTradeDisplayDate = (trade) => (
  getTradeCloseDate(trade)
  || getTradeOpenDate(trade)
);

export const getTradeDisplayTime = (trade) => getTradeDisplayDate(trade)?.getTime() || 0;

export const formatDisplayDate = (value, fallback = '--') => {
  const date = dateFromEpoch(value);
  if (!date) return fallback;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

export const formatDisplayTime = (value, fallback = '--') => {
  const date = dateFromEpoch(value);
  if (!date) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const toTradeDateKey = (trade) => {
  const date = getTradeDisplayDate(trade);
  return date ? date.toISOString().slice(0, 10) : null;
};

