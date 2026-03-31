import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SymbolWithIcon from "../Common/SymbolWithIcon";

function ManualEntryForm({ API_URL, trades }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    symbol: '',
    tradeType: '',
    category: '',
    tradeDate: '',
    tradeTime: '',
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    manualPNL: '',
    strategy: '',
  });

  const [previewImage, setPreviewImage] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const symbols = useMemo(() => {
    return [...new Set(trades?.map(t => t.symbol).filter(Boolean))];
  }, [trades]);

  const filteredSymbols = useMemo(() => {
    if (!searchText) return symbols;
    return symbols.filter(s => s.toUpperCase().includes(searchText.toUpperCase()));
  }, [symbols, searchText]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);
    setFormData(prev => ({ ...prev, tradeDate: today, tradeTime: time }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setIsTyping(false);
        if (!formData.symbol) setSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formData.symbol]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSymbolSelect = (symbol) => {
    setFormData(prev => ({ ...prev, symbol }));
    setSearchText('');
    setIsTyping(false);
    setShowDropdown(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => setPreviewImage(event.target.result);
      reader.readAsDataURL(file);
      setScreenshotFile(file);
    }
  };

  const removeScreenshot = () => {
    setPreviewImage('');
    setScreenshotFile(null);
  };

  const submitManualTrade = async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.ID) {
      alert('Please login first!');
      navigate('/login');
      return;
    }

    const requiredFields = ['symbol', 'tradeType', 'quantity', 'entryPrice', 'exitPrice', 'tradeDate', 'tradeTime', 'manualPNL'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      alert('Please fill all required fields including P&L!');
      return;
    }

    const istDateTime = `${formData.tradeDate}T${formData.tradeTime}:00+05:30`;
    const utcTimestamp = new Date(istDateTime).toISOString();

    const tradeData = {
      userId: currentUser.ID,
      symbol: formData.symbol,
      trade_type: formData.tradeType,
      category: formData.category,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.entryPrice),
      exit_price: parseFloat(formData.exitPrice),
      pnl: parseFloat(formData.manualPNL),
      strategy: formData.strategy,
      timestamp: utcTimestamp
    };

    try {
      const response = await fetch(`${API_URL}/api/save-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });
      const result = await response.json();
      if (result.success) {
        alert('✅ Trade added successfully!');
        navigate('/');
      } else {
        alert('❌ Error: ' + result.error);
      }
    } catch (error) {
      alert('❌ Network error: Could not save trade');
      console.error('Trade save error:', error);
    }
  };

  return (
    <div className="form-card horizontal-entry-form" style={{ overflow: 'visible' }}>

      {/* Category */}
      <div className="form-group category-top">
        <label htmlFor="category">Category</label>
        <select id="category" value={formData.category} onChange={handleInputChange}>
          <option value="">Select Category</option>
          <option value="stocks">Stocks</option>
          <option value="crypto">Crypto</option>
          <option value="forex">Forex</option>
          <option value="commodities">Commodities</option>
        </select>
      </div>

      {/* Horizontal Fields */}
      <div className="form-fields-horizontal" style={{ overflow: 'visible' }}>

        {/* ✅ Symbol Field - CSS variables use, exactly same as other inputs */}
        <div className="form-group" style={{ position: 'relative', zIndex: 100 }} ref={dropdownRef}>
          <label className="required">Symbol</label>

          {formData.symbol && !isTyping ? (
            // Selected state — SymbolWithIcon dikhao, same styling as input
            <div
              onClick={() => {
                setIsTyping(true);
                setShowDropdown(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '10px',
                height: '33px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'text',
                boxSizing: 'border-box',
              }}
            >
              <SymbolWithIcon symbol={formData.symbol} size="md" />
            </div>
          ) : (
            // Typing state — normal input
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value.toUpperCase().replace(/\s+/g, ''));
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                setTimeout(() => {
                  setShowDropdown(false);
                  setIsTyping(false);
                  if (!formData.symbol) setSearchText('');
                }, 200);
              }}
              placeholder="BTCUSD"
              autoComplete="off"
            />
          )}

          {/* Dropdown */}
          {showDropdown && filteredSymbols.length > 0 && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              minWidth: '180px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              zIndex: 99999,
              listStyle: 'none',
              margin: '2px 0 0 0',
              padding: 0,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {filteredSymbols.map(s => (
                <li
                  key={s}
                  onMouseDown={() => handleSymbolSelect(s)}
                  style={{
                    padding: '6px 10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: '10px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <SymbolWithIcon symbol={s} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="tradeType" className="required">Trade Type</label>
          <select id="tradeType" value={formData.tradeType} onChange={handleInputChange}>
            <option value="">Select</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tradeDate" className="required">Date</label>
          <input type="date" id="tradeDate" value={formData.tradeDate} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="tradeTime" className="required">Time</label>
          <input type="time" id="tradeTime" value={formData.tradeTime} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="quantity" className="required">Qty</label>
          <input type="number" id="quantity" value={formData.quantity} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="entryPrice" className="required">Entry</label>
          <input type="number" id="entryPrice" value={formData.entryPrice} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="exitPrice" className="required">Exit</label>
          <input type="number" id="exitPrice" value={formData.exitPrice} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="manualPNL" className="required">P&L</label>
          <input type="number" id="manualPNL" value={formData.manualPNL} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label htmlFor="strategy">Strategy</label>
          <input type="text" id="strategy" value={formData.strategy} onChange={handleInputChange} />
        </div>

      </div>

      {/* Screenshot Section */}
      <div className="form-card screenshot-section-horizontal">
        {!previewImage ? (
          <div className="screenshot-upload" id="screenshotUpload">
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div className="upload-text">Upload Screenshot</div>
            <div className="upload-hint">Click or drag & drop chart screenshot</div>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
              id="screenshotInput"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => document.getElementById('screenshotInput').click()}
            >
              <i className="fas fa-upload"></i> Choose Image
            </button>
          </div>
        ) : (
          <div className="screenshot-preview" style={{ display: 'block' }}>
            <img id="previewImage" src={previewImage} alt="Screenshot Preview" />
            <button type="button" className="remove-screenshot" onClick={removeScreenshot}>
              <i className="fas fa-trash"></i> Remove Screenshot
            </button>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="btn-group-horizontal">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <i className="fas fa-times"></i> Cancel
        </button>
        <button className="btn btn-primary" onClick={submitManualTrade}>
          <i className="fas fa-plus-circle"></i> Add Trade
        </button>
      </div>

    </div>
  );
}

export default ManualEntryForm;