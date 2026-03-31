import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./Markets.css";
import Chart from "./Chart";
import SymbolWithIcon from "../Common/SymbolWithIcon";
import { API_URL } from "../../utils/constants";

function ThatTrade({ trades = [] }) {
  const { tradeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // States for editable fields
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
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

  // ✅ FIX 1: useMemo to prevent recreation on every render
  const trade = useMemo(() => {
    return location.state?.tradeData ||
      trades.find(t => t.id === tradeId || t.unique_id === tradeId);
  }, [tradeId, location.state?.tradeData, trades]);


  // ✅ FIX 2: Track current trade ID
  const currentTradeIdRef = useRef(trade?.unique_id);

  // Fetch latest trade data from backend
  const fetchTradeData = async () => {
    if (!trade?.unique_id || !trade?.user_id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/get-trade/${trade.unique_id}?userId=${trade.user_id}`
      );
      const data = await response.json();
      
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
          } catch (e) {
            setScreenshots([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching trade data:", error);
    } finally {
      setIsLoading(false);
    }

    
  };



  // ✅ FIX 3: Sirf tab run hoga jab unique_id change ho
  useEffect(() => {
    // Agar trade nahi hai to kuch mat karo
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
      } catch (e) {
        setScreenshots([]);
      }
    }

    // ✅ Sirf tab fetch karo jab unique_id ACTUALLY change hua ho
    if (currentTradeIdRef.current !== trade.unique_id) {
      console.log("Trade ID changed, fetching new data...");
      currentTradeIdRef.current = trade.unique_id;
      fetchTradeData();
    }
  }, [trade?.unique_id]);

  const goBack = () => navigate(-1);

  // Save strategy to backend
  const saveStrategy = async () => {
    if (!trade?.unique_id) return;
    
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const response = await fetch(`${API_URL}/api/update-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_id: trade.unique_id,
          userId: trade.user_id,
          strategy: strategy
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage("✅ Strategy saved!");
        setShowStrategyModal(false);
        setTimeout(() => setSaveMessage(""), 3000);
        // Save ke baad bhi fetch nahi karna, state already updated hai
      } else {
        setSaveMessage("❌ Error saving strategy");
      }
    } catch (error) {
      console.error("Error saving strategy:", error);
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
      const response = await fetch(`${API_URL}/api/update-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_id: trade.unique_id,
          userId: trade.user_id,
          notes: notes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage("✅ Notes saved!");
        setShowNoteModal(false);
        setTimeout(() => setSaveMessage(""), 3000);
        // Save ke baad bhi fetch nahi karna
      } else {
        setSaveMessage("❌ Error saving notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
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
    formData.append('userId', trade.user_id);

    try {
      const response = await fetch(`${API_URL}/api/upload-screenshot`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScreenshots(data.screenshots || []);
        setSaveMessage("✅ Screenshot uploaded!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error uploading screenshot");
      }
    } catch (error) {
      console.error("Error uploading screenshot:", error);
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
      const response = await fetch(`${API_URL}/api/delete-screenshot`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unique_id: trade.unique_id,
          userId: trade.user_id,
          screenshotUrl: screenshotToDelete
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScreenshots(data.screenshots || []);
        setSaveMessage("✅ Screenshot deleted!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Error deleting screenshot");
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error);
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
      <div className="main-content">
        <h2>Trade Not Found</h2>
        <button onClick={goBack} className="back-btn">Go Back</button>
      </div>
    );
  }

  const pnl = Number(trade.pnl) || 0;
  const isProfit = pnl >= 0;

  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: "--", time: "--" };

    const d = new Date(timestamp);

    return {
      date: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }),
      time: d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      dateObj: d,
      isoDate: d.toISOString().split("T")[0]
    };
  };

  const { date, time, dateObj } = formatDateTime(trade.timestamp);

  const getBinanceSymbol = (symbol) => {
    if (!symbol) return "BTCUSDT";
    return symbol.toUpperCase();
  };

  return (
    <div className="main-content">
      <div className="trade-page">

        {/* LEFT PANEL - STATS */}
        <div className="trade-stats-panel">
          <div className="trade-top">
            <button onClick={goBack} className="back-btn">← Back</button>

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
                <i className="fas fa-chess-board"></i> Strategy
              </div>
              <button className="edit-btn" onClick={() => setShowStrategyModal(true)}>
                <i className="fas fa-edit"></i> Edit
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
                <i className="fas fa-sticky-note"></i> Notes
              </div>
              <button className="edit-btn" onClick={() => setShowNoteModal(true)}>
                <i className="fas fa-edit"></i> Edit
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
                <i className="fas fa-camera"></i> Screenshots ({screenshots.length})
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
                  <i className="fas fa-plus"></i> Add
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
                <i className="fas fa-spinner fa-spin"></i> Uploading...
              </div>
            )}
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
              tradeDate={dateObj}
              tradeTime={time}
              showFullDay={true}

               trades={[{
                  entryTime: trade.open_timestamp,
                  exitTime: trade.close_timestamp,
                  entryPrice: trade.price,
                  exitPrice: trade.exit_price,
                  side     :  trade.trade_type
             }]}

            />
          </div>
        </div>
      </div>

      {/* STRATEGY MODAL */}
      {showStrategyModal && (
        <div className="modal-overlay" onClick={() => setShowStrategyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-chess-board"></i> Trading Strategy</h3>
              <button className="modal-close" onClick={() => setShowStrategyModal(false)}>×</button>
            </div>
            <div className="modal-body">
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

              <div className="modal-actions">
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
        <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-sticky-note"></i> Trade Notes</h3>
              <button className="modal-close" onClick={() => setShowNoteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your notes here..."
                rows={8}
              />
              <div className="modal-actions">
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
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
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
    </div>
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