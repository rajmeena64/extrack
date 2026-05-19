import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LegacyIcon from '../Common/LegacyIcon';
import api from '../../utils/serve';
import { useAuth } from '../../context/AuthContext';
import { normalizeStoredSymbol } from '../../utils/symbols';
import { parseTradeNumber } from '../../utils/fieldValidation';

function CSVUploadForm({ csvData, setCsvData }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [previewData, setPreviewData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleCSVFile = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File size too large. Please upload a file smaller than 5MB.');
      return;
    }
    
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      alert('Please upload a valid CSV file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseCSVData(e.target.result);
      } catch (error) {
        alert('Error reading CSV file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVData = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert('CSV file is empty or has no data rows.');
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    const columnMapping = {
      'symbol': ['symbol', 'tradingsymbol', 'instrument', 'pair'],
      'trade_type': ['type', 'trade_type', 'side', 'action', 'buy_sell', 'transaction_type'],
      'quantity': ['lots', 'quantity', 'qty', 'volume', 'size', 'position_size', 'original_position_size'],
      'price': ['opening_price', 'price', 'entry_price', 'entryprice', 'open_price', 'openprice'],
      'exit_price': ['closing_price', 'exit_price', 'exitprice', 'close_price', 'closeprice', 'closing_price'],
      'pnl': ['profit_usd', 'pnl', 'profit', 'pl', 'net_pnl', 'profit_loss', "profit_usc"],
      'open_timestamp': ['opening_time_utc', 'open_timestamp', 'timestamp', 'date_time', 'datetime', 'time', 'trade_time', 'execution_time']
    };

    const headerMap = {};
    let missingColumns = [];

    Object.keys(columnMapping).forEach(standardName => {
      const found = headers.find(header => 
        columnMapping[standardName].includes(header)
      );
      
      if (found) {
        headerMap[found] = standardName;
      } else if (standardName !== 'pnl') {
        missingColumns.push(standardName);
      }
    });

    if (missingColumns.length > 0) {
      alert('Missing required columns: ' + missingColumns.join(', ') + 
            '\n\nAvailable columns in your CSV: ' + headers.join(', '));
      return;
    }
    
    const trades = [];
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const trade = {};
      
        headers.forEach((header, index) => {
          if (headerMap[header] && values[index]) {
            trade[headerMap[header]] = headerMap[header] === 'symbol'
              ? normalizeStoredSymbol(values[index])
              : values[index];
          }
        });
      
      trades.push(trade);
    }
    
    setPreviewData(trades);
    
    setCsvData({
      headers,
      headerMap,
      allLines: lines.slice(1)
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        handleCSVFile(file);
      } else {
        alert('Please upload a CSV file only.');
      }
    }
  };

  const removeCSV = () => {
    setCsvData(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitCSVTrades = async () => {
    if (!csvData) {
      alert('No CSV data to upload.');
      return;
    }
    
    if (!user?.ID) {
      alert('Please login first!');
      navigate('/login');
      return;
    }
    
    try {
      const trades = [];
      const headers = csvData.headers;
      const headerMap = csvData.headerMap;
      
      for (let i = 0; i < csvData.allLines.length; i++) {
        const line = csvData.allLines[i];
        if (!line.trim()) continue;
        
        const values = line.split(',').map(v => v.trim());
        const trade = {
          userId: user.ID
        };
        
        headers.forEach((header, index) => {
          if (headerMap[header] && values[index]) {
            const standardName = headerMap[header];
            const value = values[index];
            
            if (['quantity', 'price', 'exit_price', 'pnl'].includes(standardName)) {
              const min = standardName === 'pnl' ? -Infinity : 0.0000001;
              trade[standardName] = parseTradeNumber(value, { min, required: standardName !== 'pnl' });
            } else if (standardName === 'symbol') {
              trade[standardName] = normalizeStoredSymbol(value);
            } else {
              trade[standardName] = value;
            }
          }
        });

        if (trade.trade_type) {
          const tradeType = trade.trade_type.toLowerCase();
          if (tradeType.includes('buy') || tradeType.includes('long') || tradeType === 'b') {
            trade.trade_type = 'buy';
          } else if (tradeType.includes('sell') || tradeType.includes('short') || tradeType === 's') {
            trade.trade_type = 'sell';
          }
        }
        
        if (
          trade.symbol
          && trade.trade_type
          && trade.quantity !== null
          && trade.price !== null
          && trade.exit_price !== null
          && trade.open_timestamp
        ) {
          const tradeDate = new Date(trade.open_timestamp);
          const now = new Date();
          if (tradeDate > now) {
            alert(`❌ CSV contains future trades (e.g., ${trade.symbol} on ${trade.open_timestamp}). Future trades are not allowed.`);
            return;
          }
          trades.push(trade);
        }
      }
      
      if (trades.length === 0) {
        throw new Error('No valid trades found in CSV file.');
      }
      
      const { data: result } = await api.post('/save-bulk-trades', { trades });
      
      if (result.success) {
        alert(`✅ Successfully uploaded ${trades.length} trades!`);
        navigate('/');
      } else {
        throw new Error(result.error || 'Failed to save trades');
      }
      
    } catch (error) {
      alert('❌ CSV Upload failed: ' + error.message);
    }
  };

  return (
    <div id="csv-upload-form">
      <div className="form-card csv-upload-section">
        <div className="section-title">
          <LegacyIcon className="fas fa-file-csv" />
          CSV Bulk Upload
        </div>
        
        {!csvData ? (
          <div 
            className={`csv-upload ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <div className="csv-icon">
              <LegacyIcon className="fas fa-file-excel" />
            </div>
            <div className="csv-text">
              Upload CSV File
            </div>
            <div className="csv-hint">
              Click or drag & drop your broker CSV file<br />
              Supported: .csv (Max 5MB)
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <LegacyIcon className="fas fa-upload" /> Choose CSV File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files[0] && handleCSVFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="csv-preview" id="csvPreview" style={{display: 'block'}}>
            <h4>CSV Preview (First 5 rows):</h4>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>P&L</th>
                  <th>Open Time</th>
                </tr>
              </thead>
              <tbody id="previewTableBody">
                {previewData.map((trade, index) => {
                  const parsedPnl = parseTradeNumber(trade.pnl, { required: false });
                  const hasPnl = trade.pnl !== undefined && trade.pnl !== null && trade.pnl !== '';
                  const pnlValue = hasPnl && parsedPnl !== null ? parsedPnl.toFixed(2) : '';
                  const pnlClass = hasPnl && parsedPnl !== null ? (parsedPnl >= 0 ? 'profit' : 'loss') : '';
                  
                  return (
                    <tr key={index}>
                      <td>{trade.symbol || ''}</td>
                      <td>{trade.trade_type || ''}</td>
                      <td>{trade.quantity || ''}</td>
                      <td>{trade.price || ''}</td>
                      <td>{trade.exit_price || ''}</td>
                      <td className={pnlClass}>{pnlValue ? '' + pnlValue : ''}</td>
                      <td>{trade.open_timestamp ? String(trade.open_timestamp).substring(0, 19) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button type="button" className="remove-csv" onClick={removeCSV}>
              <LegacyIcon className="fas fa-trash" /> Remove CSV File
            </button>
          </div>
        )}
      </div>

      {/* CSV Upload Buttons */}
      <div className="btn-group">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          <LegacyIcon className="fas fa-times" /> Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={submitCSVTrades}
          disabled={!csvData}
          id="submitCSVBtn"
        >
          <LegacyIcon className="fas fa-upload" /> Upload CSV Trades
        </button>
      </div>
    </div>
  );
}

export default CSVUploadForm;
