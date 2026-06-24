export function normalizeTradePnlSign(trade) {
  const pnl = Number(trade?.pnl);
  const entry = Number(trade?.price);
  const exit = Number(trade?.exit_price);
  const side = String(trade?.trade_type || "").trim().toLowerCase();

  if (
    !Number.isFinite(pnl)
    || pnl === 0
    || !Number.isFinite(entry)
    || !Number.isFinite(exit)
    || entry <= 0
    || exit <= 0
    || (side !== "buy" && side !== "sell")
  ) {
    return Number.isFinite(pnl) ? pnl : 0;
  }

  const expectedMove = side === "sell" ? entry - exit : exit - entry;
  if (expectedMove === 0) return pnl;

  const expectedSign = Math.sign(expectedMove);
  return Math.abs(pnl) * expectedSign;
}

export function normalizeTradeForCalculations(trade) {
  if (!trade || typeof trade !== "object") return trade;

  const originalPnl = trade.source_pnl ?? trade.pnl;

  return {
    ...trade,
    pnl: normalizeTradePnlSign(trade),
    source_pnl: originalPnl,
  };
}

export function formatTradePrice(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value || "--";
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  });
}
