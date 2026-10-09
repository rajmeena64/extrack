import React from "react";

export const TradeLogColumnsPopover = ({
  visibleColumns = {},
  setVisibleColumns,
  selectedColumnCount = 0,
  maxColumns = 10,
  columnOptions = [],
}) => {
  return (
    <div className="w-full flex flex-col min-h-0 bg-[var(--bg-card)]">
      <div className="p-4 px-5 flex items-start justify-between gap-4 border-b border-[var(--border-light)]">
        <div>
          <h4 className="m-0 text-base font-bold text-[var(--heading)] tracking-tight">Visible columns</h4>
          <p className="mt-0.5 m-0 text-xs text-[var(--text-muted)]">Choose what appears in the trade log</p>
        </div>
        <span className="px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent-ink)_10%,transparent)] text-[var(--accent-ink)] text-[11px] font-bold whitespace-nowrap">
          {selectedColumnCount}/{maxColumns}
        </span>
      </div>

      <div className="p-4 px-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto max-h-[calc(100dvh-220px)] custom-scrollbar">
        {columnOptions.map(([col, label]) => {
          const isChecked = Boolean(visibleColumns[col]);
          const isDisabled = !isChecked && selectedColumnCount >= maxColumns;

          return (
            <label
              key={col}
              className="min-h-[32px] px-2 rounded-lg flex items-center gap-2.5 text-[12.5px] font-semibold text-[var(--text-primary)] cursor-pointer select-none transition-colors hover:bg-[var(--bg-hover)] has-checked:text-[var(--accent-ink)] has-disabled:opacity-40 has-disabled:cursor-not-allowed"
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isDisabled}
                className="size-4 rounded border border-[var(--border-medium)] text-[var(--checkbox-accent)] focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-[var(--checkbox-accent)]"
                onChange={() => {
                  if (isChecked || selectedColumnCount < maxColumns) {
                    setVisibleColumns({
                      ...visibleColumns,
                      [col]: !isChecked,
                    });
                  }
                }}
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default TradeLogColumnsPopover;
