import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SymbolWithIcon from "../Common/SymbolWithIcon";
import LegacyIcon from "../Common/LegacyIcon";
import api from "../../utils/serve";
import { useAuth } from '../../context/AuthContext';
import { normalizeStoredSymbol } from "../../utils/symbols";
import { parseTradeNumber, sanitizeDecimalInput, sanitizeSignedDecimalInput } from "../../utils/fieldValidation";
import TradeSaveOverlay from './TradeSaveOverlay';

const generateTradeUniqueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

function ManualEntryForm({ trades }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const now = new Date();
  const initialTradeDate = now.toISOString().split('T')[0];
  const initialTradeTime = now.toTimeString().substring(0, 5);
  const [formData, setFormData] = useState({
    symbol: '',
    tradeType: '',
    category: '',
    tradeDate: initialTradeDate,
    tradeTime: initialTradeTime,
    quantity: '',
    entryPrice: '',
    exitPrice: '',
    manualPNL: '',
    strategy: '',
  });

  const [previewImage, setPreviewImage] = useState('');
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [saveError, setSaveError] = useState('');
  const symbolBlurTimeoutRef = useRef(null);
  const symbols = useMemo(() => {
    return [...new Set(trades?.map(t => t.symbol).filter(Boolean))];
  }, [trades]);
  const filteredSymbols = useMemo(() => {
    const query = formData.symbol.trim().toUpperCase();
    if (!query) return symbols.slice(0, 8);
    return symbols
      .filter((symbol) => symbol.toUpperCase().includes(query))
      .slice(0, 8);
  }, [formData.symbol, symbols]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    
    if (id === 'symbol') {
      setFormData(prev => ({
        ...prev,
        [id]: normalizeStoredSymbol(value)
      }));
    } else if (['quantity', 'entryPrice', 'exitPrice'].includes(id)) {
      const sanitizedValue = sanitizeDecimalInput(value);
      if (sanitizedValue === null) return;
      setFormData(prev => ({
        ...prev,
        [id]: sanitizedValue
      }));
    } else if (id === 'manualPNL') {
      const sanitizedValue = sanitizeSignedDecimalInput(value);
      if (sanitizedValue === null) return;
      setFormData(prev => ({
        ...prev,
        [id]: sanitizedValue
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
      
    }
  };

  const removeScreenshot = () => {
    setPreviewImage('');
  };

  const selectSymbol = (symbol) => {
    setFormData(prev => ({
      ...prev,
      symbol: normalizeStoredSymbol(symbol)
    }));
    setShowSymbolSuggestions(false);
  };

  const toDashboardTrade = (savedTrade, status) => ({
    ID: savedTrade.ID,
    user_id: savedTrade.user_id,
    symbol: savedTrade.symbol,
    trade_type: savedTrade.trade_type,
    price: savedTrade.price,
    category: savedTrade.category,
    exit_price: savedTrade.exit_price,
    strategy: savedTrade.strategy,
    quantity: savedTrade.quantity,
    pnl: savedTrade.pnl,
    notes: savedTrade.notes,
    screenshots: savedTrade.screenshots,
    is_breakeven: Boolean(savedTrade.is_breakeven),
    open_timestamp: savedTrade.open_timestamp || savedTrade.timestamp,
    close_timestamp: savedTrade.close_timestamp || savedTrade.exit_timestamp || savedTrade.timestamp || null,
    unique_id: savedTrade.unique_id,
    ...(status ? { optimistic: true, status } : {}),
  });

  const updateTradeCaches = (updater) => {
    queryClient.getQueryCache().findAll({ queryKey: ['trades'] }).forEach((query) => {
      const [, queryUserId, mode] = query.queryKey;
      if (mode === 'api' || (queryUserId && user?.ID && queryUserId !== user.ID)) return;

      queryClient.setQueryData(query.queryKey, (oldTrades) => {
        if (!Array.isArray(oldTrades)) return oldTrades;
        return updater(oldTrades);
      });
    });
  };

  const saveTradeMutation = useMutation({
    mutationFn: async (tradeData) => {
      const { data } = await api.post('/save-trade', tradeData);
      if (!data?.success) {
        throw new Error(data?.error || 'Trade save failed. Please retry.');
      }
      return data.trade;
    },
    onMutate: async (tradeData) => {
      setSaveError('');
      await queryClient.cancelQueries({ queryKey: ['trades'] });

      const previousTradeQueries = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['trades'] })
        .map((query) => ({
          queryKey: query.queryKey,
          data: queryClient.getQueryData(query.queryKey),
        }));

      const optimisticTrade = toDashboardTrade({
        ...tradeData,
        user_id: user.ID,
        open_timestamp: tradeData.timestamp,
        close_timestamp: tradeData.timestamp,
      }, 'saving');

      updateTradeCaches((oldTrades) => {
        const withoutSameTrade = oldTrades.filter((trade) => trade.unique_id !== optimisticTrade.unique_id);
        return [optimisticTrade, ...withoutSameTrade];
      });

      navigate('/dashboard');

      return { previousTradeQueries, uniqueId: tradeData.unique_id };
    },
    onError: (_error, _tradeData, context) => {
      context?.previousTradeQueries?.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });

      setSaveError('Trade save failed. Please retry.');
      alert('Trade save failed. Please retry.');
    },
    onSuccess: (savedTrade, _tradeData, context) => {
      const realTrade = toDashboardTrade(savedTrade);
      updateTradeCaches((oldTrades) => {
        const replacedTrades = oldTrades.map((trade) => (
          trade.unique_id === context?.uniqueId ? realTrade : trade
        ));
        const hasSavedTrade = replacedTrades.some((trade) => trade.unique_id === realTrade.unique_id);
        return hasSavedTrade ? replacedTrades : [realTrade, ...replacedTrades];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['trades'],
        refetchType: 'active',
      });
    },
  });
  const isSavingTrade = saveTradeMutation.isPending;

  const submitManualTrade = async () => {
    if (saveTradeMutation.isPending) return;

    if (!user?.ID) {
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

    const quantity = parseTradeNumber(formData.quantity, { min: 0.0000001 });
    const entryPrice = parseTradeNumber(formData.entryPrice, { min: 0.0000001 });
    const exitPrice = parseTradeNumber(formData.exitPrice, { min: 0.0000001 });
    const pnl = parseTradeNumber(formData.manualPNL);

    if ([quantity, entryPrice, exitPrice, pnl].includes(null)) {
      alert('Quantity, entry, exit, and P&L must be valid numbers.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (formData.tradeDate > today) {
      alert('❌ Future trades are not allowed. Please select today or a past date.');
      return;
    }

    // Convert IST to UTC
    const istDateTime = `${formData.tradeDate}T${formData.tradeTime}:00+05:30`;
    const dateObj = new Date(istDateTime);
    const utcTimestamp = dateObj.toISOString();

    const tradeData = {
      unique_id: generateTradeUniqueId(),
      symbol: normalizeStoredSymbol(formData.symbol),
      trade_type: formData.tradeType,
      category: formData.category,
      quantity,
      price: entryPrice,
      exit_price: exitPrice,
      pnl,
      strategy: formData.strategy,
      timestamp: utcTimestamp
    };

    saveTradeMutation.mutate(tradeData);
  };

  return (
    <>
    {saveError ? <div className="trade-save-error-toast" role="alert">{saveError}</div> : null}
    {isSavingTrade ? <TradeSaveOverlay label="Saving trade and refreshing dashboard..." /> : null}
    <div className="form-card horizontal-entry-form" aria-busy={isSavingTrade}>
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
        <div className="form-group symbol-field">
          <label htmlFor="symbol" className="required">Symbol</label>
          <div className="symbol-input-shell">
            {formData.symbol ? (
              <span className="selected-symbol-icon" aria-hidden="true">
                <SymbolWithIcon symbol={formData.symbol} size="sm" showLabel={false} />
              </span>
            ) : null}
            <input
              type="text"
              id="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              onFocus={() => {
                if (symbolBlurTimeoutRef.current) {
                  clearTimeout(symbolBlurTimeoutRef.current);
                }
                setShowSymbolSuggestions(true);
              }}
              onBlur={() => {
                symbolBlurTimeoutRef.current = setTimeout(() => {
                  setShowSymbolSuggestions(false);
                }, 120);
              }}
              placeholder="BTCUSD"
              autoComplete="off"
            />
            {showSymbolSuggestions && filteredSymbols.length > 0 ? (
              <div className="symbol-suggestions" role="listbox">
                {filteredSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="symbol-suggestion-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSymbol(symbol)}
                  >
                    <SymbolWithIcon symbol={symbol} size="sm" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
          <input 
            type="date" 
            id="tradeDate" 
            value={formData.tradeDate} 
            onChange={handleInputChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tradeTime" className="required">Time</label>
          <input type="time" id="tradeTime" value={formData.tradeTime} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="quantity" className="required">Qty</label>
          <input type="text" inputMode="decimal" id="quantity" value={formData.quantity} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="entryPrice" className="required">Entry</label>
          <input type="text" inputMode="decimal" id="entryPrice" value={formData.entryPrice} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="exitPrice" className="required">Exit</label>
          <input type="text" inputMode="decimal" id="exitPrice" value={formData.exitPrice} onChange={handleInputChange}/>
        </div>

        <div className="form-group">
          <label htmlFor="manualPNL" className="required">P&L</label>
          <input type="text" inputMode="decimal" id="manualPNL" value={formData.manualPNL} onChange={handleInputChange}/>
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
              <LegacyIcon className="fas fa-cloud-upload-alt" />
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
              <LegacyIcon className="fas fa-upload" /> Choose Image
            </button>
          </div>
        ) : (
          <div className="screenshot-preview" style={{display: 'block'}}>
            <img id="previewImage" src={previewImage} alt="Screenshot Preview" />
            <button type="button" className="remove-screenshot" onClick={removeScreenshot}>
              <LegacyIcon className="fas fa-trash" /> Remove Screenshot
            </button>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="btn-group-horizontal">
        <button className="btn btn-secondary" onClick={() => navigate('/')} disabled={isSavingTrade}>
          <LegacyIcon className="fas fa-times" /> Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={submitManualTrade}
          disabled={isSavingTrade}
          aria-busy={isSavingTrade}
        >
          <LegacyIcon className={isSavingTrade ? "fas fa-spinner fa-spin" : "fas fa-plus-circle"} />
          {isSavingTrade ? 'Saving trade...' : 'Add Trade'}
        </button>
      </div>
    </div>
    </>
  );
}

export default ManualEntryForm; 
