import { useMemo } from "react";

export function useTradeLogFilters(trades, filters, filterOptions) {
  const activeFilterCount = useMemo(
    () =>
      [
        filters?.symbol,
        filters?.tradeType,
        filters?.category,
        filters?.productType,
        filters?.source,
        filters?.platform,
        filters?.account,
        filters?.broker,
        filters?.strategy,
        filters?.rating,
        filters?.breakeven,
        filters?.winTrades,
        filters?.lossTrades,
        filters?.hasStopLoss,
        filters?.hasTakeProfit,
        filters?.hasNotes,
        filters?.hasMistakes,
        filters?.minPnl,
        filters?.maxPnl,
        filters?.minQuantity,
        filters?.maxQuantity,
        filters?.sortBy,
      ].filter(Boolean).length,
    [filters]
  );

  return {
    filteredTrades: Array.isArray(trades) ? trades : [],
    filterValues: filterOptions ?? {},
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export default useTradeLogFilters;
