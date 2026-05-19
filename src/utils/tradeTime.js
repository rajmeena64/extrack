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

export const getTradeOpenDate = (trade) => dateFromEpoch(trade?.open_timestamp);

export const getTradeCloseDate = (trade) => (
  dateFromEpoch(trade?.close_timestamp)
  || dateFromEpoch(trade?.exit_timestamp)
);

export const getTradeDisplayDate = (trade) => (
  getTradeCloseDate(trade)
  || getTradeOpenDate(trade)
);

export const getTradeDisplayTime = (trade) => getTradeDisplayDate(trade)?.getTime() || 0;

export const toTradeDateKey = (trade) => {
  const date = getTradeDisplayDate(trade);
  return date ? date.toISOString().slice(0, 10) : null;
};
