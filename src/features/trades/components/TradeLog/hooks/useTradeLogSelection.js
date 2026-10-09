import { useState, useMemo, useCallback } from "react";

export const getTradeUniqueId = (trade) => {
  if (!trade) return null;
  return trade.unique_id ?? null;
};

export function useTradeLogSelection(paginationRows = []) {
  const [selectedUniqueIds, setSelectedUniqueIds] = useState([]);

  const isAllSelected = useMemo(() => {
    if (!paginationRows || paginationRows.length === 0) return false;
    const pageIds = paginationRows.map(getTradeUniqueId).filter(Boolean);
    if (pageIds.length === 0) return false;
    return pageIds.every((id) => selectedUniqueIds.includes(id));
  }, [paginationRows, selectedUniqueIds]);

  const toggleSelectAll = useCallback(() => {
    if (!paginationRows || paginationRows.length === 0) return;
    const pageIds = paginationRows.map(getTradeUniqueId).filter(Boolean);
    if (pageIds.length === 0) return;
    const isAllPageSelected = pageIds.every((id) =>
      selectedUniqueIds.includes(id)
    );

    if (isAllPageSelected) {
      const pageIdSet = new Set(pageIds);
      setSelectedUniqueIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      setSelectedUniqueIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  }, [paginationRows, selectedUniqueIds]);

  const toggleSelectTrade = useCallback((trade) => {
    const id = getTradeUniqueId(trade);
    if (id == null) return;
    setSelectedUniqueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  return {
    selectedUniqueIds,
    setSelectedUniqueIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectTrade,
    getTradeUniqueId,
  };
}

export default useTradeLogSelection;
