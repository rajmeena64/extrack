import React, { useEffect, useState } from 'react';
import ManualEntryForm from '../ManualEntryForm/ManualEntryForm';
import FileUploadForm from '../FileUploadForm/FileUploadForm';
import api from '@/utils/common/serve';
import { useAppDialog } from '@/context/AppDialogContext';
import { Button } from "@/components/ui";

function BrokerMark({ broker, className = '' }) {
  const [failedLogoPath, setFailedLogoPath] = useState(null);
  const hasLogo = Boolean(broker.logoPath && failedLogoPath !== broker.logoPath);
  return (
    <span className={`flex items-center justify-center size-9 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-black text-[var(--text-secondary)] ${className}`} aria-hidden="true">
      {hasLogo ? <img src={broker.logoPath} alt="" className="size-5 object-contain" loading="lazy" onError={() => setFailedLogoPath(broker.logoPath)} /> : <span>{broker.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

const connectionToBroker = (c) => ({
  id: c.id, brokerConnectionId: c.id, accountName: c.accountName, catalogId: c.brokerId,
  name: c.brokerName, slug: c.brokerSlug, logoPath: c.brokerLogoPath, tradeMethod: c.tradeMethod,
  status: c.status, metadata: c.metadata,
});

export default function ManualTradeForm({ fileData, setFileData, entryMode = 'accounts', brokers, selectedBrokerId, setSelectedBrokerId, setBrokers, onOpenEntryMethods, onOpenManualEntry, currencyCode, onCurrencyChange }) {
  const { confirm, notify, prompt: requestInput } = useAppDialog();
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [brokerCatalog, setBrokerCatalog] = useState([]);
  const [brokerSearch, setBrokerSearch] = useState('');
  const [debouncedBrokerSearch, setDebouncedBrokerSearch] = useState('');
  const [selectedCatalogBrokerId, setSelectedCatalogBrokerId] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [openAccountMenuId, setOpenAccountMenuId] = useState(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState('');

  useEffect(() => {
    if (entryMode !== 'accounts') return undefined;
    let active = true;
    const callbackStatus = new URLSearchParams(window.location.search).get('oauth') || new URLSearchParams(window.location.search).get('ctrader');
    if (callbackStatus) {
      notify(callbackStatus === 'connected' ? 'Account connected' : callbackStatus === 'cancelled' ? 'Connection cancelled' : 'Connection failed', callbackStatus === 'connected' ? 'success' : callbackStatus === 'cancelled' ? 'warning' : 'error');
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('oauth');
      cleanUrl.searchParams.delete('ctrader');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
    api.get('/broker-connections')
      .then(({ data }) => {
        if (!active) return;
        const saved = (Array.isArray(data?.connections) ? data.connections : []).map(connectionToBroker);
        setBrokers(saved);
        setSelectedBrokerId((curr) => saved.some((b) => b.id === curr) ? curr : saved[0]?.id ?? null);
      })
      .catch(() => { if (active) setAccountMessage('Could not load saved accounts'); });
    return () => { active = false; };
  }, [entryMode, notify, setBrokers, setSelectedBrokerId]);

  useEffect(() => {
    if (openAccountMenuId === null) return undefined;
    const close = (e) => { if (!e.target.closest('.manual-account-menu-wrap')) setOpenAccountMenuId(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [openAccountMenuId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedBrokerSearch(brokerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [brokerSearch]);

  useEffect(() => {
    let active = true;
    api.get('/brokers', { params: { search: debouncedBrokerSearch || undefined, popular: debouncedBrokerSearch ? undefined : true, limit: debouncedBrokerSearch ? 50 : 8 } })
      .then(({ data }) => { if (active) setBrokerCatalog(Array.isArray(data?.brokers) ? data.brokers : []); })
      .catch(() => { if (active) setCatalogError('Broker list could not be loaded.'); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [debouncedBrokerSearch]);

  const matchingCatalogBrokers = brokerCatalog.filter((b) => !brokerSearch.trim() || b.name.toLowerCase().includes(brokerSearch.trim().toLowerCase()) || String(b.providerType || '').toLowerCase().includes(brokerSearch.trim().toLowerCase()));
  const selectedCatalogBroker = brokerCatalog.find((b) => b.id === selectedCatalogBrokerId);

  const addBroker = async (e) => {
    e.preventDefault();
    const account = accountName.trim();
    if (!selectedCatalogBroker || !account) return;
    setAccountBusy(true);
    setAccountMessage('');
    try {
      const { data: intData } = await api.get(`/brokers/${selectedCatalogBroker.id}/integrations`);
      const pref = ['api_sync', 'oauth_sync', 'terminal_sync', 'csv_upload', 'manual_entry'];
      const available = (Array.isArray(intData?.integrations) ? intData.integrations : Array.isArray(intData) ? intData : []).filter((i) => i.isActive !== false);
      const integration = available.sort((a, b) => pref.indexOf(a.tradeMethod) - pref.indexOf(b.tradeMethod))[0];
      if (!integration) throw new Error('No supported account method');
      const { data } = await api.post('/broker-connections', { integrationId: integration.id, accountName: account, metadata: {} });
      const broker = connectionToBroker(data.connection);
      setBrokers((curr) => [...curr.filter((item) => item.id !== broker.id), broker]);
      setSelectedBrokerId(broker.id);
      setAccountName('');
      setBrokerSearch('');
      setSelectedCatalogBrokerId('');
      setShowAddBroker(false);
      notify('Broker account saved', 'success');
    } catch {
      notify('Could not save this account', 'error');
    } finally {
      setAccountBusy(false);
    }
  };

  const deleteBroker = async (brokerId) => {
    const broker = brokers.find((i) => i.id === brokerId);
    const bName = broker?.accountName ? broker.accountName : 'this account';
    if (!await confirm(`Delete ${bName}? All associated trades will also be permanently deleted.`, { title: 'Delete trading account', confirmText: 'Delete account' })) return;
    if (broker?.brokerConnectionId) {
      try { await api.delete(`/broker-connections/${broker.brokerConnectionId}`); } catch { notify('Could not remove this account', 'error'); return; }
    }
    const remaining = brokers.filter((i) => i.id !== brokerId);
    setBrokers(remaining);
    if (selectedBrokerId === brokerId) setSelectedBrokerId(remaining[0]?.id ?? null);
    setOpenAccountMenuId(null);
    notify('Broker account deleted', 'success');
  };

  const renameBroker = async (brokerId) => {
    const broker = brokers.find((i) => i.id === brokerId);
    const currentName = broker?.accountName ? broker.accountName : (broker?.name || '');
    const nextName = await requestInput('Enter a new name for this trading account.', { title: 'Rename account', value: currentName, confirmText: 'Save name' });
    setOpenAccountMenuId(null);
    if (!nextName || nextName === currentName) return;
    try {
      if (broker?.brokerConnectionId) await api.patch(`/broker-connections/${broker.brokerConnectionId}`, { accountName: nextName });
      setBrokers((curr) => curr.map((i) => i.id === brokerId ? { ...i, accountName: nextName } : i));
      notify('Account renamed', 'success');
    } catch {
      notify('Could not rename this account', 'error');
    }
  };

  const hasAccounts = brokers.length > 0;

  const brokerSection = (
    <section className="flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)]">
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Account workspace</span>
          <h2 className="text-lg font-bold text-[var(--heading)] tracking-tight m-0">Your trading accounts</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Keep every journal entry organised by the broker account it belongs to.</p>
        </div>
        <Button color="primary" size="sm" onClick={() => setShowAddBroker(true)}>+ Add account</Button>
      </div>
      {!hasAccounts ? (
        <div className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center border border-dashed border-[var(--divider-strong)] rounded-xl bg-[var(--surface-subtle)]">
          <span className="mb-2 text-[#2563eb] text-[10px] font-extrabold tracking-widest uppercase">Start your journal</span>
          <h3 className="text-xl font-bold text-[var(--heading)] mb-2">No trading accounts yet</h3>
          <p className="max-w-md text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">Add your broker or platform once, then keep manual trades, uploads and syncs attached to the right account.</p>
          <Button color="primary" size="md" onClick={() => setShowAddBroker(true)}>Add your first account</Button>
          {accountMessage ? <p className="text-xs text-[var(--text-muted)] mt-3" role="status">{accountMessage}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col border border-[var(--divider-strong)] rounded-xl bg-[var(--bg-card)] overflow-hidden shadow-xs" role="table" aria-label="Manual trading accounts">
          <div className="grid grid-cols-[minmax(280px,1.4fr)_minmax(160px,1fr)_90px] items-center gap-4 px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--divider-strong)] text-[10px] font-extrabold tracking-widest uppercase text-[var(--text-secondary)]" role="row">
            <span>Account</span><span>Broker</span><span className="text-right">Action</span>
          </div>
          <div className="flex flex-col divide-y divide-[var(--divider-strong)] overflow-y-auto max-h-[clamp(280px,calc(100dvh-320px),580px)] overscroll-contain">
            {brokers.map((broker) => {
              const displayName = broker.accountName ? broker.accountName : broker.name;
              return (
                <div key={broker.id} className="grid grid-cols-[minmax(280px,1.4fr)_minmax(160px,1fr)_90px] items-center gap-4 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-colors" role="row">
                  <button type="button" className="flex items-center gap-3 min-w-0 p-0 border-0 bg-transparent text-left cursor-pointer" onClick={() => { setSelectedBrokerId(broker.id); onOpenEntryMethods?.(broker); }}>
                    <BrokerMark broker={broker} />
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="flex items-center gap-2 min-w-0">
                        <strong className="text-sm font-bold text-[var(--heading)] truncate">{displayName}</strong>
                        {broker.status === 'connected' && broker.metadata?.environment ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${broker.metadata.environment === 'demo' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>{broker.metadata.environment === 'demo' ? 'Demo' : 'Real'}</span> : null}
                        {broker.status === 'pending' ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Connection required</span> : null}
                      </span>
                      <small className="text-[11px] text-[var(--text-muted)]">{broker.status === 'connected' ? 'Connected account' : 'Connection required'}</small>
                    </span>
                  </button>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] truncate" data-label="Broker">{broker.name}</span>
                  <div className="flex items-center justify-end gap-2">
                    <button type="button" className="flex items-center justify-center size-8 rounded-lg bg-[var(--button-bg)] text-[var(--button-text)] hover:opacity-90 shadow-xs transition-colors cursor-pointer text-sm font-bold" aria-label={`Add manual trade to ${displayName}`} title="Add manual trade" onClick={() => { setSelectedBrokerId(broker.id); onOpenManualEntry?.(); }}>+</button>
                    <div className="relative manual-account-menu-wrap">
                      <button type="button" className="manual-account-menu-trigger flex items-center justify-center size-8 rounded-lg border border-[var(--divider-strong)] bg-[var(--bg-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--heading)] transition-colors cursor-pointer text-base font-bold" aria-label={`More actions for ${displayName}`} aria-expanded={openAccountMenuId === broker.id} onClick={() => setOpenAccountMenuId((curr) => curr === broker.id ? null : broker.id)}>⋮</button>
                      {openAccountMenuId === broker.id ? (
                        <div className="absolute right-0 top-full mt-1 z-30 min-w-[150px] p-1 rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] shadow-lg flex flex-col gap-0.5" role="menu">
                          <button type="button" className="w-full px-3 py-1.5 text-left text-xs font-semibold text-[var(--heading)] hover:bg-[var(--surface-subtle)] rounded-lg cursor-pointer" role="menuitem" onClick={() => renameBroker(broker.id)}>Rename account</button>
                          <button type="button" className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer" role="menuitem" onClick={() => deleteBroker(broker.id)}>Delete account</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  const addAccountView = (
    <section className="flex flex-col gap-5 w-full p-4 sm:p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)] flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-[var(--heading)] m-0">Choose your broker</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Search or select from the available broker integrations.</p>
        </div>
        <Button color="secondary" size="sm" onClick={() => setShowAddBroker(false)}>Back to Accounts</Button>
      </div>
      <form className="flex flex-col gap-4" onSubmit={addBroker}>
        <div className="flex flex-col gap-1.5 max-w-md">
          <label className="text-xs font-bold text-[var(--heading)]">Search brokers</label>
          <input className="w-full min-h-[40px] px-3.5 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--button-bg)] focus:bg-[var(--bg-card)] shadow-xs transition-all" value={brokerSearch} onChange={(e) => { setBrokerSearch(e.target.value); setCatalogLoading(true); setCatalogError(''); }} placeholder="Search brokers or prop firms..." autoComplete="off" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] m-0">Available brokers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto p-1" role="listbox" aria-label="Available brokers">
            {matchingCatalogBrokers.map((broker) => (
              <button key={broker.id} type="button" className={`flex items-center gap-3 p-3 rounded-xl text-left border transition-all duration-150 cursor-pointer ${selectedCatalogBrokerId === broker.id ? 'border-[var(--button-bg)] bg-[var(--button-bg)]/10 shadow-xs ring-1 ring-[var(--button-bg)]' : 'border-[var(--divider-strong)] bg-[var(--surface-subtle)] hover:border-[var(--button-bg)]/60 hover:bg-[var(--bg-card)]'}`} onClick={() => setSelectedCatalogBrokerId(broker.id)}>
                <BrokerMark broker={broker} />
                <span className="flex flex-col min-w-0">
                  <strong className="text-xs font-bold text-[var(--heading)] truncate">{broker.name}</strong>
                  <small className="text-[10px] text-[var(--text-muted)] capitalize truncate">{String(broker.providerType || 'broker').replace('_', ' ')}</small>
                </span>
              </button>
            ))}
            {catalogLoading ? <p className="col-span-full py-8 text-center text-xs text-[var(--text-muted)] m-0">Loading brokers…</p> : null}
            {!catalogLoading && !catalogError && matchingCatalogBrokers.length === 0 ? <p className="col-span-full py-8 text-center text-xs text-[var(--text-muted)] m-0">No matching broker in the Entrack catalog.</p> : null}
            {catalogError ? <p className="col-span-full py-8 text-center text-xs text-rose-500 m-0">{catalogError}</p> : null}
          </div>
        </div>
        {selectedCatalogBroker ? (
          <div className="flex flex-col gap-3.5 p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider-strong)] mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Selected broker:</span>
              <strong className="text-xs font-bold text-[var(--heading)]">{selectedCatalogBroker.name}</strong>
            </div>
            <label className="flex flex-col gap-1.5 max-w-md">
              <span className="text-xs font-bold text-[var(--heading)]">Account Name <span className="text-rose-500">*</span></span>
              <input className="w-full min-h-[40px] px-3 py-2 text-xs rounded-xl border border-[var(--divider-strong)] bg-[var(--bg-card)] text-[var(--heading)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--button-bg)] shadow-xs" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. Main Futures" required />
            </label>
            <div className="flex justify-start">
              <Button color="primary" size="md" type="submit" isDisabled={!accountName.trim() || accountBusy} isLoading={accountBusy}>
                {accountBusy ? 'Saving...' : 'Save Account'}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );

  return (
    <div className="w-full">
      {entryMode === 'trade' ? (
        <section className="manual-trade-entry-view">
          <ManualEntryForm brokers={brokers} selectedBrokerId={selectedBrokerId} setSelectedBrokerId={setSelectedBrokerId} brokerConnectionId={brokers.find((b) => b.id === selectedBrokerId)?.brokerConnectionId} currencyCode={currencyCode} onCurrencyChange={onCurrencyChange} />
        </section>
      ) : entryMode === 'accounts' ? (
        showAddBroker ? addAccountView : brokerSection
      ) : (
        <FileUploadForm fileData={fileData} setFileData={setFileData} brokers={brokers} selectedBrokerId={selectedBrokerId} setSelectedBrokerId={setSelectedBrokerId} brokerConnectionId={brokers.find((b) => b.id === selectedBrokerId)?.brokerConnectionId} />
      )}
    </div>
  );
}
