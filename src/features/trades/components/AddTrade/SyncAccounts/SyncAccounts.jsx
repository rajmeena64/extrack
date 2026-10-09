import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { jsDateToCalendarDate } from '@/utils/common/dateConversions';
import api from '@/utils/common/serve';
import { useAppDialog } from '@/context/AppDialogContext';
import { DropdownSelect as CustomSelect, Button, Modal } from "@/components/ui";
import { getBrokerModal } from '../brokerModals/brokerModalRegistry';

const PENDING_SYNC_KEY = 'entrack:pending-oauth-sync';
const CURRENT_YEAR = new Date().getFullYear();
const RANGE_OPTIONS = [
  { value: String(CURRENT_YEAR), label: `${CURRENT_YEAR} (Year to date)` },
  { value: String(CURRENT_YEAR - 1), label: String(CURRENT_YEAR - 1) },
  { value: String(CURRENT_YEAR - 2), label: String(CURRENT_YEAR - 2) },
  { value: '1m', label: '1 Month' }, { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' }, { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' }, { value: 'custom', label: 'Custom Date Range' },
];
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: i === 0 ? `${y} (Year to date)` : String(y) };
});

const formatDate = (val) => val ? new Date(val).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not synced yet';
const formatBalance = (val, cur) => Number.isFinite(Number(val)) ? `${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur || ''}`.trim() : 'Not available';
const getAccountEnvironment = (conn) => conn.status !== 'connected' ? null : (conn.metadata?.environment === 'demo' ? 'Demo' : 'Real');
const platformIntegrations = (conn) => Array.isArray(conn?.supportedIntegrations) ? conn.supportedIntegrations.filter((i) => String(i.tradeMethod || '').endsWith('_sync')) : [];
const isPlatformReady = (integration) => Boolean(integration?.isActive);
const isDisplayableAccountId = (id) => Boolean(id && !id.includes(':') && !id.startsWith('__') && id.length <= 24);

const preferredBalances = (items = []) => {
  const res = new Map();
  for (const item of items) {
    if (!res.has(item.connectionId) || item.market === 'usdmFutures') res.set(item.connectionId, item);
  }
  return res;
};

function getSyncState(conn) {
  if (conn.tradeMethod === 'api_sync') {
    return conn.status === 'connected' ? { label: 'Connection active', tone: 'active', selectable: true } : { label: 'Connection required', tone: 'pending', selectable: true };
  }
  const supportsSync = String(conn.tradeMethod || '').endsWith('_sync');
  if (!supportsSync && platformIntegrations(conn).length) return { label: 'Choose platform', tone: 'pending', selectable: true };
  if (!supportsSync) return { label: 'Sync not available', tone: 'unavailable', selectable: false };
  if (conn.status !== 'connected') return { label: 'Connection required', tone: 'pending', selectable: true };
  if (!conn.lastSyncedAt) return { label: 'Sync not started', tone: 'pending', selectable: true };
  if (conn.lastSyncStatus === 'failed') return { label: 'Sync failed', tone: 'failed', selectable: true };
  return { label: 'Sync active', tone: 'active', selectable: true };
}

function getRangeTimestamps(range, fromDate, toDate) {
  if (/^\d{4}$/.test(range)) return getYearTimestamps(range);
  const end = new Date(), start = new Date(end);
  if (range === '1m') start.setMonth(start.getMonth() - 1);
  if (range === '3m') start.setMonth(start.getMonth() - 3);
  if (range === '6m') start.setMonth(start.getMonth() - 6);
  if (range === '1y') start.setFullYear(start.getFullYear() - 1);
  if (range === '2y') start.setFullYear(start.getFullYear() - 2);
  if (range === 'all') return { fromTimestamp: 0, toTimestamp: end.getTime() };
  if (range === 'custom') {
    if (!fromDate || !toDate) return null;
    return {
      fromTimestamp: new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime(),
      toTimestamp: new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime(),
    };
  }
  return { fromTimestamp: start.getTime(), toTimestamp: end.getTime() };
}

function getYearTimestamps(value, now = new Date()) {
  const y = Number(value), start = new Date(y, 0, 1).getTime();
  const end = y === now.getFullYear() ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1 : new Date(y + 1, 0, 1).getTime() - 1;
  return { fromTimestamp: start, toTimestamp: end > start ? end : now.getTime() };
}

