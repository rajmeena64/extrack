import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // <-- added
import "./Trades.css";
import SymbolWithIcon from "../Common/SymbolWithIcon";
import { EllipsisVertical } from "../Common/icons";
import { formatCurrency } from "../../utils/Currency";
import { getTradeDisplayDate, getTradeDisplayTime } from "../../utils/tradeTime";

const FIELDS = [
  { key: "symbol", label: "Symbol" },
  { key: "trade_time", label: "Date & Time" },
  { key: "pnl", label: "PnL" },
  { key: "price", label: "Entry" },
  { key: "exit_price", label: "Exit" },
  { key: "trade_type", label: "Type" },
  { key: "strategy", label: "Strategy" },
];
const ICON_SIZE = 25;
const LOCAL_STORAGE_KEY = "trades_visible_fields";

function TradesList({ trades = [], currencyCode = "USD" }) {
  const navigate = useNavigate(); // <-- added

  const [activeTab, setActiveTab] = useState("closed"); // "open" or "closed"
  const [showSettings, setShowSettings] = useState(false);

  // Load visible fields from localStorage or default
  const [visibleFields, setVisibleFields] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : ["symbol", "trade_time", "pnl"];
    return parsed.map((field) => (field === "timestamp" ? "trade_time" : field));
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
      .sort((a, b) => getTradeDisplayTime(b) - getTradeDisplayTime(a))
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

      case "trade_time": {
        const d = getTradeDisplayDate(t);
        if (!d) return "--";

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

      case "pnl":
        return formatCurrency(t.pnl, currencyCode);

      default:
        return t[key];
    }
  };

  return (
    <div className="my-trades">
      {/* ================= HEADER ================= */}
      <div className="trades-header">
        <h2 className="trades-title dashboard-card-title">My Trades</h2>

        <div className="trades-header-actions">
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
            <EllipsisVertical
              size={ICON_SIZE}
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
      </div>

      {/* ================= TABLE HEADER ================= */}
      <div className="trades-table-scroll">
        <div className="trades-header-row" data-columns={visibleFields.length}>
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
                key={t.unique_id || t.id || `${t.open_timestamp || ""}-${t.close_timestamp || ""}`}
                className="trade-item"
                data-columns={visibleFields.length}
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
    </div>
  );
}

export default TradesList;
