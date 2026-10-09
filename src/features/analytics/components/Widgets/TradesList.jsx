import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SymbolWithIcon from "@/components/Common/SymbolWithIcon/SymbolWithIcon";
import { formatCurrency } from "@/utils/user/Currency";
import { formatTradePrice } from "@/utils/trading/tradeCalculations";
import { Dropdown, Card, CardHeader, CardTitle, InfoTooltip } from "@/components/ui";
import { getTradeDisplayDate, getTradeDisplayTime, formatDisplayDate, formatDisplayTime } from "@/utils/trading/tradeTime";
import { useAuth } from "@/context/AuthContext";
import { loadCachedUserSettings, saveUserSettings } from "@/utils/user/userSettings";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useBreakpoint } from "@/hooks/use-breakpoint";

const FIELDS = [
  { key: "symbol", label: "Symbol" },
  { key: "exitAt", label: "Date & Time" },
  { key: "pnl", label: "PnL" },
  { key: "entryPrice", label: "Entry" },
  { key: "exitPrice", label: "Exit" },
  { key: "tradeType", label: "Type" },
  { key: "strategy", label: "Strategy" },
];

const DEFAULT_VISIBLE_FIELDS = ["symbol", "exitAt", "pnl", "entryPrice", "tradeType"];
const VALID_FIELD_KEYS = new Set(FIELDS.map((f) => f.key));

const normalizeVisibleFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return DEFAULT_VISIBLE_FIELDS;
  }
  const migrated = fields.map((f) => (f === "trade_time" ? "exitAt" : f === "trade_type" ? "tradeType" : f));
  const validOnly = migrated.filter((f) => VALID_FIELD_KEYS.has(f));
  return validOnly.length > 0 ? validOnly.slice(0, 5) : DEFAULT_VISIBLE_FIELDS;
};

const isTradeOpen = (t) => {
  if (!t) return false;
  if (t.is_open_position) return true;

  const hasExitTime = Boolean(t.exitAt);
  const hasExitPrice = t.exitPrice !== null && t.exitPrice !== undefined && t.exitPrice !== '';

  if (hasExitTime || hasExitPrice) return false;
  if (t.status === 'closed' || t.status === 'expired') return false;

  return t.status === 'open' || (!hasExitTime && !hasExitPrice);
};

const isTradeClosed = (t) => {
  if (!t) return false;
  return !isTradeOpen(t);
};

