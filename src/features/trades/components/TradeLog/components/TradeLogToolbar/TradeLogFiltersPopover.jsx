import React from "react";
import { DropdownSelect as CustomSelect } from "@/components/ui";
import { sanitizeSignedDecimalInput } from "@/utils/common/fieldValidation";

const PRODUCT_LABELS = {
  equity: "Stock / Equity",
  stock: "Stock / Equity",
  option: "Option",
  future: "Futures",
  perpetual: "Perpetual",
  spot: "Crypto Spot",
  forex: "Forex / CFD",
  cfd: "CFD",
  forex_cfd: "Forex / CFD",
};

const displayValue = (value) =>
  value === null || value === undefined || value === ""
    ? "--"
    : String(value).replaceAll("_", " ");

const selectOptions = (values = [], allLabel) => [
  { value: "", label: allLabel },
  ...(values ?? []).map((value) => ({ value, label: displayValue(value) })),
];

export const TradeLogFiltersPopover = ({
  filters = {},
  setFilters,
  filterValues = {
    symbols: [],
    categories: [],
    productTypes: [],
    sources: [],
    platforms: [],
    accounts: [],
    brokers: [],
    strategies: [],
    ratings: [],
  },
  activeFilterCount = 0,
  hasActiveFilters = false,
  resetFilters,
}) => {
  return (
    <div className="w-full flex flex-col min-h-0 bg-[var(--bg-card)]">
      <div className="p-4 px-5 flex items-start justify-between gap-4 border-b border-[var(--border-light)]">
        <div>
          <h4 className="m-0 text-base font-bold text-[var(--heading)] tracking-tight">Filter trades</h4>
          <p className="mt-0.5 m-0 text-xs text-[var(--text-muted)]">Narrow down your trade log</p>
        </div>
        {hasActiveFilters && (
          <span className="px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent-ink)_10%,transparent)] text-[var(--accent-ink)] text-[11px] font-bold whitespace-nowrap">
            {activeFilterCount} active
          </span>
        )}
      </div>

      <div className="min-h-0 p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar">
        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--primary,#2563eb)]">Trade</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Symbol</span>
              <CustomSelect
                value={filters.symbol ?? ""}
                onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                options={selectOptions(filterValues?.symbols, "All symbols")}
                ariaLabel="Filter by symbol"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Side</span>
              <CustomSelect
                value={filters.tradeType ?? ""}
                onChange={(e) => setFilters({ ...filters, tradeType: e.target.value })}
                options={[
                  { value: "", label: "All sides" },
                  { value: "buy", label: "Buy" },
                  { value: "sell", label: "Sell" },
                ]}
                ariaLabel="Filter by trade side"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Category</span>
              <CustomSelect
                value={filters.category ?? ""}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                options={selectOptions(filterValues?.categories, "All categories")}
                ariaLabel="Filter by category"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Product</span>
              <CustomSelect
                value={filters.productType ?? ""}
                onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
                options={[
                  { value: "", label: "All products" },
                  ...(filterValues?.productTypes ?? []).map((value) => ({
                    value,
                    label: PRODUCT_LABELS[value] ?? displayValue(value),
                  })),
                ]}
                ariaLabel="Filter by product type"
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--purple,#9333ea)]">Source</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Source</span>
              <CustomSelect
                value={filters.source ?? ""}
                onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                options={selectOptions(filterValues?.sources, "All sources")}
                ariaLabel="Filter by source"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Platform</span>
              <CustomSelect
                value={filters.platform ?? ""}
                onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                options={selectOptions(filterValues?.platforms, "All platforms")}
                ariaLabel="Filter by platform"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Account</span>
              <CustomSelect
                value={filters.account ?? ""}
                onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                options={selectOptions(filterValues?.accounts, "All accounts")}
                ariaLabel="Filter by account"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Broker</span>
              <CustomSelect
                value={filters.broker ?? ""}
                onChange={(e) => setFilters({ ...filters, broker: e.target.value })}
                options={selectOptions(filterValues?.brokers, "All brokers")}
                ariaLabel="Filter by broker"
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-rating,#f59e0b)]">Review</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Strategy</span>
              <CustomSelect
                value={filters.strategy ?? ""}
                onChange={(e) => setFilters({ ...filters, strategy: e.target.value })}
                options={selectOptions(filterValues?.strategies, "All strategies")}
                ariaLabel="Filter by strategy"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Rating</span>
              <CustomSelect
                value={filters.rating ?? ""}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                options={selectOptions(filterValues?.ratings, "All ratings")}
                ariaLabel="Filter by rating"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Breakeven</span>
              <CustomSelect
                value={filters.breakeven ?? ""}
                onChange={(e) => setFilters({ ...filters, breakeven: e.target.value })}
                options={[
                  { value: "", label: "Any breakeven" },
                  { value: "yes", label: "Breakeven" },
                  { value: "no", label: "Not breakeven" },
                ]}
                ariaLabel="Filter by breakeven status"
              />
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-success-strong,#10b981)]">Outcome &amp; details</span>
          <div className="min-w-0 flex flex-col gap-1.5">
            <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Result and available data</span>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="relative min-h-[40px] px-3 rounded-xl border border-[var(--border-light)] flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-bold cursor-pointer transition-colors duration-150 select-none has-checked:border-emerald-500/35 has-checked:bg-emerald-500/10 has-checked:text-emerald-700 dark:has-checked:text-emerald-400">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={Boolean(filters.winTrades)}
                  onChange={(e) => setFilters({ ...filters, winTrades: e.target.checked })}
                />
                <span>Winning</span>
              </label>
              <label className="relative min-h-[40px] px-3 rounded-xl border border-[var(--border-light)] flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-bold cursor-pointer transition-colors duration-150 select-none has-checked:border-red-500/32 has-checked:bg-red-500/10 has-checked:text-red-600 dark:has-checked:text-red-400">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={Boolean(filters.lossTrades)}
                  onChange={(e) => setFilters({ ...filters, lossTrades: e.target.checked })}
                />
                <span>Losing</span>
              </label>
              {[
                ["hasStopLoss", "Stop loss"],
                ["hasTakeProfit", "Take profit"],
                ["hasNotes", "Notes"],
                ["hasMistakes", "Mistakes"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="relative min-h-[40px] px-3 rounded-xl border border-[var(--border-light)] flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-secondary)] text-xs font-bold cursor-pointer transition-colors duration-150 select-none has-checked:border-[color-mix(in_srgb,var(--accent-ink)_34%,var(--border-light))] has-checked:bg-[color-mix(in_srgb,var(--accent-ink)_9%,var(--bg-card))] has-checked:text-[var(--accent-ink)]"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={Boolean(filters[key])}
                    onChange={(e) => setFilters({ ...filters, [key]: e.target.checked })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[#0891b2]">Ranges</span>
          <div className="grid grid-cols-[1fr_18px_1fr] items-end gap-1.5">
            <label className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Min P&amp;L</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="No min"
                className="w-full h-[42px] min-h-[42px] px-3 border border-[var(--border-light)] rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_65%,var(--bg-card))] text-[var(--text-primary)] text-[12.5px] outline-hidden shadow-none focus:border-[color-mix(in_srgb,var(--accent-ink)_42%,var(--border-light))] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--accent-ink)_9%,transparent)] transition-all"
                value={filters.minPnl ?? ""}
                onChange={(e) => {
                  const value = sanitizeSignedDecimalInput(e.target.value);
                  if (value !== null) setFilters({ ...filters, minPnl: value });
                }}
              />
            </label>
            <span className="h-[42px] grid place-items-center text-[var(--text-muted)] text-sm font-semibold">—</span>
            <label className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Max P&amp;L</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="No max"
                className="w-full h-[42px] min-h-[42px] px-3 border border-[var(--border-light)] rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_65%,var(--bg-card))] text-[var(--text-primary)] text-[12.5px] outline-hidden shadow-none focus:border-[color-mix(in_srgb,var(--accent-ink)_42%,var(--border-light))] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--accent-ink)_9%,transparent)] transition-all"
                value={filters.maxPnl ?? ""}
                onChange={(e) => {
                  const value = sanitizeSignedDecimalInput(e.target.value);
                  if (value !== null) setFilters({ ...filters, maxPnl: value });
                }}
              />
            </label>
          </div>
          <div className="grid grid-cols-[1fr_18px_1fr] items-end gap-1.5">
            <label className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Min quantity</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="No min"
                className="w-full h-[42px] min-h-[42px] px-3 border border-[var(--border-light)] rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_65%,var(--bg-card))] text-[var(--text-primary)] text-[12.5px] outline-hidden shadow-none focus:border-[color-mix(in_srgb,var(--accent-ink)_42%,var(--border-light))] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--accent-ink)_9%,transparent)] transition-all"
                value={filters.minQuantity ?? ""}
                onChange={(e) => {
                  const value = sanitizeSignedDecimalInput(e.target.value);
                  if (value !== null) setFilters({ ...filters, minQuantity: value });
                }}
              />
            </label>
            <span className="h-[42px] grid place-items-center text-[var(--text-muted)] text-sm font-semibold">—</span>
            <label className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Max quantity</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="No max"
                className="w-full h-[42px] min-h-[42px] px-3 border border-[var(--border-light)] rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_65%,var(--bg-card))] text-[var(--text-primary)] text-[12.5px] outline-hidden shadow-none focus:border-[color-mix(in_srgb,var(--accent-ink)_42%,var(--border-light))] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--accent-ink)_9%,transparent)] transition-all"
                value={filters.maxQuantity ?? ""}
                onChange={(e) => {
                  const value = sanitizeSignedDecimalInput(e.target.value);
                  if (value !== null) setFilters({ ...filters, maxQuantity: value });
                }}
              />
            </label>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[color-mix(in_srgb,var(--surface-subtle)_58%,transparent)] border border-[var(--border-light)] flex flex-col gap-2.5 min-w-0">
          <span className="block mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--accent-danger,#ef4444)]">Sort</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Sort by</span>
              <CustomSelect
                value={filters.sortBy ?? ""}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                options={[
                  { value: "", label: "Default order" },
                  { value: "pnl", label: "P&L" },
                  { value: "date", label: "Date" },
                  { value: "quantity", label: "Quantity" },
                  { value: "rating", label: "Rating" },
                ]}
                ariaLabel="Sort trades by"
              />
            </div>
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="block text-[11px] font-bold text-[var(--text-muted)] tracking-wider">Direction</span>
              <CustomSelect
                value={filters.order ?? "desc"}
                onChange={(e) => setFilters({ ...filters, order: e.target.value })}
                options={[
                  { value: "desc", label: "High to low" },
                  { value: "asc", label: "Low to high" },
                ]}
                ariaLabel="Sort direction"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 px-5 border-t border-[var(--border-light)] flex items-center justify-between">
        <button
          type="button"
          className="h-10 px-4 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--heading)] transition-colors cursor-pointer"
          onClick={resetFilters}
        >
          Clear all
        </button>
      </div>
    </div>
  );
};

export default TradeLogFiltersPopover;
