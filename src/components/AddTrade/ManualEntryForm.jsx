import React, { useEffect, useState, useMemo, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SymbolWithIcon from "../Common/SymbolWithIcon";
import LegacyIcon from "../Common/LegacyIcon";
import CustomSelect from "../Common/CustomSelect";
import CustomTimePicker from "../Common/CustomTimePicker";
import { CalendarMonthControls } from "../Common/DateRangePicker";
import { Calendar } from "../../icons/lucideIcons";
import api from "../../utils/serve";
import { useAuth } from '../../context/AuthContext';
import { filterInstruments, useInstruments } from '../../hooks/useInstruments';
import { normalizeStoredSymbol } from "../../utils/symbols";
import { parseTradeNumber, sanitizeDecimalInput, sanitizeSignedDecimalInput } from "../../utils/fieldValidation";
import TradeSaveOverlay from './TradeSaveOverlay';

const generateTradeUniqueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const CATEGORY_FILTERS = {
  stocks: (instrument) => instrument.type === 'stock',
  crypto: (instrument) => instrument.category === 'crypto',
  forex: (instrument) => instrument.type === 'forex',
  commodities: (instrument) => instrument.type === 'commodity',
};

const SYMBOL_PLACEHOLDERS = {
  stocks: 'AAPL',
  crypto: 'BTCUSDT',
  forex: 'EURUSD',
  commodities: 'XAUUSD',
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select Category' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodities', label: 'Commodities' },
];

const TRADE_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

const parseTradeDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTradeDateValue = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatTradeDateLabel = (value) => {
  const date = parseTradeDate(value);

  if (!date) return 'Select date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const normalizeCalendarMonth = (value) => {
  const date = parseTradeDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

function TradeDateField({ value, onChange, max }) {
  const [open, setOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => normalizeCalendarMonth(value));
  const wrapperRef = useRef(null);
  const selectedDate = parseTradeDate(value);
  const maxDate = parseTradeDate(max);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="trade-single-date-field" ref={wrapperRef}>
      <button
        type="button"
        className={selectedDate ? "trade-single-date-field__trigger" : "trade-single-date-field__trigger is-placeholder"}
        onClick={() => {
          setPickerMonth(normalizeCalendarMonth(value));
          setOpen((current) => !current);
        }}
        aria-label="Trade date"
      >
        <Calendar size={14} aria-hidden="true" />
        <span>{formatTradeDateLabel(value)}</span>
      </button>

      {open ? (
        <div className="trade-single-date-field__popover">
          <CalendarMonthControls month={pickerMonth} onMonthChange={setPickerMonth} />
          <DayPicker
            mode="single"
            selected={selectedDate || undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatTradeDateValue(date));
              setOpen(false);
            }}
            month={pickerMonth}
            onMonthChange={setPickerMonth}
            disabled={maxDate ? { after: maxDate } : undefined}
            fixedWeeks
            showOutsideDays
            className="trade-rdp trade-calendar-template add-trade-date-rdp"
          />
        </div>
      ) : null}
    </div>
  );
}

