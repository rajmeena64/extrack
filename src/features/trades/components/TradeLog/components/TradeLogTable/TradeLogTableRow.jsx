import React, { memo } from "react";
import SymbolWithIcon from "@/components/Common/SymbolWithIcon/SymbolWithIcon";
import { Checkbox } from "@/components/ui";
import { renderTradeTypeBadge, renderRatingScale, renderTags, displayValue } from "./TradeLogCellRenderers";
import TradeLogRowActions from "./TradeLogRowActions";

export const TradeLogTableRow = memo(function TradeLogTableRow({
  trade,
  isSelected = false,
  onToggleSelect,
  onRowClick,
  visibleColumns = {},
  openActionMenuId,
  onOpenEdit,
  onCopy,
  onDownload,
  onDelete,
}) {
  if (!trade) return null;

  const statusTone = trade.statusTone;
  const statusClasses = statusTone === "brand"
    ? "bg-brand-500/10 text-brand-500 border-brand-500/30"
    : statusTone === "success"
    ? "bg-[var(--accent-success-soft)] text-[var(--accent-success-strong)] border-[color-mix(in_srgb,var(--accent-success)_30%,transparent)]"
    : statusTone === "error"
    ? "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[color-mix(in_srgb,var(--accent-danger)_30%,transparent)]"
    : "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border-light)]";

  const pnlBadgeClass = statusTone === "success"
    ? "bg-[var(--accent-success-soft)] text-[var(--profit-color)] font-bold"
    : statusTone === "error"
    ? "bg-[var(--accent-danger-soft)] text-[var(--loss-color)] font-bold"
    : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-light)] font-semibold";

  return (
    <tr
      onClick={(e) => {
        if (!e.target.closest("[data-actions-cell]") && onRowClick) onRowClick(trade);
      }}
      className={`group border-b border-[var(--border-light)] cursor-pointer transition-colors duration-100 hover:bg-slate-500/5 ${
        isSelected ? "bg-[var(--surface-muted)]" : "bg-[var(--bg-card)]"
      } ${openActionMenuId === trade.unique_id ? "relative z-20 bg-slate-500/5" : ""}`}
    >
      <td className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky left-0 z-11 bg-inherit shadow-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center">
          <Checkbox isSelected={isSelected} onChange={() => onToggleSelect && onToggleSelect(trade)} aria-label={`Select trade ${trade.symbol || ""}`} />
        </div>
      </td>
      {visibleColumns.symbol && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <SymbolWithIcon symbol={trade.symbol} size="lg" />
        </td>
      )}
      {visibleColumns.date && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <div className="flex flex-col gap-0.5">
            <div className="font-semibold text-[var(--text-primary)]">{trade.displayDate}</div>
            <small className="block text-[11px] font-medium text-[var(--text-muted)]">{trade.displayTime}</small>
          </div>
        </td>
      )}
      {visibleColumns.type && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          {renderTradeTypeBadge(trade.directionLabel)}
        </td>
      )}
      <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold leading-none whitespace-nowrap border ${statusClasses}`}>
          <span className="size-1.5 rounded-full bg-current" />
          {trade.statusLabel}
        </span>
      </td>
      {visibleColumns.pnl && (
        <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">
          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs leading-tight tracking-wide whitespace-nowrap ${pnlBadgeClass}`}>
            {trade.pnlFormatted}
          </span>
        </td>
      )}
      {visibleColumns.entry && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.entryPriceFormatted}</td>}
      {visibleColumns.exit && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.exitPriceFormatted}</td>}
      {visibleColumns.quantity && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.quantityFormatted}</td>}
      {visibleColumns.entryTime && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.entryTimeFormatted}</td>}
      {visibleColumns.exitTime && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.exitTimeFormatted}</td>}
      {visibleColumns.duration && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.durationFormatted}</td>}
      {visibleColumns.category && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.category)}</td>}
      {visibleColumns.productType && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.instrumentTypeLabel)}</td>}
      {visibleColumns.source && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.source)}</td>}
      {visibleColumns.platform && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.platform)}</td>}
      {visibleColumns.account && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.accountName)}</td>}
      {visibleColumns.broker && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.brokerName)}</td>}
      {visibleColumns.grossPnl && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.grossPnlFormatted}</td>}
      {visibleColumns.netPnl && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.netPnlFormatted}</td>}
      {visibleColumns.fees && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.totalChargesFormatted}</td>}
      {visibleColumns.stopLoss && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.stopLossFormatted}</td>}
      {visibleColumns.takeProfit && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.takeProfitFormatted}</td>}
      {visibleColumns.tradeRisk && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.tradeRiskFormatted}</td>}
      {visibleColumns.lotSize && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.lotSize)}</td>}
      {visibleColumns.percentChange && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.percentChange)}</td>}
      {visibleColumns.strategy && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{renderTags(trade.strategy, "strategy")}</td>}
      {visibleColumns.notes && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.notes)}</td>}
      {visibleColumns.mistakes && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{renderTags(trade.mistakes, "mistake")}</td>}
      {visibleColumns.rating && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{renderRatingScale(trade.rating)}</td>}
      {visibleColumns.executionScore && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.executionScore)}</td>}
      {visibleColumns.breakeven && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{trade.breakevenFormatted}</td>}
      {visibleColumns.customTags && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{renderTags(trade.customTags, "custom")}</td>}
      {visibleColumns.quantityUnit && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.quantityUnit)}</td>}
      {visibleColumns.pnlCurrency && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.pnlCurrency)}</td>}
      {visibleColumns.pnlSource && <td className="px-4 py-3.5 text-sm font-medium leading-normal text-[var(--text-primary)] align-middle whitespace-nowrap bg-inherit">{displayValue(trade.pnlSource)}</td>}
      <td data-actions-cell="true" className="w-9 min-w-[36px] max-w-[36px] px-1 py-2.5 text-center sticky right-0 z-11 bg-inherit shadow-none overflow-visible">
        <TradeLogRowActions trade={trade} onOpenEdit={onOpenEdit} onCopy={onCopy} onDownload={onDownload} onDelete={onDelete} />
      </td>
    </tr>
  );
});

export default TradeLogTableRow;