const syncResultMessage = (results) => {
  const fetched = results.reduce((tot, r) => tot + (Number(r.fetchedCount) || 0), 0);
  const newSaved = results.reduce((tot, r) => tot + (Number(r.newTradesCount) || 0), 0);
  const updated = results.reduce((tot, r) => tot + (Number(r.updatedTradesCount) || 0), 0);
  if (fetched === 0) return 'Sync complete: No trades found.';
  if (newSaved === 0) return updated > 0 ? `Sync complete: No new trades found (${updated} trade${updated === 1 ? '' : 's'} already up to date).` : 'Sync complete: No new trades found.';
  return `Sync complete: ${newSaved} new trade${newSaved === 1 ? '' : 's'} saved${updated > 0 ? ` (${updated} up to date)` : ''}.`;
};

export default function SyncAccounts({ accounts = [] }) {
  const queryClient = useQueryClient();
  const { notify } = useAppDialog();
  const [savedConnections, setSavedConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [range, setRange] = useState(String(CURRENT_YEAR));
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [openCalendar, setOpenCalendar] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(jsDateToCalendarDate(new Date()));
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [environment, setEnvironment] = useState('real');
  const [year, setYear] = useState(YEAR_OPTIONS[0].value);
  const [credentials, setCredentials] = useState({});
  const [reconnectPrompt, setReconnectPrompt] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const calendarRef = useRef(null);

  useEffect(() => {
    let active = true;
    const searchParams = new URLSearchParams(window.location.search);
    const callbackStatus = searchParams.get('oauth') || searchParams.get('ctrader');
    let pendingSync = null;
    try { pendingSync = JSON.parse(sessionStorage.getItem(PENDING_SYNC_KEY)); } catch {}
    if (callbackStatus === 'reconnect_prompt') {
      const archivedId = searchParams.get('archivedId');
      const connId = searchParams.get('connectionId');
      const accountId = searchParams.get('accountId');
      setReconnectPrompt({ archivedId, connectionId: connId, accountId });
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('oauth');
      cleanUrl.searchParams.delete('ctrader');
      cleanUrl.searchParams.delete('archivedId');
      cleanUrl.searchParams.delete('connectionId');
      cleanUrl.searchParams.delete('accountId');
      cleanUrl.searchParams.delete('brokerName');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    } else if (callbackStatus) {
      notify(callbackStatus === 'connected' ? 'Account connected' : callbackStatus === 'cancelled' ? 'Connection cancelled' : 'Connection failed', callbackStatus === 'connected' ? 'success' : callbackStatus === 'cancelled' ? 'warning' : 'error');
      sessionStorage.removeItem(PENDING_SYNC_KEY);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('oauth');
      cleanUrl.searchParams.delete('ctrader');
      window.history.replaceState({}, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
    api.get('/broker-connections')
      .then(async ({ data }) => {
        if (!active) return;
        const saved = Array.isArray(data?.connections) ? data.connections : [];
        const balances = new Map((data?.balances || []).map((item) => [`${item.connectionId}:${item.accountId}`, item]));
        const connectionBalances = preferredBalances(data?.balances);
        const expanded = saved.flatMap((conn) => {
          if (conn.externalAccountId) {
            const accMeta = (conn.metadata?.authorizedAccounts || []).find((a) => String(a.id) === String(conn.externalAccountId));
            return [{
              ...conn,
              rowId: conn.id,
              externalAccountId: String(conn.externalAccountId),
              accountBalance: balances.get(`${conn.id}:${conn.externalAccountId}`)?.balance ?? conn.balanceSnapshot?.balance ?? connectionBalances.get(conn.id)?.balance,
              accountCurrency: balances.get(`${conn.id}:${conn.externalAccountId}`)?.currency || conn.balanceSnapshot?.currency || conn.accountCurrency,
              accountEnvironment: accMeta?.isLive != null ? (accMeta.isLive ? 'Live' : 'Demo') : getAccountEnvironment(conn),
              accountName: conn.accountName,
              marketBalances: { spot: balances.get(`${conn.id}:spot`), usdmFutures: balances.get(`${conn.id}:usdmFutures`), coinmFutures: balances.get(`${conn.id}:coinmFutures`) },
              marketHoldings: balances.get(`${conn.id}:spot`)?.holdings || [],
            }];
          }
          const authorizedAccounts = Array.isArray(conn.metadata?.authorizedAccounts) ? conn.metadata.authorizedAccounts : (conn.metadata?.authorizedAccountIds || []).map((id) => ({ id }));
          return authorizedAccounts.length
            ? authorizedAccounts.map((acc) => ({
              ...conn,
              rowId: `${conn.id}:${acc.id}`, externalAccountId: String(acc.id),
              accountBalance: balances.get(`${conn.id}:${acc.id}`)?.balance ?? conn.balanceSnapshot?.balance,
              accountCurrency: balances.get(`${conn.id}:${acc.id}`)?.currency || conn.balanceSnapshot?.currency || conn.accountCurrency,
              accountEnvironment: acc.isLive == null ? null : acc.isLive ? 'Live' : 'Demo',
              accountName: authorizedAccounts.length > 1 ? `${conn.accountName} - ${acc.login ? acc.login : acc.id}` : conn.accountName,
            }))
            : [{
              ...conn,
              rowId: conn.id, accountBalance: connectionBalances.get(conn.id)?.balance ?? conn.balanceSnapshot?.balance,
              accountCurrency: connectionBalances.get(conn.id)?.currency || conn.balanceSnapshot?.currency || conn.accountCurrency,
              marketBalances: { spot: balances.get(`${conn.id}:spot`), usdmFutures: balances.get(`${conn.id}:usdmFutures`), coinmFutures: balances.get(`${conn.id}:coinmFutures`) },
              marketHoldings: balances.get(`${conn.id}:spot`)?.holdings || [],
              accountEnvironment: getAccountEnvironment(conn),
            }];
        });
        setSavedConnections(expanded);
        if (callbackStatus === 'connected' && pendingSync?.connectionId) {
          const accountsToSync = expanded.filter((c) => c.id === pendingSync.connectionId && c.externalAccountId);
          if (!accountsToSync.length) throw new Error('Connected account was not returned');
          setSelectedId(accountsToSync[0].rowId);
          setRange(pendingSync.range || '1m');
          setFromDate(pendingSync.fromDate ? new Date(pendingSync.fromDate) : null);
          setToDate(pendingSync.toDate ? new Date(pendingSync.toDate) : null);
          setSyncing(true);
          const results = await Promise.all(accountsToSync.map(async (c) => {
            const res = await api.post(`/broker-connections/${c.id}/sync`, { accountId: c.externalAccountId, fromTimestamp: pendingSync.fromTimestamp, toTimestamp: pendingSync.toTimestamp });
            return res.data;
          }));
          if (!active) return;
          const syncedAt = new Date().toISOString();
          setSavedConnections((curr) => curr.map((c) => c.id === pendingSync.connectionId ? { ...c, lastSyncedAt: syncedAt, lastSyncStatus: 'success' } : c));
          notify(syncResultMessage(results), 'success');
          await queryClient.invalidateQueries({ queryKey: ['trades'] });
        }
      })
      .catch(() => {
        if (!active) return;
        if (callbackStatus === 'connected') notify('Account connected, but trade history could not be synced', 'error');
        else setError('Saved broker accounts could not be loaded.');
      })
      .finally(() => { if (active) { setLoading(false); setSyncing(false); } });
    return () => { active = false; };
  }, [notify, queryClient, reloadTrigger]);

  useEffect(() => {
    const updateBalances = (e) => {
      const next = preferredBalances(e.detail);
      const exact = new Map((e.detail || []).map((item) => [`${item.connectionId}:${item.accountId}`, item]));
      const marketBalancesByConn = new Map();
      for (const item of e.detail || []) {
        if (!item.market) continue;
        marketBalancesByConn.set(item.connectionId, { ...marketBalancesByConn.get(item.connectionId), [item.market]: item });
      }
      setSavedConnections((curr) => curr.map((c) => {
        const balance = exact.get(`${c.id}:${c.externalAccountId}`) || next.get(c.id);
        const marketBal = marketBalancesByConn.get(c.id);
        return balance || marketBal ? {
          ...c,
          ...(balance ? { accountBalance: balance.balance, accountCurrency: balance.currency } : {}),
          ...(marketBal ? { marketBalances: { ...c.marketBalances, ...marketBal }, marketHoldings: marketBal?.spot?.holdings ?? c.marketHoldings } : {}),
          accountEnvironment: getAccountEnvironment(c) || c.accountEnvironment,
        } : c;
      }));
    };
    window.addEventListener('broker-balances-updated', updateBalances);
    return () => window.removeEventListener('broker-balances-updated', updateBalances);
  }, []);

  useEffect(() => {
    if (!openCalendar) return undefined;
    const close = (e) => { if (!calendarRef.current?.contains(e.target)) setOpenCalendar(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [openCalendar]);

  const localAccounts = accounts.filter((a) => !a.brokerConnectionId).map((a) => ({ rowId: `local:${a.id}`, accountName: a.accountName, brokerName: a.name, brokerLogoPath: a.logoPath, status: 'connected' }));
  const connections = [...savedConnections, ...localAccounts];
  const selected = connections.find((c) => c.rowId === selectedId);

  useEffect(() => { setSelectedIntegrationId(selected?.platformId ? selected.integrationId : ''); }, [selected?.integrationId, selected?.platformId, selected?.rowId]);
  useEffect(() => { if (selected?.metadata?.environment) setEnvironment(selected.metadata.environment === 'demo' ? 'demo' : 'real'); }, [selected?.metadata?.environment, selected?.rowId]);
  useEffect(() => { setCredentials({}); }, [selected?.rowId]);

  const handleConnect = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (connecting || !selected) return;
    setConnecting(true);
    try {
      let activeConn = selected;
      if (selectedIntegrationId && selected.integrationId !== selectedIntegrationId) {
        const { data: intData } = await api.post(`/broker-connections/${selected.id}/integration`, { integrationId: selectedIntegrationId });
        activeConn = { ...intData.connection, rowId: selected.rowId };
      }
      if (activeConn.tradeMethod === 'oauth_sync') {
        const timestamps = getRangeTimestamps(range, fromDate, toDate);
        const { data } = await api.post(`/broker-connections/${activeConn.id}/connect`);
        if (!data?.authorizationUrl) throw new Error('Missing authorization URL');
        sessionStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ connectionId: activeConn.id, range, fromDate: fromDate?.toISOString() || null, toDate: toDate?.toISOString() || null, ...(timestamps || {}) }));
        window.location.assign(data.authorizationUrl);
        return;
      }
      const payload = {
        ...(environment ? { environment } : {}),
        ...Object.fromEntries(
          Object.entries(credentials)
            .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
            .filter(([, v]) => v !== '' && v !== undefined && v !== null)
        ),
      };
      const { data } = await api.post(`/broker-connections/${activeConn.id}/connect`, payload);
      if (data?.reconnectPrompt) {
        setShowCredentials(false);
        setReconnectPrompt({
          archivedId: data.archivedConnectionId,
          connectionId: activeConn.id,
          accountId: data.externalAccountId,
        });
        return;
      }
      setShowCredentials(false); setCredentials({});
      const connectedId = data.connectionId || activeConn.id;
      const connected = {
        ...selected, ...activeConn, id: connectedId, rowId: connectedId, status: 'connected',
        ...(data.environment ? { accountEnvironment: data.environment === 'demo' ? 'Demo' : 'Real' } : {}),
        ...(data.name ? { accountName: data.name } : {}),
        ...(data.capabilities ? { metadata: { ...selected.metadata, ...activeConn.metadata, capabilities: data.capabilities, environment: data.environment || environment } } : {}),
        ...(data.account?.balance !== undefined ? { accountBalance: data.account.balance, accountCurrency: data.account.currency || activeConn.accountCurrency } : {}),
        ...(data.account?.server ? { accountName: `${data.account.server} (${data.account.login})` } : {}),
      };
      setSavedConnections((curr) => [...curr.filter((c) => c.id !== selected.id && c.id !== connectedId), connected]);
      setSelectedId(connectedId);
      notify(`${selected.brokerName || 'Broker'} account connected`, 'success');
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message;
      notify(msg || (code === 'INVALID_CREDENTIALS' ? 'Credentials are invalid' : 'Connection failed'), 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!reconnectPrompt || reconnecting) return;
    setReconnecting(true);
    try {
      await api.post(`/broker-connections/${reconnectPrompt.connectionId}/restore`, {
        archivedConnectionId: reconnectPrompt.archivedId,
      });
      notify('Account and trade history restored successfully', 'success');
      setReconnectPrompt(null);
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      setReloadTrigger((v) => v + 1);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to restore account', 'error');
    } finally {
      setReconnecting(false);
    }
  };

  const handleConfirmFreshStart = async () => {
    if (!reconnectPrompt || reconnecting) return;
    setReconnecting(true);
    try {
      await api.post(`/broker-connections/${reconnectPrompt.connectionId}/fresh-start`, {
        archivedConnectionId: reconnectPrompt.archivedId,
      });
      notify('Account connected successfully', 'success');
      setReconnectPrompt(null);
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
      setReloadTrigger((v) => v + 1);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to connect account', 'error');
    } finally {
      setReconnecting(false);
    }
  };

  const handleSync = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (syncing || !selected) return;
    if (selected.tradeMethod === 'oauth_sync' && selected.status !== 'connected') return handleConnect(e);
    setSyncing(true);
    try {
      let payload = {};
      if (selected.tradeMethod === 'api_sync') {
        const timestamps = getYearTimestamps(year);
        payload = { startTime: timestamps.fromTimestamp, endTime: timestamps.toTimestamp, ...timestamps };
      } else if (selected.tradeMethod === 'terminal_sync' || selected.tradeMethod === 'oauth_sync') {
        const timestamps = getRangeTimestamps(range, fromDate, toDate);
        if (!timestamps) { setSyncing(false); return notify('Select both From and To dates', 'warning'); }
        payload = { ...timestamps, ...(selected.externalAccountId ? { accountId: selected.externalAccountId } : {}) };
      }
      let { data } = await api.post(`/broker-connections/${selected.id}/sync`, payload);
      for (let attempt = 0; data?.status === 'processing' && attempt < 120; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        ({ data } = await api.post(`/broker-connections/${selected.id}/sync`, { ...payload, poll: true }));
      }
      if (data?.status === 'processing') return notify('Export is still processing. Click sync again later to resume.', 'warning');
      const syncedAt = new Date().toISOString();
      setSavedConnections((curr) => curr.map((c) => c.id === selected.id ? {
        ...c, lastSyncedAt: syncedAt, lastSyncStatus: 'success',
        ...(data?.balance !== undefined ? { accountBalance: data.balance } : {}),
        ...(data?.account?.balance !== undefined ? { accountBalance: data.account.balance } : {}),
      } : c));
      notify(syncResultMessage([data]), 'success');
      await queryClient.invalidateQueries({ queryKey: ['trades'] });
    } catch {
      notify(`${selected.brokerName || 'Broker'} trade history could not be synced`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const switchPlatform = async (integrationId) => {
    if (!selected || syncing || selected.integrationId === integrationId) return;
    setSyncing(true);
    try {
      const { data } = await api.post(`/broker-connections/${selected.id}/integration`, { integrationId });
      setSelectedIntegrationId(integrationId);
      setSavedConnections((curr) => curr.map((c) => c.id === selected.id ? { ...c, ...data.connection, rowId: c.rowId } : c));
    } catch {
      notify('Could not switch platform', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (selected) {
    const BrokerModalComponent = getBrokerModal(selected);
    const supportedPlatforms = platformIntegrations(selected);
    const chosenPlatform = supportedPlatforms.find((i) => i.id === selectedIntegrationId);
    if (!BrokerModalComponent) return null;

    const platformSelector = supportedPlatforms.length > 1 ? (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">Platform</span>
        <CustomSelect ariaLabel="Trading platform" value={selected.integrationId} onChange={(e) => switchPlatform(e.target.value)} options={supportedPlatforms.map((i) => ({ value: i.id, label: `${i.platformName}${isPlatformReady(i) ? '' : ' - Coming soon'}`, disabled: !isPlatformReady(i) }))} />
      </div>
    ) : null;

    return (
      <BrokerModalComponent
        selected={selected}
        platformSelector={platformSelector}
        showCredentials={showCredentials} setShowCredentials={setShowCredentials}
        environment={environment} setEnvironment={setEnvironment}
        credentials={credentials} setCredentials={setCredentials}
        year={year} setYear={setYear}
        yearOptions={YEAR_OPTIONS}
        connecting={connecting || syncing}
        onConnect={handleConnect} onSync={handleSync} runSync={handleSync}
        supportedPlatforms={supportedPlatforms} chosenPlatform={chosenPlatform} isPlatformReady={isPlatformReady}
        range={range} setRange={setRange} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate}
        openCalendar={openCalendar} setOpenCalendar={setOpenCalendar} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth}
        calendarRef={calendarRef} syncing={syncing} switchPlatform={switchPlatform} formatBalance={formatBalance}
        RANGE_OPTIONS={RANGE_OPTIONS}
      />
    );
  }

  return (
    <section className="flex flex-col gap-4 w-full p-4 sm:p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--divider-strong)] shadow-xs">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--divider-strong)]">
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">Broker workspace</span>
          <h2 className="text-lg font-bold text-[var(--heading)] tracking-tight m-0">Exact Sync</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 m-0">Select a sync-capable account to continue.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 border border-[var(--divider-strong)] rounded-full bg-[var(--surface-subtle)] text-[11px] font-bold text-[var(--text-secondary)]">
            {connections.length} saved account{connections.length === 1 ? '' : 's'}
          </span>
          {error ? <span className="text-xs font-semibold text-rose-500" role="alert">{error}</span> : null}
        </div>
      </div>

      {loading ? <div className="py-8 text-center text-xs text-[var(--text-muted)]" role="status">Loading saved accounts...</div> : null}
      {!loading && !error && connections.length === 0 ? <div className="py-8 text-center text-xs text-[var(--text-muted)]">No saved broker accounts yet.</div> : null}
      {!loading && connections.length > 0 ? (
        <div className="flex flex-col divide-y divide-[var(--divider-strong)] border border-[var(--divider-strong)] rounded-xl bg-[var(--bg-card)] overflow-y-auto max-h-[clamp(280px,calc(100dvh-330px),580px)] overscroll-contain shadow-xs">
          {connections.map((connection) => {
            const syncState = getSyncState(connection);
            return (
              <button
                type="button"
                className={`grid grid-cols-[minmax(220px,1.4fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto] items-center gap-4 px-4 py-3.5 text-left border-0 bg-transparent transition-colors ${syncState.selectable ? 'hover:bg-[var(--surface-subtle)] cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                key={connection.rowId}
                disabled={!syncState.selectable}
                onClick={() => setSelectedId(connection.rowId)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center size-9 rounded-xl border border-[var(--divider-strong)] bg-[var(--surface-subtle)] shrink-0 overflow-hidden text-[10px] font-bold text-[var(--text-secondary)]" aria-hidden="true">
                    {connection.brokerLogoPath ? <img src={connection.brokerLogoPath} alt="" className="size-5 object-contain" /> : String(connection.brokerName || 'Broker').slice(0, 3).toUpperCase()}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-sm font-bold text-[var(--heading)] truncate">{connection.accountName ? connection.accountName : connection.brokerName}</strong>
                    <small className="text-[11px] text-[var(--text-muted)] truncate">{connection.brokerName}{connection.accountEnvironment ? ` - ${connection.accountEnvironment}` : ''}{isDisplayableAccountId(connection.externalAccountId) ? ` - #${connection.externalAccountId}` : ''}</small>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Balance</span>
                  <strong className="text-xs font-bold text-[var(--heading)]">{formatBalance(connection.accountBalance, connection.accountCurrency)}</strong>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Last sync</span>
                  <strong className="text-xs font-bold text-[var(--heading)]">{formatDate(connection.lastSyncedAt)}</strong>
                </div>
                <div>
                  <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                    syncState.tone === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : syncState.tone === 'failed' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : syncState.tone === 'unavailable' ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--divider-strong)]'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {syncState.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
      <Modal
        isOpen={Boolean(reconnectPrompt)}
        onClose={() => setReconnectPrompt(null)}
        title="Existing Account Found"
        size="md"
      >
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            This account {reconnectPrompt?.accountId ? `(#${reconnectPrompt.accountId})` : ''} was previously connected. Would you like to restore your previous trade history and journal notes, or start with fresh data?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1"
              variant="default"
              disabled={reconnecting}
              onClick={handleConfirmRestore}
            >
              {reconnecting ? 'Restoring...' : 'Restore Trade Data'}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={reconnecting}
              onClick={handleConfirmFreshStart}
            >
              {reconnecting ? 'Starting fresh...' : 'Start Fresh'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
