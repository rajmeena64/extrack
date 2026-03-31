import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Markets.css";
import "../dashboard/dashboard.css";
import SymbolWithIcon from "../Common/SymbolWithIcon";
// import "../../utils/constants"
// import { API_URL } from "../../utils/constants";

import api from "../../utils/serve";

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

  const filterRef = useRef(null);
  const settingsRef = useRef(null);

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
    strategy:false
  });

  /* =======================
     OUTSIDE CLICK
  ======================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilters(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
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
    currentYear
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
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };
  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  /* =======================
     FILTER LOGIC
  ======================= */
  const filteredTrades = useMemo(() => {
    let result = [...safeTrades];

    result = result.filter(trade => {
      const pnl = Number(trade.pnl) || 0;
      const tradeDate = trade.timestamp ? new Date(trade.timestamp) : null;

      if (filters.symbol && !trade.symbol?.toLowerCase().includes(filters.symbol.toLowerCase())) return false;

      if (!dateRange.from && !dateRange.to && tradeDate) {
        if (tradeDate.getMonth() !== currentMonth || tradeDate.getFullYear() !== currentYear) return false;
      }

      if (dateRange.from && tradeDate < new Date(dateRange.from)) return false;
      if (dateRange.to && tradeDate > new Date(dateRange.to)) return false;

      if (filters.winTrades && pnl <= 0) return false;
      if (filters.lossTrades && pnl >= 0) return false;

      if (filters.minPnl && pnl < Number(filters.minPnl)) return false;
      if (filters.maxPnl && pnl > Number(filters.maxPnl)) return false;

      if (filters.tradeType && trade.trade_type !== filters.tradeType) return false;

      return true;
    });

    if (filters.sortBy) {
      result.sort((a,b) => {
        let valA, valB;
        if (filters.sortBy === "pnl") { valA = Number(a.pnl); valB = Number(b.pnl); }
        if (filters.sortBy === "date") { valA = new Date(a.timestamp); valB = new Date(b.timestamp); }
        return filters.order === "asc" ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [safeTrades, filters, currentMonth, currentYear, dateRange]);

  const uniqueSymbols = useMemo(() => [...new Set(safeTrades.map(t => t.symbol).filter(Boolean))], [safeTrades]);

  const handleTradeClick = trade => {
    navigate(`/trade/${trade.unique_id || trade.id}`, { state: { tradeData: trade } });
  };

  const resetFilters = () => {
    setFilters({ symbol: "", tradeType: "", winTrades: false, lossTrades: false, minPnl: "", maxPnl: "", sortBy: "", order: "desc" });
    setDateRange({ from: "", to: "" });
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="main-content">
      <div className="trade-view-header">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* SYMBOL */}
          <select value={filters.symbol} onChange={e => setFilters({...filters, symbol: e.target.value})} className="filter-select">
            <option value="">All Symbols</option>
            {uniqueSymbols.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* TIME */}
          <div className="time-filter">
            <button onClick={handlePrevMonth}>◀</button>
            <span>{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={handleNextMonth}>▶</button>

            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
            <span>to</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>

          {/* FILTER BUTTON */}
          <button className="filter-btn" onClick={e => { e.stopPropagation(); setShowFilters(!showFilters); setShowSettings(false); }}>⚙️ Filters</button>

          {/* SETTINGS BUTTON */}
          <button className="filter-btn" onClick={e => { e.stopPropagation(); setShowSettings(!showSettings); setShowFilters(false); }}>🧩 Columns</button>
        </div>
      </div>

      {/* FILTER PANEL */}
      {showFilters && (
        <div className="filter-panel" ref={filterRef}>
          <h4>Advanced Filters</h4>

          <select onChange={e => setFilters({...filters, tradeType: e.target.value})}>
            <option value="">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>

          <label>
            <input type="checkbox" onChange={e => setFilters({...filters, winTrades: e.target.checked})} /> Winning Trades
          </label>

          <label>
            <input type="checkbox" onChange={e => setFilters({...filters, lossTrades: e.target.checked})} /> Losing Trades
          </label>

          <input type="number" placeholder="Min P&L" onChange={e => setFilters({...filters, minPnl: e.target.value})} />
          <input type="number" placeholder="Max P&L" onChange={e => setFilters({...filters, maxPnl: e.target.value})} />

          <select onChange={e => setFilters({...filters, sortBy: e.target.value})}>
            <option value="">Sort By</option>
            <option value="pnl">P&L</option>
            <option value="date">Date</option>
          </select>

          <select onChange={e => setFilters({...filters, order: e.target.value})}>
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>

          <button onClick={resetFilters}>Reset</button>
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div className="filter-panel" ref={settingsRef}>
          <h4>Column Settings</h4>

          {Object.keys(visibleColumns).map(col => (
            <label key={col}>
              <input
                type="checkbox"
                checked={visibleColumns[col]}
                onChange={() => setVisibleColumns({...visibleColumns, [col]: !visibleColumns[col]})}
              />
              {col.toUpperCase()}
            </label>
          ))}

          {/* SAVE SETTINGS BUTTON */}
          <button onClick={saveSettings} style={{ marginTop: 10 }}>💾 Save Settings</button>
        </div>
      )}

      {/* TABLE */}
      <div className="trades-table-container">
        <table className="trades-table">
          <thead>
            <tr>
              {visibleColumns.date && <th>Date</th>}
              {visibleColumns.symbol && <th>Symbol</th>}
              {visibleColumns.type && <th>Type</th>}
              {visibleColumns.pnl && <th>P&L</th>}
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
                <tr key={i} onClick={() => handleTradeClick(trade)} className="trade-row">
                  {visibleColumns.date && <td>{tradeDate ? tradeDate.toLocaleDateString() : "--"}</td>}
                  {visibleColumns.symbol && <td><SymbolWithIcon symbol={trade.symbol} /></td>}
                  {visibleColumns.type && <td>{trade.trade_type}</td>}
                  {visibleColumns.pnl && <td className={pnl >= 0 ? "profit" : "loss"}>{pnl}</td>}
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
  );
}

export default TradeView;     