function TradesList({ trades = [], openPositions = [], currencyCode = "USD", className = "" }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const userSettingsQuery = useUserSettings();
  const isDesktop = useBreakpoint("lg");
  const maxColumns = isDesktop ? 5 : 4;

  const [activeTab, setActiveTab] = useState("closed"); // "open" or "closed"

  const [visibleFields, setVisibleFields] = useState(() => {
    const savedFields = loadCachedUserSettings()?.dashboardTrades?.visibleFields;
    return normalizeVisibleFields(savedFields);
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    const savedFields = userSettingsQuery.data?.dashboardTrades?.visibleFields;
    if (Array.isArray(savedFields) && savedFields.length > 0) {
      const normalized = normalizeVisibleFields(savedFields);
      window.queueMicrotask(() => setVisibleFields(normalized));
    }
  }, [isAuthenticated, userSettingsQuery.data]);

  const activeVisibleFields = useMemo(() => {
    return visibleFields.slice(0, maxColumns);
  }, [visibleFields, maxColumns]);

  const filteredTrades = useMemo(() => {
    if (activeTab === "open") {
      const openFromTrades = (Array.isArray(trades) ? trades : []).filter(isTradeOpen);
      const combined = [...(Array.isArray(openPositions) ? openPositions : []), ...openFromTrades];
      const seen = new Set();
      const uniqueOpen = combined.filter((t) => {
        if (!t) return false;
        const id = String(t.unique_id || '');
        if (id && seen.has(id)) return false;
        if (id) seen.add(id);
        return true;
      });

      return uniqueOpen
        .sort((a, b) => getTradeDisplayTime(b) - getTradeDisplayTime(a))
        .slice(0, 12);
    }

    return (Array.isArray(trades) ? trades : [])
      .filter(isTradeClosed)
      .sort((a, b) => getTradeDisplayTime(b) - getTradeDisplayTime(a))
      .slice(0, 12);
  }, [trades, openPositions, activeTab]);

  const handleTradeClick = (trade) => {
    if (!trade?.unique_id) return;
    navigate(`/trade/${trade.unique_id}`, {
      state: { tradeData: trade },
    });
  };

  const renderValue = useCallback((t, key) => {
    switch (key) {
      case "symbol":
        return <SymbolWithIcon symbol={t.symbol} size="md" />;

      case "exitAt": {
        const d = getTradeDisplayDate(t);
        if (!d) return "--";

        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--heading)]">{formatDisplayDate(d)}</span>
            <span className="text-fluid-xs text-[var(--text-secondary)]">{formatDisplayTime(d)}</span>
          </div>
        );
      }

      case "pnl": {
        if (t.pnl == null || !Number.isFinite(Number(t.pnl))) return "--";
        const pnl = Number(t.pnl);
        const formatted = formatCurrency(pnl, currencyCode);
        const isPos = pnl > 0;
        const isNeg = pnl < 0;

        return (
          <span className={`text-xs font-bold ${
            isPos ? 'text-emerald-600 dark:text-emerald-400' : isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-secondary)]'
          }`}>
            {isPos ? `+${formatted}` : formatted}
          </span>
        );
      }

      case "entryPrice": {
        const price = Number(t.entryPrice);
        if (t.entryPrice == null || !Number.isFinite(price) || price === 0) return "--";
        return <span className="text-xs font-medium text-[var(--heading)]">{formatTradePrice(price, t.instrumentDigits)}</span>;
      }

      case "exitPrice": {
        const rawPrice = isTradeOpen(t) ? t.currentPrice : t.exitPrice;
        const price = Number(rawPrice);
        if (rawPrice == null || !Number.isFinite(price) || price === 0) return "--";
        return <span className="text-xs font-medium text-[var(--heading)]">{formatTradePrice(price, t.instrumentDigits)}</span>;
      }

      case "tradeType": {
        const isShort = t.tradeType === "short";
        const isLong = t.tradeType === "long";
        const typeTone = isLong
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : isShort
          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]";
        const typeLabel = isShort ? "SHORT" : isLong ? "LONG" : "--";

        return (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-fluid-2xs font-extrabold uppercase ${typeTone}`}>
            {typeLabel}
          </span>
        );
      }

      case "strategy": {
        const strat = t.strategy;
        if (!strat || String(strat).trim() === "") return "--";
        return <span className="text-xs text-[var(--text-secondary)] truncate">{String(strat)}</span>;
      }

      default: {
        const val = t[key];
        if (val === null || val === undefined || val === "") return "--";
        return <span className="text-xs text-[var(--heading)]">{String(val)}</span>;
      }
    }
  }, [currencyCode]);

  return (
    <Card className={`w-full h-full min-h-0 flex flex-col overflow-hidden ${className}`.trim()} padding="none">
      <CardHeader className="flex items-center justify-between gap-2 p-3 pb-2 mb-0 border-b border-[var(--divider-strong)] min-h-[var(--title-card-row-height)] flex-nowrap shrink-0">
        <div className="inline-flex items-center gap-2 flex-nowrap min-w-0">
          <CardTitle className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">My Trades</CardTitle>
          <InfoTooltip
            text="Lists your latest trades; click any row to open full trade details."
            size={13}
            side="bottom-left"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                activeTab === "open"
                  ? "bg-brand-solid text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("open")}
            >
              Open
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                activeTab === "closed"
                  ? "bg-brand-solid text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => setActiveTab("closed")}
            >
              Closed
            </button>
          </div>

          <Dropdown.Root>
            <Dropdown.DotsButton aria-label="Configure visible fields" />
            <Dropdown.Popover placement="bottom end" className="w-56">
              <Dropdown.Menu
                aria-label="Select visible fields"
                selectionMode="multiple"
                selectedKeys={new Set(activeVisibleFields)}
                onSelectionChange={(keys) => {
                  const selectedArr = Array.from(keys);
                  if (selectedArr.length <= maxColumns && selectedArr.length > 0) {
                    setVisibleFields(selectedArr);
                    if (isAuthenticated) {
                      saveUserSettings({ dashboardTrades: { visibleFields: selectedArr } }).catch(() => null);
                    }
                  }
                }}
              >
                <Dropdown.Section>
                  <Dropdown.SectionHeader className="px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Columns ({activeVisibleFields.length}/{maxColumns})
                  </Dropdown.SectionHeader>
                  {FIELDS.map((f) => {
                    const checked = activeVisibleFields.includes(f.key);
                    const disabled = !checked && activeVisibleFields.length >= maxColumns;
                    return (
                      <Dropdown.Item
                        key={f.key}
                        id={f.key}
                        label={f.label}
                        selectionIndicator="checkbox"
                        isDisabled={disabled}
                      />
                    );
                  })}
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
      </CardHeader>

      <div
        className="grid gap-2 px-3.5 py-1.5 border-b border-[var(--divider-strong)] text-fluid-2xs font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--surface-subtle)] shrink-0"
        style={{ gridTemplateColumns: `repeat(${activeVisibleFields.length}, minmax(0, 1fr))` }}
      >
        {activeVisibleFields.map((key) => {
          const field = FIELDS.find((f) => f.key === key);
          const label = activeTab === "open" && key === "exitPrice" ? "Current" : field?.label;
          return (
            <div key={key} className="truncate">
              {label}
            </div>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-[var(--divider-strong)] pb-3 sm:pb-4">
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-secondary)] h-full">
            <strong className="text-[var(--heading)] font-semibold mb-1">No {activeTab} trades</strong>
            <span className="text-xs">Trades matching this tab will appear here.</span>
          </div>
        ) : (
          filteredTrades.map((t) => {
            const isOpenRow = activeTab === "open" || isTradeOpen(t);
            return (
              <div
                key={t.unique_id}
                className={`grid gap-2 px-3.5 py-1.5 sm:py-2 min-h-[48px] items-center transition-colors ${
                  isOpenRow ? 'cursor-default' : 'hover:bg-[var(--surface-subtle)] cursor-pointer'
                }`}
                style={{ gridTemplateColumns: `repeat(${activeVisibleFields.length}, minmax(0, 1fr))` }}
                onClick={isOpenRow ? undefined : () => handleTradeClick(t)}
              >
                {activeVisibleFields.map((key) => (
                  <div key={key} className="truncate flex items-center min-h-[32px]">
                    {renderValue(t, key)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

export default TradesList;
