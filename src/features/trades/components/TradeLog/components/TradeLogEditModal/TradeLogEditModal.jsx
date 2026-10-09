import React from "react";
import SymbolWithIcon from "@/components/Common/SymbolWithIcon/SymbolWithIcon";
import { renderTags } from "../TradeLogTable/TradeLogCellRenderers";

export const TradeLogEditModal = ({
  editingTrade,
  onClose,
  editForm = {},
  setEditForm,
  handleSaveEdit,
  isSavingEdit = false,
}) => {
  if (!editingTrade) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] bg-black/55 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 px-6 border-b border-[var(--border-medium)] bg-[var(--bg-card)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="m-0 text-lg font-bold text-[var(--heading)] flex items-center gap-2">
                <span>Edit Trade</span>
                {editingTrade.symbol ? <SymbolWithIcon symbol={editingTrade.symbol} size="md" /> : null}
              </h3>
              <p className="m-0 text-xs text-[var(--text-secondary)] mt-0.5">
                Modify trade details, strategy, and notes
              </p>
            </div>
          </div>
          <button
            type="button"
            className="bg-transparent border-0 text-lg text-[var(--text-secondary)] cursor-pointer p-1 px-2 rounded-lg hover:bg-[var(--accent-danger-soft)] hover:text-[var(--accent-danger)] transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSaveEdit}>
          <div className="p-6 overflow-y-auto flex flex-col gap-5 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 min-w-0 col-span-1 sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Trade Side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      editForm?.side === "long"
                        ? "bg-[color-mix(in_srgb,var(--accent-success-strong,#10b981)_14%,transparent)] border-[var(--accent-success-strong,#10b981)] text-[var(--accent-success-strong,#10b981)] shadow-xs font-bold"
                        : "border-[var(--border-medium)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    }`}
                    onClick={() => setEditForm({ ...editForm, side: "long" })}
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      editForm?.side === "short"
                        ? "bg-[color-mix(in_srgb,var(--accent-danger,#ef4444)_14%,transparent)] border-[var(--accent-danger,#ef4444)] text-[var(--accent-danger,#ef4444)] shadow-xs font-bold"
                        : "border-[var(--border-medium)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    }`}
                    onClick={() => setEditForm({ ...editForm, side: "short" })}
                  >
                    Short
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-quantity" className="text-xs font-semibold text-[var(--text-secondary)]">Quantity</label>
                <input
                  id="edit-quantity"
                  type="number"
                  step="any"
                  placeholder="e.g. 1.0"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.quantity ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-entry-price" className="text-xs font-semibold text-[var(--text-secondary)]">Entry Price</label>
                <input
                  id="edit-entry-price"
                  type="number"
                  step="any"
                  placeholder="Entry price"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.entry_price ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, entry_price: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-exit-price" className="text-xs font-semibold text-[var(--text-secondary)]">Exit Price</label>
                <input
                  id="edit-exit-price"
                  type="number"
                  step="any"
                  placeholder="Exit price"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.exit_price ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, exit_price: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-stop-loss" className="text-xs font-semibold text-[var(--text-secondary)]">Stop Loss</label>
                <input
                  id="edit-stop-loss"
                  type="number"
                  step="any"
                  placeholder="Stop loss"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.stop_loss ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, stop_loss: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-take-profit" className="text-xs font-semibold text-[var(--text-secondary)]">Take Profit</label>
                <input
                  id="edit-take-profit"
                  type="number"
                  step="any"
                  placeholder="Take profit"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.take_profit ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, take_profit: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="edit-strategy" className="text-xs font-semibold text-[var(--text-secondary)]">Strategy</label>
                <input
                  id="edit-strategy"
                  type="text"
                  placeholder="e.g. Breakout, Pullback"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.strategy ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, strategy: e.target.value })}
                />
                {editForm?.strategy ? (
                  <div className="mt-1">
                    {renderTags(editForm.strategy, "strategy")}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Trade Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`bg-transparent border-0 text-xl cursor-pointer p-0.5 px-1 transition-transform hover:scale-115 hover:text-[var(--accent-rating,#f59e0b)] leading-none ${
                        star <= (editForm?.rating || 0) ? "text-[var(--accent-rating,#f59e0b)]" : "text-[var(--border-medium)]"
                      }`}
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          rating: editForm?.rating === star ? 0 : star,
                        })
                      }
                      aria-label={`Rate ${star} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0 col-span-1 sm:col-span-2">
                <label htmlFor="edit-mistakes" className="text-xs font-semibold text-[var(--text-secondary)]">Mistakes</label>
                <input
                  id="edit-mistakes"
                  type="text"
                  placeholder="e.g. FOMO, Moved Stop Loss"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.mistakes ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, mistakes: e.target.value })}
                />
                {editForm?.mistakes ? (
                  <div className="mt-1">
                    {renderTags(editForm.mistakes, "mistake")}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 min-w-0 col-span-1 sm:col-span-2">
                <label htmlFor="edit-tags" className="text-xs font-semibold text-[var(--text-secondary)]">Custom Tags</label>
                <input
                  id="edit-tags"
                  type="text"
                  placeholder="e.g. London Session, News"
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)]"
                  value={editForm?.custom_tags ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, custom_tags: e.target.value })}
                />
                {editForm?.custom_tags ? (
                  <div className="mt-1">
                    {renderTags(editForm.custom_tags, "custom")}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5 min-w-0 col-span-1 sm:col-span-2">
                <label htmlFor="edit-notes" className="text-xs font-semibold text-[var(--text-secondary)]">Notes</label>
                <textarea
                  id="edit-notes"
                  rows={3}
                  placeholder="Add trade journal notes..."
                  className="w-full p-2.5 px-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs outline-hidden focus:border-[var(--button-bg)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--button-bg)_18%,transparent)] transition-all placeholder:text-[var(--text-muted)] resize-y"
                  value={editForm?.notes ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="p-4 px-6 border-t border-[var(--border-medium)] bg-[var(--bg-card)] flex justify-end gap-3">
            <button
              type="button"
              className="py-2 px-4.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors border border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              onClick={onClose}
              disabled={isSavingEdit}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border border-[color-mix(in_srgb,var(--accent-success-strong)_34%,var(--button-bg)_66%)] bg-gradient-to-br from-[var(--button-bg)] to-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--button-bg)_25%,transparent)] hover:shadow-[0_6px_16px_color-mix(in_srgb,var(--button-bg)_35%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeLogEditModal;
