import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SymbolWithIcon from "../Common/SymbolWithIcon";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

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
  const symbols = useMemo(() => {
    return [...new Set(trades?.map(t => t.symbol).filter(Boolean))];
  }, [trades]);

  // Set current date and time on load
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);
    
    setFormData(prev => ({
      ...prev,
      tradeDate: today,
      tradeTime: time
    }));
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    
    // Capitalize symbol input
    if (id === 'symbol') {
      setFormData(prev => ({
        ...prev,
        [id]: value.toUpperCase().replace(/\s+/g, '').trim()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: value
      }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target.result);
      };
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

    // Validate required fields
    const requiredFields = ['symbol', 'tradeType', 'quantity', 'entryPrice', 'exitPrice', 'tradeDate', 'tradeTime', 'manualPNL'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert('Please fill all required fields including P&L!');
      return;
    }

    // Convert IST to UTC
    const istDateTime = `${formData.tradeDate}T${formData.tradeTime}:00+05:30`;
    const dateObj = new Date(istDateTime);
    const utcTimestamp = dateObj.toISOString();

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
        headers: {
          'Content-Type': 'application/json'
        },
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
    <div className="form-card horizontal-entry-form">
      {/* Top-left Category */}
      <div className="form-group category-top">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={formData.category}
          onChange={handleInputChange}
        >
          <option value="">Select Category</option>
          <option value="stocks">Stocks</option>
          <option value="crypto">Crypto</option>
          <option value="forex">Forex</option>
          <option value="commodities">Commodities</option>
        </select>
      </div>

      {/* Horizontal row of other fields */}
      <div className="form-fields-horizontal">
        <div className="form-group">
          <label htmlFor="symbol" className="required">Symbol</label>


 <Autocomplete
  freeSolo
  options={symbols}
  value={formData.symbol || null}
  inputValue={formData.symbol}

  onInputChange={(event, newValue) => {
    setFormData(prev => ({
      ...prev,
      symbol: (newValue || '').toUpperCase().replace(/\s+/g, '')
    }));
  }}

  renderOption={(props, option) => (
    <li {...props}>
      <SymbolWithIcon symbol={option} size="sm" />
    </li>
  )}

  renderInput={(params) => (
    <TextField
      {...params}
      placeholder="BTCUSD"
      InputProps={{
        ...params.InputProps,
        startAdornment: formData.symbol ? (
          <SymbolWithIcon symbol={formData.symbol} size="sm" />
        ) : null,
      }}
    />
  )}
/> 






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
          <input type="date" id="tradeDate" value={formData.tradeDate} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="tradeTime" className="required">Time</label>
          <input type="time" id="tradeTime" value={formData.tradeTime} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="quantity" className="required">Qty</label>
          <input type="number" id="quantity" value={formData.quantity} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="entryPrice" className="required">Entry</label>
          <input type="number" id="entryPrice" value={formData.entryPrice} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="exitPrice" className="required">Exit</label>
          <input type="number" id="exitPrice" value={formData.exitPrice} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="manualPNL" className="required">P&L</label>
          <input type="number" id="manualPNL" value={formData.manualPNL} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="strategy">Strategy</label>
          <input type="text" id="strategy" value={formData.strategy} onChange={handleInputChange}/>
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
          <div className="screenshot-preview" style={{display: 'block'}}>
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