import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, CircleAlert, Plus, Trash2, X } from '@/icons/lucideIcons';
import { DropdownSelect as CustomSelect } from "@/components/ui";

const formatAlertDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const getSymbolString = (sym) => {
  if (!sym) return '';
  if (typeof sym === 'string') return sym;
  if (typeof sym === 'object') {
    const val = sym.symbol || '';
    if (typeof val === 'string') return val;
  }
  return String(sym || '');
};

export default function PriceAlertsDrawer({
  isOpen,
  onClose,
  alerts = [],
  symbols = [],
  activeSymbol = '',
  activeQuote = null,
  onAddAlert,
  onDeleteAlert,
  onClearTriggered,
  formatPrice,
}) {
  const [activeTab, setActiveTab] = useState('active');
  const [isCreating, setIsCreating] = useState(false);

  const currentActiveSymbol = getSymbolString(activeSymbol);
  const firstAvailableSymbol = getSymbolString(symbols[0]) || 'EURUSD';

  const [formSymbol, setFormSymbol] = useState(currentActiveSymbol || firstAvailableSymbol);
  const [formPrice, setFormPrice] = useState('');
  const [formCondition, setFormCondition] = useState('ABOVE');
  const [formNote, setFormNote] = useState('');

  useEffect(() => {
    if (currentActiveSymbol) {
      setFormSymbol(currentActiveSymbol);
    }
  }, [currentActiveSymbol]);

  useEffect(() => {
    if (isOpen && activeQuote) {
      const curr = activeQuote.last;
      if (curr && !formPrice) {
        setFormPrice(String(curr));
      }
    }
  }, [isOpen, activeQuote, formPrice]);

  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const triggeredAlerts = alerts.filter((a) => a.status === 'TRIGGERED');

  const extractedSymbols = (symbols || []).map(getSymbolString).filter((s) => typeof s === 'string' && s.length > 0);
  const activeSymStr = getSymbolString(formSymbol) || currentActiveSymbol || extractedSymbols[0] || 'EURUSD';

  const symbolList = extractedSymbols.length > 0 ? extractedSymbols : [activeSymStr];
  if (!symbolList.includes(activeSymStr) && activeSymStr) {
    symbolList.unshift(activeSymStr);
  }

  const uniqueSymbols = Array.from(new Set(symbolList));

  const symbolOptions = uniqueSymbols.map((sym) => ({
    value: String(sym),
    label: String(sym),
  }));

  const conditionOptions = [
    { value: 'ABOVE', label: 'Price ≥ (Price rises above)' },
    { value: 'BELOW', label: 'Price ≤ (Price falls below)' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const priceNum = Number(formPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;

    onAddAlert?.({
      symbol: getSymbolString(formSymbol),
      targetPrice: priceNum,
      condition: formCondition,
      note: formNote.trim(),
    });

    setFormPrice('');
    setFormNote('');
    setIsCreating(false);
  };

  const handleDeleteAll = () => {
    if (activeTab === 'active') {
      if (activeAlerts.length === 0) return;
      activeAlerts.forEach((a) => onDeleteAlert?.(a.id));
    } else {
      if (triggeredAlerts.length === 0) return;
      onClearTriggered?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--overlay-backdrop,rgba(15,23,42,0.65))] backdrop-blur-sm z-[9990] flex justify-end animate-in fade-in duration-200" onClick={onClose}>
      <aside className="w-[380px] max-w-[90vw] h-full bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] border-l border-[var(--border-light,#e2e8f0)] dark:border-[#262626] text-[var(--text-primary,#0f172a)] flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.25)] overflow-hidden animate-in slide-in-from-right duration-250" onClick={(e) => e.stopPropagation()} aria-label="Price Alerts Management">
        <header className="p-3.5 px-[18px] flex items-center justify-between border-b border-[var(--border-light,#e2e8f0)] dark:border-[#262626] bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-[7px] bg-[var(--accent-info-soft,#eff6ff)] dark:bg-blue-500/10 text-[var(--primary,#2563eb)]">
              <Bell size={16} className="text-current" />
            </div>
            <h2 className="text-[0.95rem] font-bold uppercase tracking-[0.06em] text-[var(--heading,var(--text-primary))] m-0">PRICE ALERTS</h2>
          </div>
          <button type="button" className="flex items-center justify-center p-1.5 rounded-lg border-0 bg-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors" onClick={onClose} aria-label="Close alerts panel">
            <X size={18} />
          </button>
        </header>

        {isCreating ? (
          <div className="flex flex-col flex-1 overflow-y-auto p-4 px-[18px]">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 bg-transparent border border-[var(--border-light)] rounded-lg px-2.5 py-1.5 text-[var(--text-secondary)] text-xs font-semibold cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => setIsCreating(false)}
                aria-label="Back to alerts list"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <h3 className="text-[0.95rem] font-bold text-[var(--heading,var(--text-primary))] m-0">Create Price Alert</h3>
            </div>

            <form className="flex flex-col gap-4 flex-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="alert-symbol-select" className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary,#475569)]">Instrument</label>
                  <CustomSelect
                    id="alert-symbol-select"
                    value={getSymbolString(formSymbol)}
                    onChange={(e) => setFormSymbol(String(e.target.value))}
                    options={symbolOptions}
                    ariaLabel="Select instrument symbol for alert"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="alert-price-input" className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary,#475569)]">Target Price</label>
                  <input
                    id="alert-price-input"
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[var(--border-light,#cbd5e1)] dark:border-[#383838] bg-[var(--bg-card,#ffffff)] dark:bg-[#18181b] text-[var(--text-primary,#0f172a)] font-inherit text-xs leading-[1.25] outline-none transition-all duration-200 placeholder:text-[var(--text-muted,#94a3b8)] focus:border-[var(--heading,#2563eb)] focus:ring-2 focus:ring-[var(--heading,#2563eb)]/20"
                    type="number"
                    step="any"
                    placeholder="e.g. 1.15050"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="alert-condition-select" className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary,#475569)]">Condition</label>
                  <CustomSelect
                    id="alert-condition-select"
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    options={conditionOptions}
                    ariaLabel="Select alert condition"
                  />
                </div>

                <div className="col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="alert-note-input" className="text-[0.72rem] font-semibold uppercase tracking-[0.04em] text-[var(--text-secondary,#475569)]">Note (Optional)</label>
                  <input
                    id="alert-note-input"
                    className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-[var(--border-light,#cbd5e1)] dark:border-[#383838] bg-[var(--bg-card,#ffffff)] dark:bg-[#18181b] text-[var(--text-primary,#0f172a)] font-inherit text-xs leading-[1.25] outline-none transition-all duration-200 placeholder:text-[var(--text-muted,#94a3b8)] focus:border-[var(--heading,#2563eb)] focus:ring-2 focus:ring-[var(--heading,#2563eb)]/20"
                    type="text"
                    maxLength={60}
                    placeholder="e.g. Support level test"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-auto pt-4 border-t border-[var(--border-light)]">
                <button
                  type="button"
                  className="px-4 py-2.5 bg-transparent border border-[var(--border-light)] rounded-lg text-[var(--text-secondary)] text-xs font-semibold cursor-pointer hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2.5 bg-[var(--button-bg,#2563eb)] text-[var(--button-text,#ffffff)] border border-[var(--button-bg,#2563eb)] rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm transition-all duration-150 hover:bg-[var(--button-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  disabled={!formPrice || Number(formPrice) <= 0}
                >
                  <Plus size={16} /> Save Alert
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <nav className="flex border-b border-[var(--border-light,#e2e8f0)] dark:border-[#262626] bg-[var(--surface-subtle)] shrink-0" aria-label="Alert categories">
              <button
                type="button"
                className={`flex-1 py-3 px-3.5 bg-transparent border-0 border-b-2 font-semibold text-[0.85rem] cursor-pointer text-center transition-colors duration-180 ${
                  activeTab === 'active'
                    ? 'bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] text-[var(--heading,#2563eb)] border-b-[var(--heading,#2563eb)] font-bold'
                    : 'border-b-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                onClick={() => setActiveTab('active')}
              >
                Active {activeAlerts.length > 0 && `(${activeAlerts.length})`}
              </button>
              <button
                type="button"
                className={`flex-1 py-3 px-3.5 bg-transparent border-0 border-b-2 font-semibold text-[0.85rem] cursor-pointer text-center transition-colors duration-180 ${
                  activeTab === 'history'
                    ? 'bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] text-[var(--heading,#2563eb)] border-b-[var(--heading,#2563eb)] font-bold'
                    : 'border-b-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
                onClick={() => setActiveTab('history')}
              >
                History {triggeredAlerts.length > 0 && `(${triggeredAlerts.length})`}
              </button>
            </nav>

            <div className="flex-1 overflow-y-auto p-4 px-[18px]">
              {activeTab === 'active' && (
                <div className="flex flex-col gap-2.5">
                  {activeAlerts.length === 0 ? (
                    <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2 text-[var(--text-muted,#64748b)]">
                      <CircleAlert size={32} className="text-[var(--text-muted,#64748b)] opacity-45 mb-1" />
                      <p className="text-[0.9rem] font-semibold text-[var(--text-primary,#0f172a)] m-0">No Active Price Alerts</p>
                      <span className="text-[0.78rem] text-[var(--text-muted,#64748b)]">Click &quot;+ Add new&quot; below to set up an alert.</span>
                    </div>
                  ) : (
                    activeAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 px-3.5 bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] border border-[var(--border-light,#e2e8f0)] dark:border-[#262626] rounded-xl gap-3 transition-all duration-180 hover:border-[var(--border-medium,#cbd5e1)] hover:-translate-y-0.5 hover:shadow-sm">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-[0.88rem] font-bold text-[var(--heading,var(--text-primary))]">{alert.symbol}</strong>
                            <span className="text-[0.7rem] px-2 py-0.5 rounded-md font-semibold bg-[var(--bg-secondary,#f1f5f9)] dark:bg-[#27272a] text-[var(--text-secondary,#475569)] dark:text-[#a1a1aa]">
                              {alert.condition === 'ABOVE' ? '≥ Price Rises Above' : '≤ Price Falls Below'}
                            </span>
                          </div>
                          <div className="text-[0.82rem] text-[var(--text-primary)] font-medium">
                            Target: <strong>{formatPrice ? formatPrice(alert.targetPrice, alert.symbol) : alert.targetPrice}</strong>
                          </div>
                          {alert.note && <div className="text-[0.76rem] text-[var(--text-secondary,#475569)] italic">{alert.note}</div>}
                          <div className="text-[0.7rem] text-[var(--text-muted,#64748b)]">
                            Created: {formatAlertDate(alert.createdAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex items-center justify-center p-1.5 rounded-lg border-0 bg-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger-soft,rgba(239,68,68,0.12))] cursor-pointer transition-colors"
                          onClick={() => onDeleteAlert?.(alert.id)}
                          title="Delete alert"
                          aria-label={`Delete alert for ${alert.symbol}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="flex flex-col gap-2.5">
                  {triggeredAlerts.length === 0 ? (
                    <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2 text-[var(--text-muted,#64748b)]">
                      <CheckCircle2 size={32} className="text-[var(--text-muted,#64748b)] opacity-45 mb-1" />
                      <p className="text-[0.9rem] font-semibold text-[var(--text-primary,#0f172a)] m-0">No History Logged</p>
                      <span className="text-[0.78rem] text-[var(--text-muted,#64748b)]">Triggered alerts will appear in this history list.</span>
                    </div>
                  ) : (
                    triggeredAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 px-3.5 bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] border border-[var(--border-light,#e2e8f0)] dark:border-[#262626] border-l-4 border-l-[var(--accent-success-strong,#16a34a)] bg-green-500/5 rounded-xl gap-3 transition-all duration-180 hover:border-[var(--border-medium,#cbd5e1)] hover:-translate-y-0.5 hover:shadow-sm">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-[0.88rem] font-bold text-[var(--heading,var(--text-primary))]">{alert.symbol}</strong>
                            <span className="flex items-center gap-1 text-[0.75rem] text-[var(--accent-success-strong,#16a34a)] font-bold">
                              <CheckCircle2 size={13} /> Triggered
                            </span>
                          </div>
                          <div className="text-[0.82rem] text-[var(--text-primary)] font-medium">
                            Target: <strong>{formatPrice ? formatPrice(alert.targetPrice, alert.symbol) : alert.targetPrice}</strong>
                          </div>
                          {alert.note && <div className="text-[0.76rem] text-[var(--text-secondary,#475569)] italic">{alert.note}</div>}
                          <div className="text-[0.7rem] text-[var(--text-muted,#64748b)]">
                            Triggered: {formatAlertDate(alert.triggeredAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex items-center justify-center p-1.5 rounded-lg border-0 bg-transparent text-[var(--text-muted,#64748b)] hover:text-[var(--accent-danger,#ef4444)] hover:bg-[var(--accent-danger-soft,rgba(239,68,68,0.12))] cursor-pointer transition-colors"
                          onClick={() => onDeleteAlert?.(alert.id)}
                          title="Delete log"
                          aria-label={`Delete triggered alert log for ${alert.symbol}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <footer className="p-3 px-[18px] border-t border-[var(--border-light,#e2e8f0)] dark:border-[#262626] bg-[var(--bg-card,#ffffff)] dark:bg-[var(--bg-card,#131722)] flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-transparent border border-[var(--border-light,#e2e8f0)] dark:border-[#262626] rounded-lg text-[var(--text-secondary,#475569)] text-xs font-semibold cursor-pointer transition-all duration-180 hover:enabled:text-[var(--accent-danger,#ef4444)] hover:enabled:bg-[var(--accent-danger-soft,rgba(239,68,68,0.08))] hover:enabled:border-red-400 disabled:opacity-45 disabled:cursor-not-allowed"
                onClick={handleDeleteAll}
                disabled={activeTab === 'active' ? activeAlerts.length === 0 : triggeredAlerts.length === 0}
              >
                <Trash2 size={14} /> Delete all
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--button-bg,#2563eb)] text-[var(--button-text,#ffffff)] border border-[var(--button-bg,#2563eb)] rounded-lg text-xs font-semibold cursor-pointer transition-all duration-180 hover:-translate-y-0.5 hover:bg-[var(--button-bg-hover)] shadow-sm"
                onClick={() => setIsCreating(true)}
              >
                <Plus size={15} /> Add new
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

