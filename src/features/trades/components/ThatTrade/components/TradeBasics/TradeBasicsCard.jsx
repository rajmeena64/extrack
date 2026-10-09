import React, { useState } from "react";
import { Info, PenSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, DropdownSelect } from "@/components/ui";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";
import tradeApi from "@/utils/api/tradeApi";
import { useAuth } from "@/context/AuthContext";
import { useAppDialog } from "@/context/AppDialogContext";
import { useQueryClient } from "@tanstack/react-query";

import { formatCurrency } from "@/utils/user/Currency";
import { formatDisplayDate, formatDisplayTime } from "@/utils/trading/tradeTime";

const Stat = ({ label, value }) => (
  <div className="flex items-center justify-between min-w-0 py-1.5 border-b border-[var(--border-light)] last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] hover:px-2 hover:rounded-md max-sm:flex-col max-sm:items-start max-sm:gap-1">
    <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
    <span className="text-xs font-semibold text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap max-sm:self-end">{value}</span>
  </div>
);

function TradeBasicsModal({ isOpen, onClose, basicsForm, setBasicsForm, onSave, isSaving }) {
  if (!isOpen) return null;
  const update = (k, v) => setBasicsForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-[var(--overlay-backdrop)] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-[550px] max-h-[90vh] overflow-y-auto shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-[var(--border-medium)] bg-[var(--bg-card)] sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0 flex items-center gap-2.5">
            <PenSquare className="w-5 h-5 text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]" /> Edit Trade Basics
          </h3>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-2xl leading-none text-[var(--text-secondary)] hover:text-[var(--loss-color)] hover:bg-[var(--accent-danger-soft)] transition-all hover:rotate-90 cursor-pointer p-0 bg-transparent border-0" onClick={onClose}>×</button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Side</label>
              <DropdownSelect value={basicsForm?.side} onChange={(e) => update("side", e.target.value)} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} ariaLabel="Trade side" />
            </div>
            {[
              ["Quantity / Size", "quantity", "Enter quantity"],
              ["Entry Price", "price", "Enter entry price"],
              ["Exit Price", "exit_price", "Enter exit price"],
              ["Stop Loss", "stop_loss", "Enter stop loss"],
              ["Take Profit", "take_profit", "Enter take profit"],
            ].map(([lbl, fld, ph]) => (
              <div key={fld}>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5">{lbl}</label>
                <input type="number" step="any" className="w-full text-xs font-semibold px-2.5 py-2 border border-[var(--border-medium)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] transition-all" value={basicsForm?.[fld] ?? ""} onChange={(e) => update(fld, e.target.value)} placeholder={ph} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border-light)]">
            <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--surface-muted)] transition-all cursor-pointer" onClick={onClose}>Cancel</button>
            <button className="px-4 py-2 text-xs font-medium text-[var(--button-text)] bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:opacity-90 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradeBasicsCard({ trade, displayedPnl, pnlCurrency = "USD", isProfit, onTradeUpdated }) {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const [showBasicsModal, setShowBasicsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [basicsForm, setBasicsForm] = useState({ quantity: "", price: "", exit_price: "", side: "", stop_loss: "", take_profit: "" });

  const handleOpenBasicsModal = () => {
    setBasicsForm({
      quantity: trade?.quantity ?? "", price: trade?.entryPrice ?? "", exit_price: trade?.exitPrice ?? "",
      side: trade?.side ?? "", stop_loss: trade?.stopLoss ?? "", take_profit: trade?.takeProfit ?? "",
    });
    setShowBasicsModal(true);
  };

  const handleSaveBasics = async () => {
    const activeTargetId = trade?.unique_id;
    if (!activeTargetId) return;
    setIsSaving(true);
    try {
      const numOrNull = (v) => (v !== "" && v !== null ? Number(v) : null);
      const payload = {
        quantity: numOrNull(basicsForm.quantity), entry_price: numOrNull(basicsForm.price),
        exit_price: numOrNull(basicsForm.exit_price), side: String(basicsForm.side).toLowerCase(),
        stop_loss: numOrNull(basicsForm.stop_loss), take_profit: numOrNull(basicsForm.take_profit),
      };
      const data = await tradeApi.update(activeTargetId, payload);
      if (data?.success) {
        notify("Trade details updated successfully.", "success");
        if (data.trade && onTradeUpdated) onTradeUpdated(data.trade);
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
        setShowBasicsModal(false);
      } else {
        throw new Error(data?.error || "Trade details could not be saved");
      }
    } catch (error) {
      notify(error?.response?.data?.error || error?.message || "Trade details could not be saved", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const duration = trade?.entryAt && trade?.exitAt
    ? Math.max(0, Math.round((new Date(trade.exitAt).getTime() - new Date(trade.entryAt).getTime()) / 60000))
    : null;
  const sideLabel = trade?.side ? (trade.side.charAt(0).toUpperCase() + trade.side.slice(1)) : "--";
  const qtyLabel = trade?.quantity != null ? `${trade.quantity}${trade?.quantityUnit ? ` ${trade.quantityUnit}` : ""}` : "--";
  const productLabel = trade?.productType ? trade.productType.replace(/_/g, " ").toUpperCase() : "--";

  const stats = [
    ["Instrument Type", productLabel],
    ["Side", sideLabel],
    ["Quantity", qtyLabel],
    ["Entry Price", formatTradePrice(trade?.entryPrice, trade?.instrumentDigits)],
    ["Exit Price", formatTradePrice(trade?.exitPrice, trade?.instrumentDigits)],
    ["Entry Time", trade?.entryAt ? formatDisplayTime(trade.entryAt) : "--"],
    ...(trade?.exitAt ? [["Exit Time", formatDisplayTime(trade.exitAt)]] : []),
    ["Duration", duration != null ? `${duration}m` : "--"],
    ["Date", trade?.entryAt ? formatDisplayDate(trade.entryAt) : "--"],
  ];

  return (
    <>
      <Card variant="subtle" padding="sm" className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[var(--text-secondary)] m-0 mb-1">Net P&amp;L</p>
          <h2 className={`text-2xl font-bold m-0 ${isProfit ? "text-[var(--profit-color)]" : "text-[var(--loss-color)]"}`}>
            {formatCurrency(displayedPnl, pnlCurrency)}
          </h2>
        </div>
      </Card>
      <Card variant="default" padding="sm" className="mb-3">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5"><Info className="w-4 h-4" /> Trade Basics</CardTitle>
          <button
            className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all cursor-pointer max-sm:self-end"
            onClick={handleOpenBasicsModal}
            aria-label="Edit trade basics"
          >
            <PenSquare className="w-3.5 h-3.5" /> Edit
          </button>
        </CardHeader>
        <div className="flex flex-col">
          {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
        </div>
      </Card>
      {trade?.marketDetailRows?.length > 0 && (
        <Card variant="default" padding="sm" className="mt-3">
          <CardHeader className="pb-2 mb-2"><CardTitle>Market Details</CardTitle></CardHeader>
          <div className="flex flex-col">
            {trade.marketDetailRows.map(({ label, value }) => <Stat key={label} label={label} value={value} />)}
          </div>
        </Card>
      )}
      <TradeBasicsModal isOpen={showBasicsModal} onClose={() => setShowBasicsModal(false)} basicsForm={basicsForm} setBasicsForm={setBasicsForm} onSave={handleSaveBasics} isSaving={isSaving} />
    </>
  );
}
