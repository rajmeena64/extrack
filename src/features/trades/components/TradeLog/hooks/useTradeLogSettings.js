import { useState, useEffect, useRef } from "react";
import { loadCachedUserSettings, saveUserSettings } from "@/utils/user/userSettings";
import { useUserSettings } from "@/hooks/useUserSettings";
import { limitVisibleColumns } from "../utils/limitVisibleColumns";
import {
  COLUMN_OPTIONS,
  MAX_VISIBLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
} from "../constants/tradeLogColumns";
import {
  DEFAULT_FILTERS,
  ROWS_PER_PAGE_OPTIONS,
} from "../constants/tradeLogFilters";

const getInitialTradeLogSettings = () => {
  const cached = loadCachedUserSettings();
  return cached?.tradeLog || cached || {};
};

export function useTradeLogSettings() {
  const init = getInitialTradeLogSettings();
  const [filters, setFilters] = useState(() => init.filters ? { ...DEFAULT_FILTERS, ...init.filters } : DEFAULT_FILTERS);
  const [visibleColumns, setVisibleColumns] = useState(() => init.columns ? limitVisibleColumns(COLUMN_OPTIONS, { ...DEFAULT_VISIBLE_COLUMNS, ...init.columns }, MAX_VISIBLE_COLUMNS) : DEFAULT_VISIBLE_COLUMNS);
  const [currentMonth, setCurrentMonth] = useState(() => Number.isInteger(init.currentMonth) ? init.currentMonth : new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => Number.isInteger(init.currentYear) ? init.currentYear : new Date().getFullYear());
  const [dateRange, setDateRange] = useState(() => ({ from: init.dateRange?.from || "", to: init.dateRange?.to || "" }));
  const [rowsPerPage, setRowsPerPage] = useState(() => ROWS_PER_PAGE_OPTIONS.includes(Number(init.rowsPerPage)) ? Number(init.rowsPerPage) : 25);
  const userSettingsQuery = useUserSettings();
  const userInteracted = useRef(false);

  useEffect(() => {
    const s = userSettingsQuery.data?.tradeLog;
    if (!s) return;
    if (s.filters) setFilters((prev) => ({ ...DEFAULT_FILTERS, ...s.filters }));
    if (s.columns) setVisibleColumns(limitVisibleColumns(COLUMN_OPTIONS, { ...DEFAULT_VISIBLE_COLUMNS, ...s.columns }, MAX_VISIBLE_COLUMNS));
    if (Number.isInteger(s.currentMonth)) setCurrentMonth(s.currentMonth);
    if (Number.isInteger(s.currentYear)) setCurrentYear(s.currentYear);
    if (ROWS_PER_PAGE_OPTIONS.includes(Number(s.rowsPerPage))) setRowsPerPage(Number(s.rowsPerPage));
    if (s.dateRange) setDateRange({ from: s.dateRange.from || "", to: s.dateRange.to || "" });
  }, [userSettingsQuery.data]);

  useEffect(() => {
    if (!userInteracted.current) return undefined;
    const timer = setTimeout(() => {
      saveUserSettings({
        tradeLog: { filters, columns: visibleColumns, currentMonth, currentYear, dateRange, rowsPerPage }
      }).catch(() => null);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentMonth, currentYear, dateRange, filters, rowsPerPage, visibleColumns]);

  const onSetFilters = (v) => { userInteracted.current = true; setFilters(v); };
  const onSetVisibleColumns = (v) => { userInteracted.current = true; setVisibleColumns(v); };
  const onSetCurrentMonth = (v) => { userInteracted.current = true; setCurrentMonth(v); };
  const onSetCurrentYear = (v) => { userInteracted.current = true; setCurrentYear(v); };
  const onSetDateRange = (v) => { userInteracted.current = true; setDateRange(v); };
  const onSetRowsPerPage = (v) => { userInteracted.current = true; setRowsPerPage(v); };

  return {
    filters,
    setFilters: onSetFilters,
    visibleColumns,
    setVisibleColumns: onSetVisibleColumns,
    currentMonth,
    setCurrentMonth: onSetCurrentMonth,
    currentYear,
    setCurrentYear: onSetCurrentYear,
    dateRange,
    setDateRange: onSetDateRange,
    rowsPerPage,
    setRowsPerPage: onSetRowsPerPage,
    settingsLoaded: true,
    isLoading: false,
    setIsLoading: () => {},
  };
}

export default useTradeLogSettings;
