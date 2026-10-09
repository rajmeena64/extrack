export const MAX_VISIBLE_COLUMNS = 10;

export const COLUMN_OPTIONS = [
  ["date", "Date"],
  ["symbol", "Symbol"],
  ["type", "Type"],
  ["pnl", "P&L"],
  ["entry", "Entry price"],
  ["exit", "Exit price"],
  ["quantity", "Quantity"],
  ["entryTime", "Entry time"],
  ["exitTime", "Exit time"],
  ["duration", "Duration"],
  ["category", "Category"],
  ["productType", "Product type"],
  ["source", "Source"],
  ["platform", "Platform"],
  ["account", "Account"],
  ["broker", "Broker"],
  ["grossPnl", "Gross P&L"],
  ["netPnl", "Net P&L"],
  ["fees", "Fees"],
  ["stopLoss", "Stop loss"],
  ["takeProfit", "Take profit"],
  ["tradeRisk", "Trade risk"],
  ["lotSize", "Lot size"],
  ["percentChange", "% change"],
  ["strategy", "Strategy"],
  ["notes", "Notes"],
  ["mistakes", "Mistakes"],
  ["rating", "Rating"],
  ["executionScore", "Execution score"],
  ["breakeven", "Breakeven"],
  ["customTags", "Tags"],
  ["quantityUnit", "Quantity unit"],
  ["pnlCurrency", "P&L currency"],
  ["pnlSource", "P&L source"],
];

export const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(
  COLUMN_OPTIONS.map(([key]) => [
    key,
    ["symbol", "productType", "type", "entry", "exit", "quantity", "date", "pnl"].includes(key),
  ])
);
