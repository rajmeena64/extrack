import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // <-- added
import "./Trades.css";
import SymbolWithIcon from "../Common/SymbolWithIcon";
import { FaEllipsisVertical } from "react-icons/fa6";

const FIELDS = [
  { key: "symbol", label: "Symbol" },
  { key: "timestamp", label: "Date & Time" },
  { key: "pnl", label: "PnL" },
  { key: "price", label: "Entry" },
  { key: "exit_price", label: "Exit" },
  { key: "trade_type", label: "Type" },
  { key: "strategy", label: "Strategy" },
];

const LOCAL_STORAGE_KEY = "trades_visible_fields";

function TradesList({ trades = [] }) {
  const navigate = useNavigate(); // <-- added

  const [activeTab, setActiveTab] = useState("closed"); // "open" or "closed"
  const [showSettings, setShowSettings] = useState(false);

  // Load visible fields from localStorage or default
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : ["symbol", "timestamp", "pnl"];
  });

  const dropdownRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =======================
  // Filter trades by tab
  // =======================
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => (activeTab === "open" ? !t.exit_price : !!t.exit_price))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 12);
  }, [trades, activeTab]);

  // =======================
  // Toggle columns (max 5)
  // =======================
  const toggleField = (key) => {
    setVisibleFields((prev) => {
      let updated;
      if (prev.includes(key)) {
        updated = prev.filter((k) => k !== key);
      } else if (prev.length < 5) {
        updated = [...prev, key];
      } else return prev;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // =======================
  // Click handler to open ThatTrade
  // =======================
  const handleTradeClick = (trade) => {
    navigate(`/trade/${trade.unique_id || trade.id}`, {
      state: { tradeData: trade },
    });
  };

  // =======================
  // Render cell value
  // =======================
  const renderValue = (t, key) => {
    switch (key) {
      case "symbol":
        return <SymbolWithIcon symbol={t.symbol} size="md" />;

      case "timestamp": {
        const d = new Date(t.timestamp);
        return (
          <div>
            <div>{d.toLocaleDateString("en-GB")}</div>
            <small>
              {d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>
          </div>
        );
      }

      default:
        return t[key];
    }
  };

  return (
    <div className="my-trades">
      {/* ================= HEADER ================= */}
      <div className="trades-header">
        <h3>My Trades</h3>

        {/* TABS */}
        <div className="tabs">
          <button
            className={activeTab === "open" ? "active" : ""}
            onClick={() => setActiveTab("open")}
          >
            Open
          </button>
          <button
            className={activeTab === "closed" ? "active" : ""}
            onClick={() => setActiveTab("closed")}
          >
            Closed
          </button>
        </div>

        {/* SETTINGS */}
        <div className="settings-wrapper" ref={dropdownRef}>
          <FaEllipsisVertical
            className="settings-icon"
            onClick={() => setShowSettings((prev) => !prev)}
          />
          {showSettings && (
            <div className="settings-dropdown">
              {FIELDS.map((f) => {
                const checked = visibleFields.includes(f.key);
                const disabled = !checked && visibleFields.length >= 5;
                return (
                  <label key={f.key} className={disabled ? "disabled" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleField(f.key)}
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= TABLE HEADER ================= */}
      <div className="trades-header-row">
        {visibleFields.map((key) => {
          const field = FIELDS.find((f) => f.key === key);
          return <div key={key}>{field?.label}</div>;
        })}
      </div>

      {/* ================= ROWS ================= */}
      <div className="trades-list scrollable">
        {filteredTrades.length === 0 ? (
          <div className="empty-state">No {activeTab} trades</div>
        ) : (
          filteredTrades.map((t) => (
            <div
              key={t.unique_id || t.id || t.timestamp}
              className="trade-item"
              onClick={() => handleTradeClick(t)} // <-- added click here
              style={{ cursor: "pointer" }} // optional, shows pointer
            >
              {visibleFields.map((key) => (
                <div key={key}>{renderValue(t, key)}</div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TradesList;