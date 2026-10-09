import React from "react";
import { Checkbox, InfoTooltip, PaginationCardMinimal } from "@/components/ui";
import TradeLogTableRow from "./TradeLogTableRow";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function TradeLogTable({
  filteredTrades = [],
  pagination,
  isAllSelected = false,
  toggleSelectAll,
  selectedUniqueIds = [],
  toggleSelectTrade,
  handleTradeClick,
  visibleColumns = {},
  currencyCode = "USD",
  openActionMenuId,
  handleOpenEditModal,
  handleCopyTrade,
  handleDownloadTrade,
  handleDeleteTrade,
  currentPage = 1,
  setCurrentPage,
  rowsPerPage = 25,
  setRowsPerPage,
  rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS,
}) {
  const visibleColumnCount = Object.values(visibleColumns ?? {}).filter(Boolean).length;
  const colSpanCount = visibleColumnCount + 3;

  return (
    <div className="w-full flex-1 min-h-0 border border-[var(--border-medium)] dark:border-white/10 rounded-xl flex flex-col bg-[var(--bg-card)] shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden mt-1 relative">
      <div className="min-h-0 flex-1 overflow-auto flex flex-col custom-scrollbar">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="sticky top-0 bg-[var(--bg-card)] z-10 border-b border-[var(--border-medium)]">
              <th className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky left-0 z-15 bg-[var(--bg-card)] whitespace-nowrap">
                <div className="flex items-center justify-center">
                  <Checkbox
                    isSelected={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all trades"
                  />
                </div>
              </th>
              {visibleColumns.symbol && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">
                  <div className="inline-flex items-center gap-1.5">
                    <span>Symbol</span>
                    <InfoTooltip
                      text="Financial instrument symbol"
                      size={11}
                      side="top"
                    />
                  </div>
                </th>
              )}
              {visibleColumns.date && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">
                  <div className="inline-flex items-center gap-1.5">
                    <span>Date</span>
                    <span className="text-[11px] opacity-60">🠑</span>
                  </div>
                </th>
              )}
              {visibleColumns.type && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Type</th>
              )}
              <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Status</th>
              {visibleColumns.pnl && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">
                  <div className="inline-flex items-center gap-1.5">
                    <span>P&amp;L</span>
                    <InfoTooltip
                      text="Net profit/loss for the position"
                      size={11}
                      side="top"
                    />
                  </div>
                </th>
              )}
              {visibleColumns.entry && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Entry price</th>
              )}
              {visibleColumns.exit && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Exit price</th>
              )}
              {visibleColumns.quantity && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Quantity</th>
              )}
              {visibleColumns.entryTime && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Entry time</th>
              )}
              {visibleColumns.exitTime && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Exit time</th>
              )}
              {visibleColumns.duration && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Duration</th>
              )}
              {visibleColumns.category && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Category</th>
              )}
              {visibleColumns.productType && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Product type</th>
              )}
              {visibleColumns.source && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Source</th>
              )}
              {visibleColumns.platform && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Platform</th>
              )}
              {visibleColumns.account && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Account</th>
              )}
              {visibleColumns.broker && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Broker</th>
              )}
              {visibleColumns.grossPnl && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Gross P&amp;L</th>
              )}
              {visibleColumns.netPnl && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Net P&amp;L</th>
              )}
              {visibleColumns.fees && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Fees</th>
              )}
              {visibleColumns.stopLoss && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Stop loss</th>
              )}
              {visibleColumns.takeProfit && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Take profit</th>
              )}
              {visibleColumns.tradeRisk && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Trade risk</th>
              )}
              {visibleColumns.lotSize && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Lot size</th>
              )}
              {visibleColumns.percentChange && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">% change</th>
              )}
              {visibleColumns.strategy && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Strategy</th>
              )}
              {visibleColumns.notes && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Notes</th>
              )}
              {visibleColumns.mistakes && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Mistakes</th>
              )}
              {visibleColumns.rating && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Rating</th>
              )}
              {visibleColumns.executionScore && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Execution score</th>
              )}
              {visibleColumns.breakeven && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Breakeven</th>
              )}
              {visibleColumns.customTags && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Tags</th>
              )}
              {visibleColumns.quantityUnit && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">Quantity unit</th>
              )}
              {visibleColumns.pnlCurrency && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">P&amp;L currency</th>
              )}
              {visibleColumns.pnlSource && (
                <th className="p-3 px-4 text-left font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11.5px] whitespace-nowrap align-middle bg-[var(--bg-card)]">P&amp;L source</th>
              )}
              <th className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky right-0 z-15 bg-[var(--bg-card)] whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!filteredTrades || filteredTrades.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpanCount}
                  className="p-8 text-center text-sm font-medium text-[var(--text-secondary)]"
                >
                  No trades found for the selected filters
                </td>
              </tr>
            ) : (
              (pagination?.rows || []).map((trade, i) => {
                const tradeUniqueId = trade?.unique_id ?? null;
                const rowKey = tradeUniqueId || `row-${i}`;
                const isSelected =
                  tradeUniqueId != null &&
                  selectedUniqueIds.includes(tradeUniqueId);

                return (
                  <TradeLogTableRow
                    key={rowKey}
                    trade={trade}
                    index={i}
                    isSelected={isSelected}
                    onToggleSelect={toggleSelectTrade}
                    onRowClick={handleTradeClick}
                    visibleColumns={visibleColumns}
                    currencyCode={currencyCode}
                    openActionMenuId={openActionMenuId}
                    onOpenEdit={handleOpenEditModal}
                    onCopy={handleCopyTrade}
                    onDownload={handleDownloadTrade}
                    onDelete={handleDeleteTrade}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PaginationCardMinimal
        page={pagination?.page ?? 1}
        totalPages={pagination?.totalPages ?? 1}
        from={pagination?.from}
        to={pagination?.to}
        totalItems={pagination?.totalItems ?? 0}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(size) => {
          const opts = rowsPerPageOptions ?? ROWS_PER_PAGE_OPTIONS;
          if (size && opts.includes(size)) {
            if (setRowsPerPage) setRowsPerPage(size);
            if (setCurrentPage) setCurrentPage(1);
          }
        }}
        rowsPerPageOptions={rowsPerPageOptions ?? ROWS_PER_PAGE_OPTIONS}
      />
    </div>
  );
}

export default TradeLogTable;
