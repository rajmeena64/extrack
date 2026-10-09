import React from 'react';
import { Button, Calendar, DropdownSelect as CustomSelect } from '@/components/ui';
import { CalendarIcon } from '@/icons';
import { jsDateToCalendarDate, calendarDateToJsDate } from '@/utils/common/dateConversions';

const formatLabel = (v) => String(v || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const formatDate = (d) => d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` : 'Select date';

export default function BrokerModal({
  selected, platformSelector, showCredentials, setShowCredentials,
  environment = 'real', setEnvironment,
  credentials = {}, setCredentials,
  year, setYear, yearOptions = [], range, setRange, RANGE_OPTIONS = [],
  fromDate, setFromDate, toDate, setToDate, openCalendar, setOpenCalendar, calendarMonth, setCalendarMonth,
  connecting = false, onConnect, syncing = false, onSync, formatBalance,
}) {
  const brokerName = selected.brokerName || 'Broker';
  const isConnected = selected.status === 'connected';
  const isOAuth = selected.integrationConfiguration?.auth_type === 'oauth' || selected.tradeMethod === 'oauth_sync';
  const fields = Array.isArray(selected.integrationConfiguration?.fields) ? selected.integrationConfiguration.fields : [];
  const instrumentTypes = Array.isArray(selected.supportedInstrumentTypes) ? selected.supportedInstrumentTypes : [];
  const supportedMethods = Array.isArray(selected.supportedTradeMethods) ? selected.supportedTradeMethods : [];
  const today = new Date(), todayCalDate = jsDateToCalendarDate(today);
  const isSubmitDisabled = connecting || (!isOAuth && fields.some((f) => f.required && !String(credentials[f.key] || '').trim()));

  const renderDateField = (type) => {
    const isFrom = type === 'from', val = isFrom ? fromDate : toDate;
    return (
      <div className="relative flex flex-col gap-1.5" key={type}>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{isFrom ? 'From date' : 'To date'}</span>
        <button type="button" className="w-full min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] text-left hover:border-brand-solid shadow-xs flex items-center gap-2" aria-expanded={openCalendar === type} onClick={() => { setCalendarMonth?.(jsDateToCalendarDate(val || new Date())); setOpenCalendar?.((o) => o === type ? null : type); }}>
          <CalendarIcon size={15} className="text-[var(--text-muted)] shrink-0" />
          <span>{formatDate(val)}</span>
        </button>
        {openCalendar === type && (
          <div className="absolute z-30 top-[calc(100%+6px)] left-0 w-[280px] max-w-[calc(100vw-48px)] p-2 rounded-2xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shadow-xl">
            <Calendar value={jsDateToCalendarDate(val)} onChange={(c) => { (isFrom ? setFromDate : setToDate)?.(calendarDateToJsDate(c)); setOpenCalendar?.(null); }} focusedValue={calendarMonth} onFocusChange={setCalendarMonth} minValue={isFrom ? undefined : (fromDate ? jsDateToCalendarDate(fromDate) : undefined)} maxValue={isFrom ? jsDateToCalendarDate(toDate || today) : todayCalDate}><span /></Calendar>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-6 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-wrap">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center size-11 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
            {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : String(brokerName).slice(0, 2).toUpperCase()}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--text-muted)]">{brokerName}{selected.accountEnvironment ? ` · ${selected.accountEnvironment}` : ''} account</span>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-base font-bold text-[var(--heading)]">{selected.accountName || brokerName}</strong>
              {isConnected && selected.accountBalance !== undefined && (
                <span className="text-xs text-[var(--text-secondary)]">Balance <b className="text-[var(--heading)]">{formatBalance ? formatBalance(selected.accountBalance, selected.accountCurrency) : `${selected.accountBalance} ${selected.accountCurrency || ''}`}</b></span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${isConnected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`} role="status">
            <i className={`size-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
            {isConnected ? 'Connected' : 'Connection required'}
          </span>
          {isConnected && !showCredentials && !isOAuth && <Button color="secondary" size="sm" onClick={() => setShowCredentials?.(true)}>Update access</Button>}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start">
        {isConnected && !showCredentials ? (
          <form className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={onSync}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Sync method</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">Import trade history</h3>
            </div>
            {selected.tradeMethod === 'api_sync' ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Year</span>
                <CustomSelect ariaLabel="History year" value={year} onChange={(e) => setYear?.(e.target.value)} options={yearOptions} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Date range</span>
                  <CustomSelect ariaLabel="Sync date range" value={range} onChange={(e) => setRange?.(e.target.value)} options={RANGE_OPTIONS} />
                </div>
                {range === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{renderDateField('from')}{renderDateField('to')}</div>}
              </div>
            )}
            <Button color="primary" size="md" type="submit" isDisabled={syncing} isLoading={syncing}>
              {syncing ? 'Syncing...' : 'Sync trades'}
            </Button>
          </form>
        ) : (
          <form className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]" onSubmit={onConnect}>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Connection setup</span>
              <h3 className="text-base font-bold text-[var(--heading)] m-0">{isConnected ? `Update ${brokerName} access` : `Connect ${brokerName}`}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0 leading-relaxed">
                {isOAuth ? `Click connect to authorize your ${brokerName} account securely via OAuth.` : 'Provide read-only credentials for automatic live trade synchronization.'}
              </p>
            </div>
            {platformSelector}
            {!isOAuth && selected.tradeMethod !== 'terminal_sync' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Account type</span>
                <CustomSelect ariaLabel="Account type" value={environment} onChange={(e) => setEnvironment?.(e.target.value)} disabled={isConnected} options={[{ value: 'real', label: 'Real Account' }, { value: 'demo', label: 'Demo Account' }]} />
              </div>
            )}
            {!isOAuth && fields.map((f) => (
              <label className="flex flex-col gap-1" key={f.key}>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{f.label}</span>
                <input
                  className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-solid shadow-xs"
                  type={f.type || 'text'}
                  value={credentials[f.key] || ''}
                  onChange={(e) => setCredentials?.((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  autoComplete="off"
                  spellCheck="false"
                  required={f.required}
                />
              </label>
            ))}
            <div className="flex items-center gap-2 pt-2">
              {isConnected && <Button color="secondary" size="md" className="flex-1" onClick={() => setShowCredentials?.(false)}>Cancel</Button>}
              <Button color="primary" size="md" className="flex-1" type="submit" isDisabled={isSubmitDisabled} isLoading={connecting}>
                {connecting ? 'Connecting...' : isConnected ? 'Update access' : isOAuth ? `Connect with ${brokerName}` : 'Connect'}
              </Button>
            </div>
          </form>
        )}

        <section className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)]">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--divider-strong)]">
            <span className="flex items-center justify-center size-10 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shrink-0 overflow-hidden text-xs font-bold text-[var(--text-secondary)]" aria-hidden="true">
              {selected.brokerLogoPath ? <img src={selected.brokerLogoPath} alt="" className="size-6 object-contain" /> : String(brokerName).slice(0, 2).toUpperCase()}
            </span>
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">{brokerName} connection</span>
              <h3 className="text-sm font-bold text-[var(--heading)] m-0 truncate">Security & permissions</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Read-only</span>
          </div>
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)]">
            <strong className="text-xs font-bold text-[var(--heading)]">Security & flexibility</strong>
            <ul className="m-0 pl-4 text-xs text-[var(--text-secondary)] leading-relaxed flex flex-col gap-1">
              <li>API connection is optional — only required for automatic live trade sync.</li>
              <li>You can upload trade export files or add trades manually anytime without connecting API credentials.</li>
              <li>Trading, transfers and withdrawals remain strictly disabled.</li>
            </ul>
          </div>
          {instrumentTypes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Available markets</span>
              <div className="flex flex-wrap gap-1.5">
                {instrumentTypes.map((t) => (
                  <span key={t} className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">{formatLabel(t)}</span>
                ))}
              </div>
            </div>
          )}
          {supportedMethods.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[var(--text-secondary)]">Other ways to add trades</span>
              <div className="flex flex-wrap gap-1.5">
                {supportedMethods.map((m) => (
                  <span key={m} className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-lg bg-[var(--bg-card)] text-[11px] font-semibold text-[var(--text-secondary)]">{formatLabel(m)}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
