import React, { useState, useEffect } from "react";
import { ChartColumn, PenSquare, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, Tag, TagGroup, TagList, Modal } from "@/components/ui";
import { useAppDialog } from "@/context/AppDialogContext";
import { QUICK_STRATEGIES } from "../../constants/tradeConstants";

function TradeStrategyModal({ isOpen, onClose, strategy, setStrategy, onSave, isSaving, onAddQuick }) {
  const modalTitle = (
    <h3 className="text-lg font-semibold text-[var(--text-primary)] m-0 flex items-center gap-2.5">
      <ChartColumn className="w-5 h-5 text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]" /> Trading Strategy
    </h3>
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md" bodyClassName="p-6">
      <div className="mb-6 pb-6 border-b border-[var(--border-medium)]">
        {QUICK_STRATEGIES.map((cat, idx) => (
          <div key={idx} className="mb-4 last:mb-0">
            <div className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wide font-semibold">{cat.category}</div>
            <TagGroup label={cat.category} size="sm">
              <TagList className="flex flex-wrap gap-1 mt-1">
                {cat.items.map((item) => (
                  <Tag key={item} id={`q-${cat.category}-${item}`} dot dotClassName="text-fg-brand-primary" className="cursor-pointer hover:opacity-80 transition-opacity" onAction={() => onAddQuick(item)} onClick={() => onAddQuick(item)}>
                    {item}
                  </Tag>
                ))}
              </TagList>
            </TagGroup>
          </div>
        ))}
      </div>
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">Custom Strategy:</label>
        <textarea
          className="w-full p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] resize-y transition-all"
          value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="Describe your trading strategy..." rows={5}
        />
      </div>
      <div className="flex items-center justify-end gap-2.5 mt-4 pt-4 border-t border-[var(--border-light)]">
        <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--surface-muted)] transition-all cursor-pointer" onClick={onClose}>Cancel</button>
        <button className="px-4 py-2 text-xs font-medium text-[var(--button-text)] bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:opacity-90 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Strategy"}
        </button>
      </div>
    </Modal>
  );
}

export default function TradeStrategySection({ trade, onSaveDraft }) {
  const { notify } = useAppDialog();
  const [strategy, setStrategy] = useState(trade?.strategy || "");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setStrategy(trade?.strategy || ""); }, [trade?.strategy]);

  const saveStrategy = async () => {
    if (!strategy) return;
    setIsSaving(true);
    try {
      if (onSaveDraft) onSaveDraft({ strategy });
      setShowModal(false);
      notify("Strategy updated.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuick = (item) => setStrategy((prev) => (prev ? `${prev}\n${item}` : item));
  const tags = strategy.split("\n").flatMap((s) => s.split(",")).map((st) => st.trim()).filter(Boolean);

  return (
    <>
      <Card variant="default" padding="sm" className="mb-3">
        <CardHeader className="pb-2.5 mb-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <CardTitle className="flex items-center gap-1.5"><ChartColumn className="w-4 h-4" /> Strategy</CardTitle>
          <button
            className="bg-[color-mix(in_srgb,var(--accent-success-strong)_10%,var(--bg-card))] border border-[var(--border-light)] rounded-md px-3 py-1.5 text-xs text-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:bg-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] hover:text-[var(--button-text)] flex items-center gap-1.5 transition-all cursor-pointer max-sm:self-end"
            onClick={() => setShowModal(true)}
          >
            {strategy ? <PenSquare className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {strategy ? "Edit" : "Add"}
          </button>
        </CardHeader>
        <div
          className={`bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg p-2.5 text-xs leading-relaxed cursor-pointer transition-all min-h-[52px] max-h-[96px] overflow-y-auto text-[var(--text-primary)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${!strategy ? "text-[var(--text-secondary)] italic flex items-center justify-center" : ""}`}
          onClick={() => setShowModal(true)}
        >
          {tags.length > 0 ? (
            <TagGroup label="Strategy" size="md">
              <TagList className="flex flex-wrap gap-1">
                {tags.map((st) => <Tag key={st} id={`strat-${st}`} dot dotClassName="text-fg-brand-primary">{st}</Tag>)}
              </TagList>
            </TagGroup>
          ) : "Click to add strategy"}
        </div>
      </Card>
      <TradeStrategyModal isOpen={showModal} onClose={() => setShowModal(false)} strategy={strategy} setStrategy={setStrategy} onSave={saveStrategy} isSaving={isSaving} onAddQuick={addQuick} />
    </>
  );
}
