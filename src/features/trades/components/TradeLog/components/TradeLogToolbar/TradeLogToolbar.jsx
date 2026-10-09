import React from "react";
import { FilterLinesIcon } from "@/icons";
import { Button, DateRangePicker as UntitledDateRangePicker, Dropdown } from "@/components/ui";
import { jsDateRangeToCalendarRange, calendarRangeToJsDateRange } from "@/utils/common/dateConversions";
import TradeLogFiltersPopover from "./TradeLogFiltersPopover";
import TradeLogColumnsPopover from "./TradeLogColumnsPopover";

export const TradeLogToolbar = ({
  hasActiveFilters,
  activeFilterCount,
  filters,
  setFilters,
  filterValues,
  resetFilters,
  dateRange,
  setDateRange,
  visibleColumns,
  setVisibleColumns,
  selectedColumnCount,
  maxColumns,
  columnOptions,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="relative max-[520px]:hidden">
        <Dropdown.Root>
          <Button
            color="secondary"
            size="sm"
            className={`h-9 min-h-[36px] px-2.5 rounded-lg border text-[12.5px] font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 active:translate-y-0 text-slate-900 dark:text-slate-50 ${
              hasActiveFilters
                ? "border-[var(--accent-ink)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent-ink)_14%,transparent)] bg-[var(--bg-hover)] dark:border-[color-mix(in_srgb,var(--accent-ink)_34%,var(--border-light))]"
                : "border-[var(--border-medium)] bg-gradient-to-b from-white/98 to-[#f4f8ff]/98 dark:from-slate-900/92 dark:to-slate-950/96 dark:border-slate-800 hover:border-[color-mix(in_srgb,var(--accent-ink)_30%,var(--border-light))] hover:bg-[var(--bg-hover)] hover:-translate-y-px"
            }`}
            aria-label="Filters"
            title="Filters"
          >
            <FilterLinesIcon size={15} aria-hidden="true" className="shrink-0" />
            <span className="whitespace-nowrap">Filters</span>
            {hasActiveFilters ? (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--button-bg)] text-[var(--button-text)] text-[11px] font-bold leading-none">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          <Dropdown.Popover
            placement="bottom start"
            className="w-[min(940px,calc(100vw-24px))] max-h-[min(650px,calc(100dvh-70px))] p-0 flex flex-col overflow-hidden"
          >
            <TradeLogFiltersPopover
              filters={filters}
              setFilters={setFilters}
              filterValues={filterValues}
              activeFilterCount={activeFilterCount}
              hasActiveFilters={hasActiveFilters}
              resetFilters={resetFilters}
            />
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>

      <div className="relative">
        <UntitledDateRangePicker
          size="sm"
          value={jsDateRangeToCalendarRange(dateRange)}
          onChange={(range) => {
            setDateRange(calendarRangeToJsDateRange(range));
          }}
          onApply={() => {}}
        />
      </div>

      <div className="relative max-[520px]:hidden">
        <Dropdown.Root>
          <Button
            color="secondary"
            size="sm"
            className="h-9 min-h-[36px] px-2.5 rounded-lg border border-[var(--border-medium)] bg-gradient-to-b from-white/98 to-[#f4f8ff]/98 dark:from-slate-900/92 dark:to-slate-950/96 dark:border-slate-800 text-[12.5px] font-semibold flex items-center gap-2 cursor-pointer transition-all duration-150 active:translate-y-0 text-slate-900 dark:text-slate-50 hover:border-[color-mix(in_srgb,var(--accent-ink)_30%,var(--border-light))] hover:bg-[var(--bg-hover)] hover:-translate-y-px"
            aria-label="Columns"
            title="Columns"
          >
            <span className="whitespace-nowrap">Columns</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-ink)_10%,transparent)] text-[var(--accent-ink)] text-[11px] font-bold leading-none">
              {selectedColumnCount}/{maxColumns}
            </span>
          </Button>

          <Dropdown.Popover
            placement="bottom start"
            className="w-[min(480px,calc(100vw-24px))] p-0 flex flex-col overflow-hidden"
          >
            <TradeLogColumnsPopover
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
              selectedColumnCount={selectedColumnCount}
              maxColumns={maxColumns}
              columnOptions={columnOptions}
            />
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>
    </div>
  );
};

export default TradeLogToolbar;