function ManualEntryForm() {
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
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);
  const [showSymbolCategoryHint, setShowSymbolCategoryHint] = useState(false);
  const [saveError, setSaveError] = useState('');
  const screenshotInputRef = useRef(null);
  const symbolBlurTimeoutRef = useRef(null);
  const { data: instruments = [] } = useInstruments();
  const isSymbolEnabled = Boolean(formData.category);
  const categoryInstruments = useMemo(() => {
    const filterByCategory = CATEGORY_FILTERS[formData.category];

    if (!filterByCategory) return [];

    return instruments.filter(filterByCategory);
  }, [formData.category, instruments]);
  const filteredSymbols = useMemo(() => {
    if (!isSymbolEnabled) return [];

    return filterInstruments(categoryInstruments, formData.symbol, 8);
  }, [categoryInstruments, formData.symbol, isSymbolEnabled]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    
    if (id === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        symbol: ''
      }));
      setShowSymbolSuggestions(false);
      setShowSymbolCategoryHint(false);
    } else if (id === 'symbol') {
      if (!isSymbolEnabled) return;

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
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target.result);
      };
      reader.readAsDataURL(file);
      
    }
  };

  const removeScreenshot = () => {
    setPreviewImage('');
    setScreenshotFile(null);
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = '';
    }
  };

  const selectSymbol = (symbol) => {
    if (!isSymbolEnabled) return;

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

  const waitForTradeCommit = () => new Promise((resolve) => {
    window.setTimeout(resolve, 450);
  });

  const uploadTradeScreenshot = async (uniqueId, file) => {
    if (!uniqueId || !file) return null;

    await waitForTradeCommit();

    const uploadData = new FormData();
    uploadData.append('unique_id', uniqueId);
    uploadData.append('screenshot', file);

    const { data } = await api.post('/upload-screenshot', uploadData);

    if (!data?.success) {
      throw new Error(data?.error || 'Screenshot upload failed. Trade was saved.');
    }

    return data;
  };

  const saveTradeMutation = useMutation({
    mutationFn: async ({ tradeData, screenshot }) => {
      const { data } = await api.post('/save-trade', tradeData);
      if (!data?.success) {
        throw new Error(data?.error || 'Trade save failed. Please retry.');
      }

      const savedTrade = data.trade;
      let uploadedScreenshot = null;
      let screenshotError = '';

      if (screenshot) {
        try {
          uploadedScreenshot = await uploadTradeScreenshot(savedTrade?.unique_id, screenshot);
        } catch (error) {
          screenshotError = error?.message || 'Screenshot upload failed. Trade was saved.';
        }
      }

      return {
        trade: uploadedScreenshot?.screenshots
          ? { ...savedTrade, screenshots: uploadedScreenshot.screenshots }
          : savedTrade,
        screenshotError,
      };
    },
    onMutate: async ({ tradeData, screenshot }) => {
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
        screenshots: screenshot ? [] : null,
        user_id: user.ID,
        open_timestamp: tradeData.timestamp,
        close_timestamp: tradeData.timestamp,
      }, screenshot ? 'saving screenshot' : 'saving');

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

      const message = _error?.message || 'Trade save failed. Please retry.';
      setSaveError(message);
      alert(message);
    },
    onSuccess: ({ trade: savedTrade, screenshotError }, _tradeData, context) => {
      const realTrade = toDashboardTrade(savedTrade);
      updateTradeCaches((oldTrades) => {
        const replacedTrades = oldTrades.map((trade) => (
          trade.unique_id === context?.uniqueId ? realTrade : trade
        ));
        const hasSavedTrade = replacedTrades.some((trade) => trade.unique_id === realTrade.unique_id);
        return hasSavedTrade ? replacedTrades : [realTrade, ...replacedTrades];
      });
      removeScreenshot();
      if (screenshotError) {
        setSaveError(screenshotError);
      }
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
    const requiredFields = ['category', 'symbol', 'tradeType', 'quantity', 'entryPrice', 'exitPrice', 'tradeDate', 'tradeTime', 'manualPNL'];
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

    saveTradeMutation.mutate({ tradeData, screenshot: screenshotFile });
  };

  return (
    <>
    {saveError ? <div className="trade-save-error-toast" role="alert">{saveError}</div> : null}
    {isSavingTrade ? <TradeSaveOverlay label="Saving trade and refreshing dashboard..." /> : null}
    <div className="form-card horizontal-entry-form" aria-busy={isSavingTrade}>
      {/* Top-left Category */}
      <div className="form-group category-top">
        <label htmlFor="category">Category</label>
        <CustomSelect
          id="category"
          value={formData.category}
          onChange={handleInputChange}
          options={CATEGORY_OPTIONS}
          placeholder="Select Category"
        />
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
              onClick={() => {
                if (!isSymbolEnabled) {
                  setShowSymbolCategoryHint(true);
                }
              }}
              onFocus={() => {
                if (!isSymbolEnabled) {
                  setShowSymbolCategoryHint(true);
                  return;
                }

                if (symbolBlurTimeoutRef.current) {
                  clearTimeout(symbolBlurTimeoutRef.current);
                }
                setShowSymbolCategoryHint(false);
                setShowSymbolSuggestions(true);
              }}
              onBlur={() => {
                symbolBlurTimeoutRef.current = setTimeout(() => {
                  setShowSymbolSuggestions(false);
                  setShowSymbolCategoryHint(false);
                }, 120);
              }}
              placeholder={isSymbolEnabled ? SYMBOL_PLACEHOLDERS[formData.category] : "Click to choose symbol"}
              autoComplete="off"
              readOnly={!isSymbolEnabled}
              aria-disabled={!isSymbolEnabled}
              aria-describedby={!isSymbolEnabled ? "symbol-category-hint" : undefined}
            />
            {showSymbolCategoryHint && !isSymbolEnabled ? (
              <div className="symbol-category-hint" id="symbol-category-hint" role="status">
                Select a category first
              </div>
            ) : null}
            {showSymbolSuggestions && filteredSymbols.length > 0 ? (
              <div className="symbol-suggestions" role="listbox">
                {filteredSymbols.map((instrument) => (
                  <button
                    key={instrument.symbol}
                    type="button"
                    className="symbol-suggestion-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSymbol(instrument.symbol)}
                  >
                    <SymbolWithIcon symbol={instrument.symbol} size="sm" />
                    <span>{instrument.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tradeType" className="required">Trade Type</label>
          <CustomSelect
            id="tradeType"
            value={formData.tradeType}
            onChange={handleInputChange}
            options={TRADE_TYPE_OPTIONS}
            placeholder="Select"
          />
        </div>

        <div className="form-group">
          <label htmlFor="tradeDate" className="required">Date</label>
          <TradeDateField
            value={formData.tradeDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(nextDate) => handleInputChange({ target: { id: 'tradeDate', value: nextDate } })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tradeTime" className="required">Time</label>
          <CustomTimePicker
            id="tradeTime"
            value={formData.tradeTime}
            onChange={(nextTime) => handleInputChange({ target: { id: 'tradeTime', value: nextTime } })}
            ariaLabel="Trade time"
          />
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
              ref={screenshotInputRef}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => screenshotInputRef.current?.click()}
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
