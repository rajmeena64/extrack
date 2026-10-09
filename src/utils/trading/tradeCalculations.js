export function normalizeTradePnlSign(trade) {
  const pnl = Number(trade?.pnl);
  const entry = Number(trade?.entryPrice);
  const exit = Number(trade?.exitPrice);
  const isShort = trade?.tradeType === "short";
  const isLong = trade?.tradeType === "long";

  if (
    !Number.isFinite(pnl)
    || pnl === 0
    || !Number.isFinite(entry)
    || !Number.isFinite(exit)
    || entry <= 0
    || exit <= 0
    || (!isShort && !isLong)
  ) {
    return Number.isFinite(pnl) ? pnl : 0;
  }

  const expectedMove = isShort ? entry - exit : exit - entry;
  if (expectedMove === 0) return pnl;

  const expectedSign = Math.sign(expectedMove);
  return Math.abs(pnl) * expectedSign;
}

export function normalizeTradeForCalculations(trade) {
  if (!trade || typeof trade !== "object") return trade;
  return {
    ...trade,
    pnl: normalizeTradePnlSign(trade),
    source_pnl: trade.netPnl ?? null,
  };
}

export function formatTradePrice(value, instrumentDigits) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value || "--";
  }

  const digits = instrumentDigits === null || instrumentDigits === undefined || instrumentDigits === ""
    ? Number.NaN
    : Number(instrumentDigits);

  if (Number.isInteger(digits) && digits >= 0 && digits <= 12) {
    return numericValue.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  });
}
