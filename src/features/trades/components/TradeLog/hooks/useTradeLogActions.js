import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDialog } from "@/context/AppDialogContext";
import api from "@/utils/common/serve";

const INITIAL_EDIT_FORM = {
  side: "buy",
  quantity: "",
  entry_price: "",
  exit_price: "",
  stop_loss: "",
  take_profit: "",
  strategy: "",
  rating: 0,
  mistakes: "",
  custom_tags: "",
  notes: "",
};

export function useTradeLogActions(setLocalTrades, user, queryClient) {
  const navigate = useNavigate();
  const { notify, confirm } = useAppDialog();

  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleTradeClick = (trade) => {
    if (trade?.unique_id) {
      navigate(`/trade/${trade.unique_id}`, { state: { tradeData: trade } });
    }
  };

  const handleCopyTrade = (trade) => {
    setOpenActionMenuId(null);
    const tradeSummary = {
      symbol: trade.symbol,
      type: trade.directionLabel,
      pnl: trade.netPnl,
      pnl_currency: trade.pnlCurrency,
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      quantity: trade.quantity,
      entry_time: trade.entryTimeFormatted,
      exit_time: trade.exitTimeFormatted,
      stop_loss: trade.stopLoss,
      take_profit: trade.takeProfit,
      strategy: trade.strategy,
      rating: trade.rating,
      notes: trade.notes,
      mistakes: trade.mistakes,
      custom_tags: trade.customTags,
    };
    navigator.clipboard.writeText(JSON.stringify(tradeSummary, null, 2));
    notify("Trade details copied to clipboard", "success");
  };

  const handleDownloadTrade = (trade) => {
    setOpenActionMenuId(null);
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(trade, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `trade-${trade.symbol || "details"}-${trade.unique_id || "export"}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notify("Trade details downloaded", "success");
  };

  const handleDeleteTrade = async (trade) => {
    setOpenActionMenuId(null);
    const confirmed = await confirm(
      `Are you sure you want to delete the trade for ${trade.symbol || "this position"}? This action cannot be undone.`,
      { title: "Delete trade", confirmText: "Delete", tone: "danger" }
    );
    if (!confirmed) return;

    try {
      const res = await api.delete(`/trades/${trade.unique_id}`);
      if (res.data && res.data.success) {
        if (typeof setLocalTrades === "function") {
          setLocalTrades((prev) =>
            prev.filter((t) => t.unique_id !== trade.unique_id)
          );
        }
        if (user?.ID && queryClient) {
          queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
          queryClient.invalidateQueries({ queryKey: ["trade-log-trades"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
        }
        notify("Trade deleted successfully", "success");
      } else {
        notify(res.data?.error || "Could not delete trade", "error");
      }
    } catch {
      notify("Could not delete trade. Please try again.", "error");
    }
  };

  const handleOpenEditModal = (trade) => {
    setOpenActionMenuId(null);
    setEditingTrade(trade);
    setEditForm({
      side: trade.tradeType,
      quantity: trade.quantity ?? "",
      entry_price: trade.entryPrice ?? "",
      exit_price: trade.exitPrice ?? "",
      stop_loss: trade.stopLoss ?? "",
      take_profit: trade.takeProfit ?? "",
      strategy: trade.strategy ?? "",
      rating: Math.round(Number(trade.executionScore ?? 0)),
      mistakes: Array.isArray(trade.mistakes)
        ? trade.mistakes.join(", ")
        : (trade.mistakes ?? ""),
      custom_tags: Array.isArray(trade.customTags)
        ? trade.customTags.join(", ")
        : (trade.customTags ?? ""),
      notes: trade.notes ?? "",
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingTrade) return;
    setIsSavingEdit(true);

    try {
      const payload = {
        unique_id: editingTrade.unique_id,
        side: editForm.side,
        quantity: editForm.quantity !== "" ? Number(editForm.quantity) : null,
        entry_price:
          editForm.entry_price !== "" ? Number(editForm.entry_price) : null,
        exit_price:
          editForm.exit_price !== "" ? Number(editForm.exit_price) : null,
        stop_loss:
          editForm.stop_loss !== "" ? Number(editForm.stop_loss) : null,
        take_profit:
          editForm.take_profit !== "" ? Number(editForm.take_profit) : null,
        strategy: editForm.strategy,
        mistakes: editForm.mistakes,
        custom_tags: editForm.custom_tags,
        notes: editForm.notes,
        trade_rating: Number(editForm.rating) || null,
      };

      const res = await api.post("/update-trade", payload);
      if (res.data && res.data.success) {
        notify("Trade details updated successfully", "success");
        const updatedTradeData =
          res.data.trade || {
            ...editingTrade,
            ...payload,
            price: payload.entry_price,
          };
        if (typeof setLocalTrades === "function") {
          setLocalTrades((prev) =>
            prev.map((t) =>
              t.unique_id === editingTrade.unique_id
                ? { ...t, ...updatedTradeData }
                : t
            )
          );
        }
        if (user?.ID && queryClient) {
          queryClient.invalidateQueries({ queryKey: ["trades", user.ID] });
          queryClient.invalidateQueries({ queryKey: ["trade-log-trades"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-analytics"] });
        }
        setEditingTrade(null);
      } else {
        notify(res.data?.error || "Could not update trade", "error");
      }
    } catch {
      notify("Could not update trade. Please try again.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return {
    openActionMenuId,
    setOpenActionMenuId,
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
  };
}

export default useTradeLogActions;
