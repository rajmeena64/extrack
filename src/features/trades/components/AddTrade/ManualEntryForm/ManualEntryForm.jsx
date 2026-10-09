import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/utils/common/serve';
import { useAuth } from '@/context/AuthContext';
import { useAppDialog } from '@/context/AppDialogContext';
import { loadCachedUserSettings } from '@/utils/user/userSettings';
import { normalizeStoredSymbol, normalizeOptionContractInput, parseOptionContractSymbol } from '@/utils/trading/symbols';
import { useInstruments } from '@/hooks/useInstruments';
import { BROWSER_TIME_ZONE, TIME_ZONE_OPTIONS, parseDateTimeInZone } from '@/utils/trading/tradeTime';
import { CalendarIcon, Globe, Plus, Trash2 } from '@/icons';
import { getCurrencyMeta, normalizeCurrencyCode } from '@/utils/user/Currency';
import { DropdownSelect as CustomSelect, Button, Calendar, CustomTimePicker } from '@/components/ui';
import { jsDateToCalendarDate, calendarDateToJsDate } from '@/utils/common/dateConversions';
import TradeSaveOverlay from '../TradeSaveOverlay/TradeSaveOverlay';

const PRODUCTS = [['stock', 'Stock / ETF'], ['forex_cfd', 'Forex & CFD'], ['crypto', 'Crypto'], ['futures', 'Future'], ['options', 'Option'], ['bond', 'Bond']];
const SIDE_OPTIONS = [{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }];
const OPTION_SIDE_OPTIONS = [{ value: 'long:call', label: 'Long Call' }, { value: 'short:call', label: 'Short Call' }, { value: 'long:put', label: 'Long Put' }, { value: 'short:put', label: 'Short Put' }];
const CANONICAL_PRODUCT = { stock: 'equity', crypto_spot: 'spot', futures: 'future', options: 'option' };
const REGISTRY_FILTERS = { forex_cfd: { category: 'forex_cfd' }, crypto: { category: 'crypto' }, futures: { category: 'future' } };
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const initial = { productType: 'stock', symbol: '', side: 'long', entryPrice: '', exitPrice: '', quantity: '', closedQuantity: '', entryTime: nowLocal(), exitTime: '', optionType: 'call', strikePrice: '', expiryDate: '', entryPremium: '', exitPremium: '', multiplier: '', entryFees: '', exitFees: '', actualNetPnl: '', strategy: '', notes: '' };
const PRODUCT_FIELDS = ['symbol', 'entryPrice', 'exitPrice', 'exitTime', 'closedQuantity', 'multiplier', 'optionType', 'strikePrice', 'expiryDate', 'entryPremium', 'exitPremium', 'entryFees', 'exitFees'];
const number = (v, fb = 0) => v === '' || v == null ? fb : Number(v);
const cleanNumber = (v) => v === undefined || v === null || v === '' ? '' : (Number.isFinite(Number(v)) ? String(Number(v)) : String(v));
const hasValue = (v) => v !== '' && v !== null && v !== undefined;
const toLocalDate = (v) => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; };
const toLocalDateTime = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

function previewPnl(form, productType, contractSize) {
  const entry = number(form.productType === 'options' ? form.entryPremium : form.entryPrice);
  const exit = number(form.productType === 'options' ? form.exitPremium : form.exitPrice);
  if (!form.quantity || !form.entryTime || !form.exitTime || !Number.isFinite(entry) || !Number.isFinite(exit)) return null;
  const totalQty = number(form.quantity), closedQtyInput = hasValue(form.closedQuantity) ? number(form.closedQuantity) : totalQty;
  const closedQty = Math.min(totalQty, Math.max(0, closedQtyInput));
  const mult = number(form.multiplier || contractSize, 1);
  const gross = (exit - entry) * (form.side === 'long' ? 1 : -1) * (closedQty > 0 ? closedQty : totalQty) * (['forex', 'cfd', 'future', 'perpetual', 'option'].includes(productType) ? mult : 1);
  const fee = Math.abs(number(form.entryFees)) + Math.abs(number(form.exitFees));
  return { gross, fee, net: form.actualNetPnl === '' ? gross - fee : number(form.actualNetPnl) };
}

