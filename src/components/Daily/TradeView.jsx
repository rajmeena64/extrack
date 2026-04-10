import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Markets.css";
import "../dashboard/dashboard.css";
import SymbolWithIcon from "../Common/SymbolWithIcon";
import api from "../../utils/serve";
import DateRangePicker from "../Common/DateRangePicker";

// import { FiFilter, FiCalendar, FiColumns, FiChevronDown } from "react-icons/fi";
// import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { ArrowLeft, ArrowRight, Calendar, ChartBar,Filter,Ratio,Table} from '../Common/icons';
import { ALargeSmall, ArrowDown, CircleSmall } from "lucide-react";

const IconSize = 16;

// Skeleton Loader Components
const SkeletonHeader = () => (
  <div className="trade-header-shell">
    <div className="trade-header">
      <div className="trade-header-left">
        <div className="trade-title-block">
          <div className="trade-title-row">
            <div className="skeleton-icon" style={{ width: '24px', height: '24px', borderRadius: '6px' }}></div>
            <div className="skeleton-text" style={{ width: '120px', height: '32px', marginLeft: '12px' }}></div>
          </div>
          <div className="skeleton-text" style={{ width: '280px', height: '20px', marginTop: '8px' }}></div>
        </div>
      </div>
      <div className="trade-header-right">
        <div className="skeleton-button" style={{ width: '100px', height: '38px' }}></div>
        <div className="skeleton-button" style={{ width: '140px', height: '38px' }}></div>
        <div className="skeleton-button" style={{ width: '130px', height: '38px' }}></div>
        <div className="skeleton-button" style={{ width: '100px', height: '38px' }}></div>
      </div>
    </div>
  </div>
);

const SkeletonTableRow = () => (
  <tr className="skeleton-row">
    <td><div className="skeleton-text" style={{ width: '90px', height: '16px' }}></div></td>
    <td><div className="skeleton-text" style={{ width: '80px', height: '16px' }}></div></td>
    <td><div className="skeleton-text" style={{ width: '50px', height: '16px' }}></div></td>
    <td><div className="skeleton-text" style={{ width: '60px', height: '16px' }}></div></td>
    <td><div className="skeleton-text" style={{ width: '100px', height: '16px' }}></div></td>
  </tr>
);

const SkeletonTable = () => (
  <div className="trades-table-card">
    <div className="trades-table-container">
      <table className="trades-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Type</th>
            <th>P&L</th>
            <th>Strategy</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, index) => (
            <SkeletonTableRow key={index} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

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

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
      try {
        const res = await api.get("/settings");
        const data = res.data;

        if (data.success && data.settings) {
          setFilters(
            data.settings.filters || {
              symbol: "",
              tradeType: "",
              winTrades: false,
              lossTrades: false,
              minPnl: "",
              maxPnl: "",
              sortBy: "",
              order: "desc",
            }
          );

          setVisibleColumns(
            data.settings.columns || {
              date: true,
              symbol: true,
              type: true,
              pnl: true,
              entry: false,
              exit: false,
              notes: false,
              rating: false,
              strategy: true,
            }
          );

          setCurrentMonth(data.settings.currentMonth ?? new Date().getMonth());
          setCurrentYear(data.settings.currentYear ?? new Date().getFullYear());
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setSettingsLoaded(true);
        // Add a small delay to ensure smooth transition
        setTimeout(() => setIsLoading(false), 300);
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

  // Show skeleton while loading
  if (isLoading || !settingsLoaded) {
    return (
      <div className="main-content">
        <SkeletonHeader />
        <SkeletonTable />
        <style jsx>{`
          @keyframes skeleton-pulse {
            0% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              opacity: 1;
            }
          }
          
          .skeleton-text {
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
            border-radius: 4px;
            height: 16px;
          }
          
          .skeleton-icon {
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
          }
          
          .skeleton-button {
            background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
            background-size: 200% 100%;
            animation: skeleton-pulse 1.5s ease-in-out infinite;
            border-radius: 6px;
          }
          
          .skeleton-row td {
            padding: 12px 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="main-content">
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
                <Ratio className="trade-title-icon" />
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
                <Filter size={IconSize} className="toolbar-svg-icon" />
                <span className="toolbar-btn-text">Filters</span>
            
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
                  <Calendar size={IconSize} className="toolbar-svg-icon" />
                  <span className="toolbar-btn-text">{formatDateLabel()}</span>
                </div>
               
           
              </button>

              {showDatePicker && (
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
                <Table size={IconSize} className="toolbar-svg-icon" />
                <span className="toolbar-btn-text">Columns</span>
          
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