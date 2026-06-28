import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import "./ThatTrade.css";

import Chart from "../chart/Chart";
import SymbolWithIcon from "../../Common/SymbolWithIcon";
import LegacyIcon from "../../Common/LegacyIcon";
import MainContentWrapper from "../../Layout/MainContentWrapper";
import PageHeader from "../../Layout/PageHeader";
import api from "../../../utils/serve";
import { normalizeStoredSymbol } from "../../../utils/symbols";
import { getTradeDisplayDate } from "../../../utils/tradeTime";
import { getUserSafeError } from "../../../utils/safeErrors";
import { useAuth } from "../../../context/AuthContext";

function ThatTrade({ trades = [] }) {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // States for editable fields
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  
  // Screenshot states
  const [screenshots, setScreenshots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [screenshotToDelete, setScreenshotToDelete] = useState("");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState("");

  // ✅ FIXED: Proper useMemo syntax
  const trade = useMemo(() => {
    return location.state?.tradeData ||
      trades.find(t => t.id === tradeId || t.unique_id === tradeId);
  }, [tradeId, location.state?.tradeData, trades]);

  // Track current trade ID
  const currentTradeIdRef = useRef(trade?.unique_id);

  // ✅ FIXED: Memoized fetchTradeData with useCallback
  const fetchTradeData = useCallback(async () => {
    if (!trade?.unique_id) return;

    setIsLoading(true);
    try {
      const { data } = await api.get(`/get-trade/${trade.unique_id}`);
      
      if (data.success) {
        setNotes(data.trade.notes || "");
        setStrategy(data.trade.strategy || "");
        
        // Parse screenshots if they exist
        if (data.trade.screenshots) {
          try {
            const parsedScreenshots = Array.isArray(data.trade.screenshots) 
              ? data.trade.screenshots 
              : JSON.parse(data.trade.screenshots);
            setScreenshots(parsedScreenshots || []);
          } catch {
            setScreenshots([]);
          }
        }
      }
    } catch {
      // Trade details are already available from route state.
    } finally {
      setIsLoading(false);
    }
  }, [trade?.unique_id]);

  // ✅ FIXED: Proper useEffect with null check and dependencies
  useEffect(() => {
    // Do nothing when there is no trade.
    if (!trade) return;

    // Set initial values from trade object
    setStrategy(trade.strategy || "");
    setNotes(trade.notes || "");
    
    // Parse initial screenshots
    if (trade.screenshots) {
      try {
        const parsedScreenshots = Array.isArray(trade.screenshots) 
          ? trade.screenshots 
          : JSON.parse(trade.screenshots);
        setScreenshots(parsedScreenshots || []);
      } catch {
        setScreenshots([]);
      }
    }

    // Fetch only when unique_id actually changes.
    if (currentTradeIdRef.current !== trade.unique_id) {
      currentTradeIdRef.current = trade.unique_id;
      fetchTradeData();
    }
  }, [trade, fetchTradeData]);

  const goBack = () => navigate(-1);

  // Save strategy to backend
  const saveStrategy = async () => {
    if (!trade?.unique_id) return;
    
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const { data } = await api.post('/update-trade', {
        unique_id: trade.unique_id,
        strategy
      });
      
      if (data.success) {
        setSaveMessage("✅ Strategy saved!");
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
        setShowStrategyModal(false);
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error saving strategy");
      }
    } catch {
      setSaveMessage("❌ Error saving strategy");
    } finally {
      setIsSaving(false);
    }
  };

  // Save notes to backend
  const saveNotes = async () => {
    if (!trade?.unique_id) return;
    
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const { data } = await api.post('/update-trade', {
        unique_id: trade.unique_id,
        notes
      });
      
      if (data.success) {
        setSaveMessage("✅ Notes saved!");
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
        setShowNoteModal(false);
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error saving notes");
      }
    } catch {
      setSaveMessage("❌ Error saving notes");
    } finally {
      setIsSaving(false);
    }
  };

  // Upload screenshot
  const uploadScreenshot = async (file) => {
    if (!trade?.unique_id || !file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('unique_id', trade.unique_id);

    try {
      const { data } = await api.post('/upload-screenshot', formData);
      
      if (data.success) {
        setScreenshots(data.screenshots || []);
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
        setSaveMessage("✅ Screenshot uploaded!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error uploading screenshot");
      }
    } catch {
      setSaveMessage("❌ Error uploading screenshot");
    } finally {
      setUploading(false);
    }
  };

  // Delete screenshot
  const deleteScreenshot = (screenshotUrl, e) => {
    e.stopPropagation();
    if (!trade?.unique_id) return;
    setScreenshotToDelete(screenshotUrl);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!screenshotToDelete) return;
    
    setDeleting(true);
    try {
      const { data } = await api.delete('/delete-screenshot', {
        data: {
          unique_id: trade.unique_id,
          screenshotUrl: screenshotToDelete
        }
      });
      
      if (data.success) {
        setScreenshots(data.screenshots || []);
        if (user?.ID) queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
        setSaveMessage("✅ Screenshot deleted!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error deleting screenshot");
      }
    } catch {
      setSaveMessage("❌ Error deleting screenshot");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setScreenshotToDelete("");
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadScreenshot(file);
    }
    e.target.value = '';
  };

  // Quick strategy buttons
  const quickStrategies = [
    { category: "Common", items: ["Breakout", "Pullback", "Trend Following", "Range Trading", "Scalping", "Swing Trading"] },
    { category: "Patterns", items: ["Double Top/Bottom", "Head & Shoulders", "Triangle", "Flag", "Candlestick"] }
  ];

  const addQuickStrategy = (strategyText) => {
    setStrategy(prev => prev ? prev + '\n' + strategyText : strategyText);
  };

  if (!trade) {
    return (
      <MainContentWrapper>
        <PageHeader title="Trade Not Found" onBack={goBack} backLabel="Go Back" />
      </MainContentWrapper>
    );
  }

  const pnl = Number(trade.pnl) || 0;
  const isProfit = pnl >= 0;

  const formatTradeDateTime = (currentTrade) => {
    const tradeDate = getTradeDisplayDate(currentTrade);
    if (!tradeDate) return { date: "--", time: "--" };

    return {
      date: tradeDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }),
      time: tradeDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      dateObj: tradeDate,
      isoDate: tradeDate.toISOString().split("T")[0]
    };
  };

  const generateTradeAnalysis = async () => {
    if (!trade) return;

    setAiAnalysis("");
    setAiError("");
    setAiLoading(true);

    try {
      const analysisTrade = {
        ...trade,
        notes,
        strategy,
        screenshots,
      };

      const { data } = await api.post("/ai-trade-analysis", {
        date: formatTradeDateTime(trade).isoDate,
        trades: [analysisTrade],
        currencyCode: "USD",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        analysisMode: "single-trade",
      });

      if (!data?.success) {
        throw new Error(data?.error || "AI trade analysis failed.");
      }

      setAiAnalysis(data.analysis);
    } catch (error) {
      setAiError(getUserSafeError(error, "AI trade analysis failed."));
    } finally {
      setAiLoading(false);
    }
  };

  const toEpochSeconds = (value) => {
    if (!value) return null;
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  };

  const { date, time, dateObj } = formatTradeDateTime(trade);

  const getBinanceSymbol = (symbol) => {
    if (!symbol) return "BTCUSDT";
    return normalizeStoredSymbol(symbol);
  };

  return (
    <MainContentWrapper>
      <PageHeader
        title="Trade Detail"
        onBack={goBack}
        className="trade-detail-header"
        actions={(
          <div className="trade-detail-symbol">
          <SymbolWithIcon symbol={trade.symbol} size="sm" />
          <span>{date}</span>
        </div>
        )}
      />

      <div className="trade-page">

        {/* LEFT PANEL - STATS */}
        <div className="trade-stats-panel">
          <div className="trade-top">
            <h3 className="trade-title">
              <div className="SymbolSize">
                <SymbolWithIcon symbol={trade.symbol} size="lg" />
              </div>
              <span className="trade-date"> · {date}</span>
            </h3>
          </div>

          <div className={`net-pnl ${isProfit ? "profit" : "loss"}`}>
            <p>Net P&amp;L</p>
            <h2>{isProfit ? "+" : "-"}${Math.abs(pnl).toFixed(2)}</h2>
          </div>

          <Stat label="Side" value={trade.trade_type} className="row-side" />
          <Stat label="Quantity" value={trade.quantity} className="row-qty" />
          <Stat label="Entry Price" value={trade.price} className="row-entry" />
          <Stat label="Exit Price" value={trade.exit_price} className="row-exit" />
          <Stat label="Date" value={date} className="row-date" />
          <Stat label="Time" value={time} className="row-time" />

          {/* STRATEGY SECTION */}
          <div className="strategy-section">
            <div className="section-header">
              <div className="section-title">
                <LegacyIcon className="fas fa-chess-board" /> Strategy
              </div>
              <button className="edit-btn" onClick={() => setShowStrategyModal(true)}>
                <LegacyIcon className="fas fa-edit" /> Edit
              </button>
            </div>
            <div 
              className={`strategy-display ${!strategy ? 'empty' : ''}`}
              onClick={() => setShowStrategyModal(true)}
            >
              {strategy ? (
                <div className="strategy-text">{strategy}</div>
              ) : (
                "Click to add strategy"
              )}
            </div>
          </div>

          {/* NOTES SECTION */}
          <div className="notes-section">
            <div className="section-header">
              <div className="section-title">
                <LegacyIcon className="fas fa-sticky-note" /> Notes
              </div>
              <button className="edit-btn" onClick={() => setShowNoteModal(true)}>
                <LegacyIcon className="fas fa-edit" /> Edit
              </button>
            </div>
            <div 
              className={`note-display ${!notes ? 'empty' : ''}`}
              onClick={() => setShowNoteModal(true)}
            >
              {notes || "Click to add notes"}
            </div>
          </div>

          {/* SCREENSHOTS SECTION */}
          <div className="screenshots-section">
            <div className="section-header">
              <div className="section-title">
                <LegacyIcon className="fas fa-camera" /> Screenshots ({screenshots.length})
              </div>
              <div className="screenshot-actions">
                <input
                  type="file"
                  id="screenshot-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <label 
                  htmlFor="screenshot-upload" 
                  className="add-btn"
                >
                  <LegacyIcon className="fas fa-plus" /> Add
                </label>
              </div>
            </div>

            <div className="screenshots-grid">
              {screenshots.length > 0 ? (
                screenshots.map((url, index) => (
                  <div key={index} className="screenshot-item">
                    <img 
                      src={url} 
                      alt={`Screenshot ${index + 1}`}
                      onClick={() => {
                        setFullscreenImage(url);
                        setShowFullscreen(true);
                      }}
                    />
                    <button
                      className="delete-screenshot"
                      onClick={(e) => deleteScreenshot(url, e)}
                      disabled={deleting}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-screenshots">
                  No screenshots yet
                </div>
              )}
            </div>

            {uploading && (
              <div className="uploading-indicator">
                <LegacyIcon className="fas fa-spinner fa-spin" /> Uploading...
              </div>
            )}
          </div>

          <div className="ai-trade-section">
            <div className="section-header">
              <div className="section-title">
                <LegacyIcon className="fas fa-chart-line" /> AI Trade Review
              </div>
              <button className="edit-btn" onClick={generateTradeAnalysis} disabled={aiLoading}>
                {aiLoading ? "Reviewing..." : "Review"}
              </button>
            </div>

            {aiError && <div className="save-message error">{aiError}</div>}

            <div className={`ai-trade-output ${!aiAnalysis ? "empty" : ""}`}>
              {aiAnalysis ? (
                <pre>{aiAnalysis}</pre>
              ) : (
                screenshots.length > 0
                  ? "AI will review chart structure, timing, event exposure, execution quality, and what should improve."
                  : "Add a screenshot for chart reading. Without it, AI will review timing, behavior, event exposure, and execution quality from trade data."
              )}
            </div>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div className="save-message">{saveMessage}</div>
          )}
        </div>

        {/* RIGHT CONTENT - Chart only */}
        <div className="trade-content">
          <div className="trade-chart-box">
            <Chart
              symbol={getBinanceSymbol(trade.symbol)}
              category={trade.category}
              tradeDate={dateObj}
              tradeTime={time}
              showFullDay={true}
              trades={[{
                entryTime: toEpochSeconds(trade.open_timestamp),
                exitTime: toEpochSeconds(trade.close_timestamp || trade.exit_timestamp),
                entryPrice: trade.price,
                exitPrice: trade.exit_price,
                side: trade.trade_type
              }]}
            />

          </div>
        </div>
      </div>

      {/* STRATEGY MODAL */}
      {showStrategyModal && (
        <div className="trade-detail-modal-overlay" onClick={() => setShowStrategyModal(false)}>
          <div className="trade-detail-modal-content" onClick={e => e.stopPropagation()}>
            <div className="trade-detail-modal-header">
              <h3><LegacyIcon className="fas fa-chess-board" /> Trading Strategy</h3>
              <button className="trade-detail-modal-close" onClick={() => setShowStrategyModal(false)}>×</button>
            </div>
            <div className="trade-detail-modal-body">
              {/* Quick Strategies */}
              <div className="quick-strategies">
                {quickStrategies.map((category, idx) => (
                  <div key={idx} className="strategy-category">
                    <div className="category-title">{category.category}</div>
                    <div className="strategy-buttons">
                      {category.items.map((item, i) => (
                        <button
                          key={i}
                          className="strategy-btn"
                          onClick={() => addQuickStrategy(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Strategy Input */}
              <div className="custom-strategy">
                <label>Custom Strategy:</label>
                <textarea
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="Describe your trading strategy..."
                  rows={6}
                />
              </div>

              <div className="trade-detail-modal-actions">
                <button className="cancel-btn" onClick={() => setShowStrategyModal(false)}>
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={saveStrategy}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Strategy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTES MODAL */}
      {showNoteModal && (
        <div className="trade-detail-modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="trade-detail-modal-content" onClick={e => e.stopPropagation()}>
            <div className="trade-detail-modal-header">
              <h3><LegacyIcon className="fas fa-sticky-note" /> Trade Notes</h3>
              <button className="trade-detail-modal-close" onClick={() => setShowNoteModal(false)}>×</button>
            </div>
            <div className="trade-detail-modal-body">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
                rows={8}
              />
              <div className="trade-detail-modal-actions">
                <button className="cancel-btn" onClick={() => setShowNoteModal(false)}>
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={saveNotes}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="trade-detail-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <h4>Delete Screenshot?</h4>
            <p>Are you sure you want to delete this screenshot?</p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button 
                className="delete-btn" 
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE VIEWER */}
      {showFullscreen && (
        <div className="fullscreen-viewer" onClick={() => setShowFullscreen(false)}>
          <button className="close-fullscreen" onClick={() => setShowFullscreen(false)}>×</button>
          <img src={fullscreenImage} alt="Screenshot" />
        </div>
      )}
    </MainContentWrapper>
  );
}

const Stat = ({ label, value, highlight, className }) => (
  <div className={`stat-row ${className}`}>
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${highlight ? "highlight" : ""}`}>
      {value}
    </span>
  </div>
);

export default ThatTrade;