function Field({ label, name, value, onChange, type = 'number', required = false, readOnly = false, children, help, placeholder }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0 text-left">
      <span className="text-[11px] font-bold text-[var(--heading)]">{label}{required ? <span className="text-rose-500"> *</span> : ''}</span>
      {children || <input className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-solid shadow-xs transition-colors read-only:opacity-70 read-only:cursor-not-allowed" name={name} value={value} onChange={onChange} type={type} step={type === 'number' ? 'any' : undefined} placeholder={placeholder} required={required} readOnly={readOnly} />}
      {help ? <small className="text-[10px] text-[var(--text-muted)] leading-tight">{help}</small> : null}
    </label>
  );
}

function DateTimePicker({ label, name, value, onChange, required = false, dateOnly = false }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef(null);
  const selected = toLocalDate(value);
  const [focusedCalendarValue, setFocusedCalendarValue] = useState(jsDateToCalendarDate(selected || new Date()));

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (!open || !rootRef.current) return undefined;
    const checkAlignment = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const popupWidth = dateOnly ? 320 : 540;
      setAlignRight(rect.left + popupWidth > window.innerWidth - 16 || rect.left > window.innerWidth / 2);
    };
    checkAlignment();
    window.addEventListener('resize', checkAlignment);
    return () => window.removeEventListener('resize', checkAlignment);
  }, [open, dateOnly]);

  const update = (date) => onChange({ target: { name, value: dateOnly ? format(date, 'yyyy-MM-dd') : toLocalDateTime(date) } });
  const selectDate = (calDate) => {
    if (!calDate) return;
    const d = calendarDateToJsDate(calDate), c = selected || new Date();
    c.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    update(c);
    setFocusedCalendarValue(calDate);
  };
  const updateTime = (val) => {
    const [h, m] = val.split(':').map(Number), c = selected || new Date();
    c.setHours(h, m, 0, 0);
    update(c);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 min-w-0 text-left">
      <span className="text-[11px] font-bold text-[var(--heading)]">{label}{required ? <span className="text-rose-500"> *</span> : ''}</span>
      <button type="button" className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] hover:border-brand-solid focus:outline-none focus:border-brand-solid shadow-xs transition-colors text-left flex items-center justify-between gap-2 cursor-pointer" onClick={() => { setFocusedCalendarValue(jsDateToCalendarDate(selected || new Date())); setOpen((c) => !c); }} aria-expanded={open}>
        <span className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={15} className="text-[var(--text-muted)] shrink-0" />
          {selected && !dateOnly ? (
            <span className="flex items-center justify-between gap-2 w-full truncate"><span>{format(selected, 'dd/MM/yyyy')}</span><span className="text-[var(--text-muted)] font-normal">{format(selected, 'HH:mm')}</span></span>
          ) : selected ? (
            <span className="truncate">{format(selected, 'dd/MM/yyyy')}</span>
          ) : (
            <span className="text-[var(--text-muted)] truncate">{dateOnly ? 'Select date' : 'Select date & time'}</span>
          )}
        </span>
      </button>
      {open ? (
        <div className={`absolute top-[calc(100%+8px)] z-40 p-3 rounded-2xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shadow-xl ${alignRight ? 'right-0' : 'left-0'} ${dateOnly ? 'w-[320px]' : 'w-[min(calc(100vw-32px),540px)] sm:w-[540px] flex flex-col sm:flex-row gap-4'}`}>
          <div className="flex flex-col items-center shrink-0">
            <Calendar value={jsDateToCalendarDate(selected)} onChange={selectDate} focusedValue={focusedCalendarValue} onFocusChange={setFocusedCalendarValue} />
          </div>
          {!dateOnly ? (
            <div className="border-t sm:border-t-0 sm:border-l border-[var(--divider-strong)] pt-3 sm:pt-0 sm:pl-4 flex-1 min-w-[200px] flex flex-col">
              <CustomTimePicker inline value={selected ? format(selected, 'HH:mm') : format(new Date(), 'HH:mm')} onChange={updateTime} ariaLabel={`${label} time`} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InstrumentCombobox({ setForm, selected, setSelected, filters }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { data: instruments = [], isFetching } = useInstruments(search, filters);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (instrument) => {
    setSelected(instrument);
    setSearch(instrument.symbol);
    setForm((curr) => ({ ...curr, symbol: instrument.symbol, multiplier: cleanNumber(instrument.contractSize) }));
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setSearch(val);
    const match = instruments.find((i) => i.symbol.toUpperCase() === val);
    setSelected(match || null);
    setForm((curr) => ({ ...curr, symbol: val, multiplier: match ? cleanNumber(match.contractSize) : curr.multiplier || '' }));
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5 min-w-0 text-left">
      <span className="text-[11px] font-bold text-[var(--heading)]">Symbol <span className="text-rose-500">*</span></span>
      <input className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-solid shadow-xs transition-colors" role="combobox" aria-expanded={open} aria-controls="instrument-options" aria-autocomplete="list" value={search} placeholder="e.g. AAPL or BTCUSDT" autoComplete="off" onFocus={() => setOpen(true)} onChange={handleInputChange} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} required={!selected} />
      {open ? (
        <div id="instrument-options" className="absolute top-[calc(100%+6px)] left-0 z-30 w-full max-h-60 overflow-y-auto rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shadow-xl divide-y divide-[var(--divider-strong)]" role="listbox">
          {instruments.map((inst) => (
            <button key={inst.id} type="button" role="option" aria-selected={selected?.id === inst.id} className="w-full p-2.5 text-left flex flex-col gap-0.5 hover:bg-[var(--surface-subtle)] focus:outline-none focus:bg-[var(--surface-subtle)] transition-colors cursor-pointer" onClick={() => choose(inst)}>
              <strong className="text-xs font-bold text-[var(--heading)]">{inst.symbol.toUpperCase()}</strong>
              <span className="text-[10px] text-[var(--text-muted)] truncate">{inst.displayName}</span>
            </button>
          ))}
          {isFetching ? <p className="p-3 text-xs text-[var(--text-muted)] text-center m-0">Searching instruments…</p> : null}
          {!isFetching && instruments.length === 0 ? <p className="p-3 text-xs text-[var(--text-muted)] text-center m-0">No matching instruments found.</p> : null}
        </div>
      ) : null}
      {selected ? <small className="text-[10px] text-[var(--text-muted)] truncate">{selected.displayName}</small> : null}
    </div>
  );
}

export default function ManualEntryForm({ brokers = [], selectedBrokerId, setSelectedBrokerId, brokerConnectionId, currencyCode, _onCurrencyChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screenshotRef = useRef();
  const { notify } = useAppDialog();
  const cachedPreferences = useMemo(() => loadCachedUserSettings()?.preferences || {}, []);
  const activeCurrency = normalizeCurrencyCode(currencyCode);
  const [tradeTimeZone, setTradeTimeZone] = useState(cachedPreferences.timeZone || BROWSER_TIME_ZONE);
  const selectedCurrencyMeta = useMemo(() => getCurrencyMeta(activeCurrency), [activeCurrency]);
  const [form, setForm] = useState(initial);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [optional, setOptional] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState('');
  const [failedLogoPath, setFailedLogoPath] = useState(null);
  const selectedBroker = brokers.find((b) => b.id === selectedBrokerId);
  const parsedOption = useMemo(() => form.productType === 'options' ? parseOptionContractSymbol(form.symbol) : null, [form.productType, form.symbol]);
  const hasBrokerLogo = Boolean(selectedBroker?.logoPath && failedLogoPath !== selectedBroker.logoPath);
  const registryFilters = REGISTRY_FILTERS[form.productType];
  const effectiveProductType = CANONICAL_PRODUCT[selectedInstrument?.productType || form.productType] || selectedInstrument?.productType || form.productType;
  const hasExit = showExit && Boolean(form.exitTime);
  const exitValue = form.productType === 'options' ? form.exitPremium : form.exitPrice;
  const preview = useMemo(() => previewPnl(form, effectiveProductType, selectedInstrument?.contractSize), [form, effectiveProductType, selectedInstrument?.contractSize]);

  const change = (e) => setForm((curr) => ({ ...curr, [e.target.name]: e.target.value }));
  const changeSymbol = (e) => setForm((curr) => ({ ...curr, symbol: e.target.value.toUpperCase() }));
  const changePosition = (e) => setForm((curr) => { const [side, optionType = curr.optionType] = e.target.value.split(':'); return { ...curr, side, optionType }; });
  const changeBroker = (e) => setSelectedBrokerId(brokers.find((b) => String(b.id) === e.target.value)?.id ?? null);
  const changeTimeZone = (e) => setTradeTimeZone(e.target.value);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/trades', payload);
      if (!data?.success) throw new Error(data?.error || 'Trade save failed');
      if (screenshot) {
        const body = new FormData();
        body.append('unique_id', payload.unique_id);
        body.append('screenshot', screenshot);
        await api.post('/upload-screenshot', body);
      }
      return data;
    },
    onSuccess: (data, payload) => {
      const saved = data?.trade;
      queryClient.invalidateQueries({ queryKey: ['trades', user?.ID] });
      notify('Trade saved successfully', 'success');
      navigate(`/trade/${saved?.unique_id || payload.unique_id}`, { state: { tradeData: saved || payload } });
    },
    onError: (e) => {
      const msg = e?.response?.data?.error || 'Trade could not be saved';
      setError(msg);
      notify(msg, 'error');
    },
  });

  const failValidation = (msg) => { setError(msg); notify(msg, 'error'); };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!user?.ID) return navigate('/login');
    if (!brokerConnectionId) return failValidation('Choose a trading account.');
    if (registryFilters && !selectedInstrument) return failValidation('Select an instrument from the suggestions.');
    if (hasExit !== hasValue(exitValue)) return failValidation('Enter both exit price and exit date, or leave both blank for an open trade.');
    const entryDate = parseDateTimeInZone(form.entryTime, tradeTimeZone);
    const exitDate = hasExit ? parseDateTimeInZone(form.exitTime, tradeTimeZone) : null;
    if (!entryDate) return failValidation('Enter a valid entry date and time.');
    if (hasExit && (!exitDate || exitDate < entryDate)) return failValidation('Exit time cannot be before entry time.');
    const optionContract = form.productType === 'options' ? parseOptionContractSymbol(form.symbol) : null;
    const symbol = form.productType === 'options' ? (optionContract?.symbol || normalizeOptionContractInput(form.symbol)) : normalizeStoredSymbol(form.symbol);
    if (!symbol) return failValidation('Enter a valid symbol.');
    const optionDetails = form.productType === 'options' ? {
      underlyingSymbol: optionContract?.underlyingSymbol || symbol, optionType: optionContract?.optionType || form.optionType,
      strikePrice: optionContract?.strikePrice || form.strikePrice, expiryDate: optionContract?.expiryDate || form.expiryDate,
      lotSize: number(form.multiplier, 1), contractMultiplier: number(form.multiplier, 1),
    } : undefined;
    const entryPrice = number(form.productType === 'options' ? form.entryPremium : form.entryPrice);
    const exitPrice = hasExit ? number(exitValue) : null;
    const totalQty = number(form.quantity);
    if (!totalQty || totalQty <= 0) return failValidation('Entry quantity must be greater than zero.');
    if (!entryPrice || entryPrice <= 0) return failValidation('Entry price must be greater than zero.');
    if (hasExit && (exitPrice === null || exitPrice < 0)) return failValidation('Exit price must be zero or greater.');
    const closedQtyInput = hasValue(form.closedQuantity) ? number(form.closedQuantity) : (hasExit ? totalQty : 0);
    const closedQty = Math.min(totalQty, Math.max(0, closedQtyInput));
    const isPartial = hasExit && closedQty > 0 && closedQty < totalQty;

    mutation.mutate({
      unique_id: crypto.randomUUID?.() || `manual-${Date.now()}`,
      broker_connection_id: brokerConnectionId, instrument_id: selectedInstrument?.id,
      product_type: effectiveProductType, symbol: selectedInstrument?.symbol || symbol,
      side: form.side, status: isPartial ? 'partially_closed' : (hasExit ? 'closed' : 'open'),
      close_reason: hasExit ? 'manual_close' : null, category: selectedInstrument?.category || form.productType,
      quantity: totalQty, closed_quantity: closedQty,
      quantity_unit: selectedInstrument?.quantityType || (form.productType === 'options' ? 'contracts' : 'units'),
      entry_price: entryPrice, exit_price: exitPrice, entry_timestamp: entryDate.toISOString(),
      exit_timestamp: exitDate ? exitDate.toISOString() : null, currency: activeCurrency, pnl_currency: activeCurrency,
      option_details: optionDetails,
      market_details: ['forex', 'cfd'].includes(effectiveProductType) ? { contractSize: form.multiplier || selectedInstrument?.contractSize || null } : ['future', 'perpetual'].includes(effectiveProductType) ? { pnlMultiplier: form.multiplier || selectedInstrument?.contractSize || null } : {},
      charges: (() => { const total = Math.abs(number(form.entryFees, 0)) + Math.abs(number(form.exitFees, 0)); return total > 0 ? { otherFees: -total } : {}; })(),
      actual_net_pnl: form.actualNetPnl === '' ? null : number(form.actualNetPnl),
      strategy: form.strategy, notes: form.notes, attachments: [],
    });
  };

  const multiplierOptional = form.productType === 'options' || (['forex', 'cfd', 'future', 'perpetual'].includes(effectiveProductType) && !selectedInstrument?.contractSize && form.productType !== 'forex_cfd');
  const positionValue = form.productType === 'options' ? `${form.side}:${parsedOption?.optionType || form.optionType}` : form.side;
  const positionOptions = parsedOption ? OPTION_SIDE_OPTIONS.filter((opt) => opt.value.endsWith(`:${parsedOption.optionType}`)) : OPTION_SIDE_OPTIONS;

  return (
    <form className="flex flex-col gap-5 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs" onSubmit={submit}>
      {mutation.isPending ? <TradeSaveOverlay label="Saving trade..." /> : null}
      {error ? <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold" role="alert">{error}</div> : null}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-[var(--divider-strong)]">
        <CustomSelect
          name="manualBroker" className="w-full sm:w-auto min-w-[240px]" size="sm" value={selectedBrokerId ?? ''} onChange={changeBroker}
          options={brokers.map((b) => {
            const hasDistinctName = b.accountName && b.name && b.accountName !== b.name;
            const displayLabel = hasDistinctName ? `${b.accountName} (${b.name})` : (b.accountName ? b.accountName : b.name);
            return { value: b.id, label: displayLabel, avatarUrl: b.logoPath };
          })}
          placeholder="Choose an account"
          triggerText={selectedBroker ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center size-6 rounded-lg border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-bold text-[var(--text-secondary)]" aria-hidden="true">
                {hasBrokerLogo ? <img src={selectedBroker.logoPath} alt="" className="size-3.5 object-contain" onError={() => setFailedLogoPath(selectedBroker.logoPath)} /> : String(selectedBroker.name || 'Account').slice(0, 2).toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5 min-w-0 text-left">
                <strong className="text-xs font-bold text-[var(--heading)] truncate">{selectedBroker.accountName ? selectedBroker.accountName : selectedBroker.name}</strong>
                {selectedBroker.accountName && selectedBroker.name && selectedBroker.accountName !== selectedBroker.name ? <small className="text-[10px] text-[var(--text-muted)] truncate">({selectedBroker.name})</small> : null}
              </span>
            </div>
          ) : undefined}
          ariaLabel="Choose trading account" disabled={mutation.isPending || brokers.length === 0}
        />
        <CustomSelect
          name="tradeTimeZone" className="w-full sm:w-auto min-w-[200px]" size="sm" value={tradeTimeZone} onChange={changeTimeZone} options={TIME_ZONE_OPTIONS}
          triggerText={
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-brand-solid shrink-0" aria-hidden="true" />
              <div className="flex flex-col text-left">
                <small className="text-[9px] text-[var(--text-muted)] leading-none">Timezone</small>
                <strong className="text-xs font-bold text-[var(--heading)] leading-tight truncate">{TIME_ZONE_OPTIONS.find((opt) => opt.value === tradeTimeZone)?.label || tradeTimeZone}</strong>
              </div>
            </div>
          }
          ariaLabel="Trade timezone"
        />
      </div>

      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2 m-0 p-0 border-0">
          <legend className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-1">Product Type <span className="text-rose-500">*</span></legend>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRODUCTS.map(([val, lbl]) => (
              <button key={val} type="button" className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${form.productType === val ? 'bg-brand-solid text-white shadow-xs' : 'border border-[var(--divider-strong)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--heading)] hover:border-brand-solid'}`} aria-pressed={form.productType === val} onClick={() => { setForm((curr) => ({ ...curr, productType: val, ...Object.fromEntries(PRODUCT_FIELDS.map((k) => [k, initial[k]])) })); setSelectedInstrument(null); }}>
                {lbl}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 m-0 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <legend className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-1">Entry Details</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {form.productType === 'options' ? (
              <Field label="Contract Symbol" name="symbol" value={form.symbol} onChange={changeSymbol} type="text" placeholder="BTC-260724-65000-C" required help="Format: ASSET-YYMMDD-STRIKE-C/P" />
            ) : registryFilters ? (
              <InstrumentCombobox key={form.productType} filters={registryFilters} setForm={setForm} selected={selectedInstrument} setSelected={setSelectedInstrument} />
            ) : (
              <Field label="Symbol" name="symbol" value={form.symbol} onChange={changeSymbol} type="text" placeholder="e.g. AAPL or BTCUSDT" required />
            )}
            <Field label="Position" required>
              <CustomSelect name="position" value={positionValue} onChange={changePosition} options={form.productType === 'options' ? positionOptions : SIDE_OPTIONS} ariaLabel="Trade position" />
            </Field>
            {form.productType === 'options' ? (
              <>
                <Field label="Strike Price" name="strikePrice" value={parsedOption?.strikePrice || form.strikePrice} onChange={change} readOnly={Boolean(parsedOption)} required />
                {parsedOption ? (
                  <Field label="Expiry Date" value={format(toLocalDate(parsedOption.expiryDate), 'dd/MM/yyyy')} type="text" readOnly required />
                ) : (
                  <DateTimePicker label="Expiry Date" name="expiryDate" value={form.expiryDate} onChange={change} required dateOnly />
                )}
                <Field label="Entry Premium" name="entryPremium" value={form.entryPremium} onChange={change} required />
              </>
            ) : (
              <Field label="Entry Price" name="entryPrice" value={form.entryPrice} onChange={change} required />
            )}
            <Field label={form.productType === 'options' ? 'Contracts' : 'Quantity'} name="quantity" value={form.quantity} onChange={change} required />
            {form.productType === 'forex_cfd' ? <Field label="Contract Size" name="multiplier" value={form.multiplier} onChange={change} type="number" placeholder="e.g. 100000" help="Standard contract size. You can customize if needed." /> : null}
            <DateTimePicker label="Entry Date & Time" name="entryTime" value={form.entryTime} onChange={change} required />
            <Field label={`Entry Fees (${selectedCurrencyMeta.symbol})`} name="entryFees" value={form.entryFees} onChange={change} placeholder="0" help="Brokerage / commission on entry." />
          </div>
        </fieldset>

        {!showExit ? (
          <div className="flex justify-start">
            <Button color="secondary" size="sm" onClick={() => { setShowExit(true); setForm((curr) => ({ ...curr, exitTime: curr.entryTime || nowLocal() })); }} iconLeading={<Plus size={15} />}>
              Fill Exit Details
            </Button>
          </div>
        ) : (
          <fieldset className="flex flex-col gap-3 m-0 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
            <legend className="flex items-center justify-between gap-2 w-full text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] px-1">
              <span>Exit Execution</span>
              <Button color="tertiary-destructive" size="xs" title="Remove exit execution" aria-label="Remove exit execution" onClick={() => { setShowExit(false); setForm((curr) => ({ ...curr, exitPrice: '', exitPremium: '', exitTime: '', closedQuantity: '' })); }} iconLeading={<Trash2 size={14} />} />
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              <Field label={form.productType === 'options' ? 'Exit Premium' : 'Exit Price'} name={form.productType === 'options' ? 'exitPremium' : 'exitPrice'} value={exitValue} onChange={change} />
              <DateTimePicker label="Exit Date & Time" name="exitTime" value={form.exitTime} onChange={change} />
              <Field label={form.productType === 'options' ? 'Contracts Closed' : 'Lots / Qty Closed'} name="closedQuantity" value={form.closedQuantity} onChange={change} placeholder={form.quantity ? `All (${form.quantity})` : 'All'} help="Optional: Qty closed if partial exit." />
              <Field label={`Exit Fees (${selectedCurrencyMeta.symbol})`} name="exitFees" value={form.exitFees} onChange={change} placeholder="0" help="Brokerage / commission on exit." />
            </div>
          </fieldset>
        )}
      </div>

      <div className="flex justify-start w-full">
        <Button color="tertiary" size="sm" onClick={() => setOptional((v) => !v)} aria-expanded={optional}>
          {optional ? '− Hide Optional Details' : '+ Add Optional Details'}
        </Button>
      </div>

      {optional ? (
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {multiplierOptional ? <Field label="Contract Multiplier" name="multiplier" value={form.multiplier} onChange={change} help="Only needed when the selected instrument has no standard multiplier." /> : null}
            <Field label={`Actual Net PnL (${selectedCurrencyMeta.symbol})`} name="actualNetPnl" value={form.actualNetPnl} onChange={change} />
            <Field label="Strategy" name="strategy" value={form.strategy} onChange={change} type="text" />
            <Field label="Notes" name="notes" value={form.notes} onChange={change} type="text" />
            <label className="flex flex-col gap-1.5 min-w-0 text-left">
              <span className="text-[11px] font-bold text-[var(--heading)]">Screenshot</span>
              <input ref={screenshotRef} type="file" accept="image/*" className="w-full text-xs text-[var(--text-secondary)] file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[var(--divider-strong)] file:bg-[var(--bg-card)] file:text-xs file:font-semibold file:text-[var(--heading)] cursor-pointer" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
      ) : null}

      {preview ? (
        <section className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)]" aria-live="polite">
          <div className="flex flex-col gap-0.5"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Gross PnL</span><strong className="text-sm font-bold text-[var(--heading)]">{preview.gross.toFixed(2)}</strong></div>
          <div className="flex flex-col gap-0.5"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Fees</span><strong className="text-sm font-bold text-[var(--heading)]">{preview.fee.toFixed(2)}</strong></div>
          <div className="flex flex-col gap-0.5"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">Net PnL</span><strong className={`text-sm font-bold ${preview.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{preview.net.toFixed(2)}</strong></div>
        </section>
      ) : null}

      <div className="flex justify-end w-full pt-2">
        <Button color="primary" size="md" isDisabled={mutation.isPending || !brokerConnectionId} isLoading={mutation.isPending} type="submit">
          {mutation.isPending ? 'Saving…' : 'Add Trade'}
        </Button>
      </div>
    </form>
  );
}
