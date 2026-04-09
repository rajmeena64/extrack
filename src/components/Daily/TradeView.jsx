


import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Markets.css";
import "../dashboard/dashboard.css";
import SymbolWithIcon from "../Common/SymbolWithIcon";
import api from "../../utils/serve";
import DateRangePicker from "../Common/DateRangePicker";

import { FiFilter, FiCalendar, FiColumns, FiChevronDown } from "react-icons/fi";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";

function TradeView({ trades = [] }) {
  const navigate = useNavigate();

  /* =======================
     STATE
  ======================= */
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("All Accounts");

  const filterRef = useRef(null);
  const settingsRef = useRef(null);
  const datePickerRef = useRef(null);

  const [filters, setFilters] = useState({
    symbol: "",
    tradeType: "",
    winTrades: false,
    lossTrades: false,
    minPnl: "",
    maxPnl: "",
    sortBy: "",
    order: "desc",
  });

  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    symbol: true,
    type: true,
    pnl: true,
    entry: false,
    exit: false,
    notes: false,
    rating: false,
    strategy: true,
  });

  /* =======================
     OUTSIDE CLICK
  ======================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setShowDatePicker(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeTrades = useMemo(() => (Array.isArray(trades) ? trades : []), [trades]);

  /* =======================
     LOAD SETTINGS
  ======================= */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get("/settings");
        const data = res.data;

        if (data.success && data.settings) {
          setFilters(data.settings.filters || filters);
          setVisibleColumns(data.settings.columns || visibleColumns);
          setCurrentMonth(data.settings.currentMonth ?? currentMonth);
          setCurrentYear(data.settings.currentYear ?? currentYear);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };

    loadSettings();
  }, []);

  /* =======================
     SAVE SETTINGS
  ======================= */
  const saveSettings = async () => {
    const settingsToSave = {
      filters,
      columns: visibleColumns,
      currentMonth,
      currentYear,
    };

    try {
      const res = await api.post("/settings", settingsToSave);
      const data = res.data;

      if (data.success) {
        alert("Settings saved successfully!");
      } else {
        console.error("Failed to save settings:", data.error);
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  /* =======================
     MONTH NAV
  ======================= */
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /* =======================
     FORMAT DATE LABEL
  ======================= */
  const formatDateLabel = () => {
    if (dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      const to = new Date(dateRange.to).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      return `${from} - ${to}`;
    }

    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  /* =======================
     FILTER LOGIC
  ======================= */
  const filteredTrades = useMemo(() => {
    let result = [...safeTrades];

    result = result.filter((trade) => {
      const pnl = Number(trade.pnl) || 0;
      const tradeDate = trade.timestamp ? new Date(trade.timestamp) : null;

      if (filters.symbol && !trade.symbol?.toLowerCase().includes(filters.symbol.toLowerCase())) return false;

      if (!dateRange.from && !dateRange.to && tradeDate) {
        if (tradeDate.getMonth() !== currentMonth || tradeDate.getFullYear() !== currentYear) return false;
      }

      if (dateRange.from && tradeDate < new Date(dateRange.from)) return false;

      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (tradeDate > toDate) return false;
      }

      if (filters.winTrades && pnl <= 0) return false;
      if (filters.lossTrades && pnl >= 0) return false;

      if (filters.minPnl && pnl < Number(filters.minPnl)) return false;
      if (filters.maxPnl && pnl > Number(filters.maxPnl)) return false;

      if (filters.tradeType && trade.trade_type !== filters.tradeType) return false;

      return true;
    });

    if (filters.sortBy) {
      result.sort((a, b) => {
        let valA = 0;
        let valB = 0;

        if (filters.sortBy === "pnl") {
          valA = Number(a.pnl) || 0;
          valB = Number(b.pnl) || 0;
        }

        if (filters.sortBy === "date") {
          valA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          valB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        }

        return filters.order === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [safeTrades, filters, currentMonth, currentYear, dateRange]);

  const uniqueSymbols = useMemo(() => {
    return [...new Set(safeTrades.map((t) => t.symbol).filter(Boolean))];
  }, [safeTrades]);

  const handleTradeClick = (trade) => {
    navigate(`/trade/${trade.unique_id || trade.id}`, { state: { tradeData: trade } });
  };

  const resetFilters = () => {
    setFilters({
      symbol: "",
      tradeType: "",
      winTrades: false,
      lossTrades: false,
      minPnl: "",
      maxPnl: "",
      sortBy: "",
      order: "desc",
    });
    setDateRange({ from: "", to: "" });
  };

return (
  <div className="main-content ">

      {(showFilters || showSettings || showDatePicker) && (
        <div
          className="popup-overlay"
          onClick={() => {
            setShowFilters(false);
            setShowSettings(false);
            setShowDatePicker(false);
          }}
        />
      )}


    {/* HEADER */}
    <div className="trade-header-shell">
      <div className="trade-header">
        <div className="trade-header-left">
        <div className="trade-title-block">
            <div className="trade-title-row">
              <HiOutlineAdjustmentsHorizontal className="trade-title-icon" />
              <h1 className="trade-page-title">Trade Log</h1>
            </div>
            <p className="trade-page-subtitle">
              Review, filter and analyze all your trades in one place
            </p>
          </div>
        </div>

        <div className="trade-header-right">
          {/* FILTERS */}
          <div className="toolbar-group" ref={filterRef}>
          <button
            className={`toolbar-btn ${showFilters ? "toolbar-btn-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowFilters(!showFilters);
              setShowSettings(false);
              setShowDatePicker(false);
            }}
          >
            <FiFilter className="toolbar-svg-icon" />
            <span className="toolbar-btn-text">Filters</span>
            <FiChevronDown className="toolbar-caret-icon" />
          </button>

            {showFilters && (
              <div className="toolbar-dropdown filter-panel popup-elevated">
                <h4>Advanced Filters</h4>

                <select
                  value={filters.symbol}
                  onChange={(e) =>
                    setFilters({ ...filters, symbol: e.target.value })
                  }
                >
                  <option value="">All Symbols</option>
                  {uniqueSymbols.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.tradeType}
                  onChange={(e) =>
                    setFilters({ ...filters, tradeType: e.target.value })
                  }
                >
                  <option value="">All Types</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>

                <label>
                  <input
                    type="checkbox"
                    checked={filters.winTrades}
                    onChange={(e) =>
                      setFilters({ ...filters, winTrades: e.target.checked })
                    }
                  />
                  Winning Trades
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={filters.lossTrades}
                    onChange={(e) =>
                      setFilters({ ...filters, lossTrades: e.target.checked })
                    }
                  />
                  Losing Trades
                </label>

                <input
                  type="number"
                  placeholder="Min P&L"
                  value={filters.minPnl}
                  onChange={(e) =>
                    setFilters({ ...filters, minPnl: e.target.value })
                  }
                />

                <input
                  type="number"
                  placeholder="Max P&L"
                  value={filters.maxPnl}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPnl: e.target.value })
                  }
                />

                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value })
                  }
                >
                  <option value="">Sort By</option>
                  <option value="pnl">P&L</option>
                  <option value="date">Date</option>
                </select>

                <select
                  value={filters.order}
                  onChange={(e) =>
                    setFilters({ ...filters, order: e.target.value })
                  }
                >
                  <option value="desc">High → Low</option>
                  <option value="asc">Low → High</option>
                </select>

                <button className="toolbar-action-btn" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* DATE */}
          <div className="toolbar-group" ref={datePickerRef}>
          <button
            className={`toolbar-btn toolbar-btn-date ${
              showDatePicker ? "toolbar-btn-active" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setShowDatePicker(!showDatePicker);
              setShowFilters(false);
              setShowSettings(false);
            }}
          >
            <div className="toolbar-inline">
              <FiCalendar className="toolbar-svg-icon" />
              <span className="toolbar-btn-text">{formatDateLabel()}</span>
            </div>
            <FiChevronDown className="toolbar-caret-icon" />
          </button>

            {/* {showDatePicker && (
              <div className="toolbar-dropdown date-dropdown popup-elevated">
                <div className="month-nav-box">
                  <button onClick={handlePrevMonth}>◀</button>
                  <span>
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <button onClick={handleNextMonth}>▶</button>
                </div>

                <div className="date-range-box">
                  <label>From</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, from: e.target.value })
                    }
                  />
                </div>

                <div className="date-range-box">
                  <label>To</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, to: e.target.value })
                    }
                  />
                </div>
              </div>
            )} */}

              {showDatePicker && (
                // <div className="toolbar-dropdown popup-elevated">
                <div className="calendar-wrapper">
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange({
                        from: range?.from,
                        to: range?.to,
                      });
                    }}
                  />
                </div>
              )}



          </div>

          {/* ACCOUNT */}
          <div className="toolbar-group">
            <select
              className="toolbar-select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              <option>All Accounts</option>
              <option>Live Account</option>
              <option>Demo Account</option>
              <option>Funded Account</option>
            </select>
          </div>

          {/* COLUMNS */}
          <div className="toolbar-group" ref={settingsRef}>
            <button
              className={`toolbar-btn toolbar-btn-ghost ${
                showSettings ? "toolbar-btn-active" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
                setShowFilters(false);
                setShowDatePicker(false);
              }}
            >
              <FiColumns className="toolbar-svg-icon" />
              <span className="toolbar-btn-text">Columns</span>
              <FiChevronDown className="toolbar-caret-icon" />
            </button>

            {showSettings && (
              <div className="toolbar-dropdown filter-panel popup-elevated">
                <h4>Column Settings</h4>

                {Object.keys(visibleColumns).map((col) => (
                  <label key={col}>
                    <input
                      type="checkbox"
                      checked={visibleColumns[col]}
                      onChange={() =>
                        setVisibleColumns({
                          ...visibleColumns,
                          [col]: !visibleColumns[col],
                        })
                      }
                    />
                    {col.toUpperCase()}
                  </label>
                ))}

                <button className="toolbar-action-btn" onClick={saveSettings}>
                  Save Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* TABLE */}
    <div className="trades-table-card">
      <div className="trades-table-container">
        <table className="trades-table">
          <thead>
            <tr>
              {visibleColumns.date && <th>Date</th>}
              {visibleColumns.symbol && <th>Symbol</th>}
              {visibleColumns.type && <th>Type</th>}
              {visibleColumns.pnl && <th>P&amp;L</th>}
              {visibleColumns.entry && <th>Entry</th>}
              {visibleColumns.exit && <th>Exit</th>}
              {visibleColumns.notes && <th>Notes</th>}
              {visibleColumns.rating && <th>Rating</th>}
              {visibleColumns.strategy && <th>Strategy</th>}
            </tr>
          </thead>

          <tbody>
            {filteredTrades.map((trade, i) => {
              const pnl = Number(trade.pnl) || 0;
              const tradeDate = trade.timestamp ? new Date(trade.timestamp) : null;

              return (
                <tr
                  key={i}
                  onClick={() => handleTradeClick(trade)}
                  className="trade-row"
                >
                  {visibleColumns.date && (
                    <td>{tradeDate ? tradeDate.toLocaleDateString() : "--"}</td>
                  )}

                  {visibleColumns.symbol && (
                    <td>
                      <SymbolWithIcon symbol={trade.symbol} />
                    </td>
                  )}

                  {visibleColumns.type && <td>{trade.trade_type || "--"}</td>}

                  {visibleColumns.pnl && (
                    <td className={pnl >= 0 ? "profit" : "loss"}>
                      {pnl >= 0 ? `+$${pnl}` : `-$${Math.abs(pnl)}`}
                    </td>
                  )}

                  {visibleColumns.entry && <td>{trade.price || "--"}</td>}
                  {visibleColumns.exit && <td>{trade.exit_price || "--"}</td>}
                  {visibleColumns.notes && <td>{trade.notes || "--"}</td>}
                  {visibleColumns.rating && <td>{trade.rating || "--"}</td>}
                  {visibleColumns.strategy && <td>{trade.strategy || "--"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

  
}

export default TradeView;