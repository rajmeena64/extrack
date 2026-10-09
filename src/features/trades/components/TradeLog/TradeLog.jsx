import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import tradeApi from "@/utils/api/tradeApi";

import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import PageHeader from "@/components/Layout/PageHeader";

import {
  COLUMN_OPTIONS,
  MAX_VISIBLE_COLUMNS,
} from "./constants/tradeLogColumns";
import {
  ROWS_PER_PAGE_OPTIONS,
  DEFAULT_FILTERS,
} from "./constants/tradeLogFilters";

import { useTradeLogSettings } from "./hooks/useTradeLogSettings";
import { useTradeLogFilters } from "./hooks/useTradeLogFilters";
import { useTradeLogSelection } from "./hooks/useTradeLogSelection";
import { useTradeLogActions } from "./hooks/useTradeLogActions";

import { TradeLogSkeleton } from "./components/TradeLogSkeleton/TradeLogSkeleton";
import { TradeLogToolbar } from "./components/TradeLogToolbar/TradeLogToolbar";
import { TradeLogTable } from "./components/TradeLogTable/TradeLogTable";
import { TradeLogEditModal } from "./components/TradeLogEditModal/TradeLogEditModal";

export function TradeLog({ currencyCode = "USD" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  const {
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    currentMonth,
    currentYear,
    dateRange,
    setDateRange,
    rowsPerPage,
    setRowsPerPage,
    settingsLoaded,
    isLoading: isSettingsLoading,
  } = useTradeLogSettings();

  const queryParams = useMemo(() => {
    const p = { page: currentPage, limit: rowsPerPage, currency: currencyCode };
    Object.entries(filters ?? {}).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined && v !== false) p[k] = v;
    });
    if (dateRange?.from) p.from = dateRange.from;
    if (dateRange?.to) p.to = dateRange.to;
    return p;
  }, [currentPage, rowsPerPage, filters, dateRange, currencyCode]);

  const tradesQuery = useQuery({
    queryKey: ['trade-log-trades', user?.ID, queryParams],
    queryFn: () => tradeApi.getAll(queryParams),
    enabled: Boolean(user?.ID),
    staleTime: 0,
  });

  const queryTrades = tradesQuery.data?.trades ?? [];
  const [localTrades, setLocalTrades] = useState(queryTrades);
  useEffect(() => {
    if (tradesQuery.data?.trades) setLocalTrades(tradesQuery.data.trades);
  }, [tradesQuery.data?.trades]);

  const {
    filteredTrades,
    filterValues,
    activeFilterCount,
    hasActiveFilters,
  } = useTradeLogFilters(
    localTrades,
    filters,
    tradesQuery.data?.filterOptions
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [currentMonth, currentYear, dateRange, filters, rowsPerPage]);

  const pagination = useMemo(() => {
    const totalCount = tradesQuery.data?.totalCount ?? filteredTrades.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
    return {
      page: currentPage,
      totalPages,
      totalItems: totalCount,
      rows: filteredTrades,
      from: totalCount ? (currentPage - 1) * rowsPerPage + 1 : 0,
      to: Math.min(currentPage * rowsPerPage, totalCount),
    };
  }, [currentPage, filteredTrades, rowsPerPage, tradesQuery.data?.totalCount]);

  const {
    selectedUniqueIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelectTrade,
  } = useTradeLogSelection(pagination?.rows);

  const {
    openActionMenuId,
    editingTrade,
    setEditingTrade,
    editForm,
    setEditForm,
    isSavingEdit,
    handleTradeClick,
    handleCopyTrade,
    handleDownloadTrade,
    handleDeleteTrade,
    handleOpenEditModal,
    handleSaveEdit,
  } = useTradeLogActions(setLocalTrades, user, queryClient);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const selectedColumnCount = Object.values(visibleColumns ?? {}).filter(Boolean).length;
  const isLoading = isSettingsLoading || (tradesQuery.isLoading && !tradesQuery.data);

  if (isLoading || !settingsLoaded) {
    return (
      <MainContentWrapper className="flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden box-border pt-0 px-2.5 pb-2.5 max-[768px]:pt-[60px] max-[768px]:px-2 max-[768px]:pb-2 max-[520px]:px-1.5 max-[480px]:pb-[calc(82px+env(safe-area-inset-bottom,0px))]">
        <TradeLogSkeleton />
      </MainContentWrapper>
    );
  }

  return (
    <MainContentWrapper className="flex flex-col h-screen h-[100dvh] max-h-screen max-h-[100dvh] overflow-hidden box-border pt-0 px-2.5 pb-2.5 max-[768px]:pt-[60px] max-[768px]:px-2 max-[768px]:pb-2 max-[520px]:px-1.5 max-[480px]:pb-[calc(82px+env(safe-area-inset-bottom,0px))]">
      <PageHeader
        title="Trade Log"
        onBack={() => navigate(-1)}
        keepVisible
        className="relative z-10 mb-1 shrink-0"
        actions={
          <TradeLogToolbar
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            filters={filters}
            setFilters={setFilters}
            filterValues={filterValues}
            resetFilters={resetFilters}
            dateRange={dateRange}
            setDateRange={setDateRange}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            selectedColumnCount={selectedColumnCount}
            maxColumns={MAX_VISIBLE_COLUMNS}
            columnOptions={COLUMN_OPTIONS}
          />
        }
      />

      <TradeLogTable
        filteredTrades={filteredTrades}
        pagination={pagination}
        isAllSelected={isAllSelected}
        toggleSelectAll={toggleSelectAll}
        selectedUniqueIds={selectedUniqueIds}
        toggleSelectTrade={toggleSelectTrade}
        handleTradeClick={handleTradeClick}
        visibleColumns={visibleColumns}
        currencyCode={currencyCode}
        openActionMenuId={openActionMenuId}
        handleOpenEditModal={handleOpenEditModal}
        handleCopyTrade={handleCopyTrade}
        handleDownloadTrade={handleDownloadTrade}
        handleDeleteTrade={handleDeleteTrade}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />

      {editingTrade && (
        <TradeLogEditModal
          editingTrade={editingTrade}
          onClose={() => setEditingTrade(null)}
          editForm={editForm}
          setEditForm={setEditForm}
          handleSaveEdit={handleSaveEdit}
          isSavingEdit={isSavingEdit}
        />
      )}
    </MainContentWrapper>
  );
}

export default TradeLog;
