import React, { useCallback, useEffect, useRef, useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import api from '../../utils/serve';
import { useAuth } from '../../context/AuthContext';
import { sanitizeDecimalInput } from '../../utils/fieldValidation';
import { getUserSafeError } from '../../utils/safeErrors';

const POLL_INTERVAL_MS = 2500;
const FINAL_STATUSES = new Set(['connected', 'failed']);

const formatCurrency = (value, currencyCode) => {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  return new Intl.NumberFormat('en-US', {
    style: currencyCode ? 'currency' : 'decimal',
    currency: currencyCode || undefined,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const formatDateTime = (value) => {
  if (!value) return 'Not synced yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not synced yet';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function ApiImportForm() {
  const { user } = useAuth();
  const pollTimerRef = useRef(null);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    brokerServer: '',
  });
  const [requestId, setRequestId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [showConnectForm, setShowConnectForm] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!user?.ID) {
      setAccounts([]);
      setIsAccountsLoading(false);
      return;
    }

    setIsAccountsLoading(true);
    setAccountsError('');

    try {
      const { data } = await api.get('/get-mt5-accounts');
      const nextAccounts = Array.isArray(data?.accounts) ? data.accounts : [];
      setAccounts(nextAccounts);
      setShowConnectForm(nextAccounts.length === 0);
    } catch (error) {
      setAccountsError(getUserSafeError(error, 'Unable to load connected accounts. Please try again.'));
    } finally {
      setIsAccountsLoading(false);
    }
  }, [user?.ID]);

  useEffect(() => () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const pollStatus = async (nextRequestId) => {
    try {
      const { data } = await api.get(`/mt5/connect/${nextRequestId}/status`);

      if (!data.success) {
        throw new Error(data.error || 'Unable to check MT5 connection');
      }

      setStatus(data.status);
      setErrorMessage(data.error_message || '');

      if (data.status === 'connected') {
        await fetchAccounts();
        setShowConnectForm(false);
      }

      if (!FINAL_STATUSES.has(data.status)) {
        pollTimerRef.current = window.setTimeout(() => pollStatus(nextRequestId), POLL_INTERVAL_MS);
      }
    } catch (error) {
      setStatus('failed');
      setErrorMessage(getUserSafeError(error, 'Connection issue. Please retry.'));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'login') {
      const sanitizedValue = sanitizeDecimalInput(value);
      if (sanitizedValue === null || sanitizedValue.includes('.')) return;
      setFormData((previous) => ({ ...previous, login: sanitizedValue }));
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.ID) {
      setStatus('failed');
      setErrorMessage('Please log in before connecting MT5.');
      return;
    }

    const login = formData.login.trim();
    const password = formData.password.trim();
    const brokerServer = formData.brokerServer.trim();

    if (!login || !password || !brokerServer) {
      setStatus('failed');
      setErrorMessage('MT5 login, password, and broker server are required.');
      return;
    }

    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }

    setStatus('pending');
    setErrorMessage('');

    try {
      const { data } = await api.post('/mt5/connect', {
        login,
        password,
        broker_server: brokerServer,
      });

      if (!data.success) {
        throw new Error(data.error || 'Unable to create MT5 connection request');
      }

      setRequestId(data.request_id);
      setStatus(data.status || 'pending');
      if (data.status === 'connected') {
        await fetchAccounts();
        setShowConnectForm(false);
      }
      pollTimerRef.current = window.setTimeout(() => pollStatus(data.request_id), POLL_INTERVAL_MS);
    } catch (error) {
      setStatus('failed');
      setErrorMessage(getUserSafeError(error, 'Connection issue. Please retry.'));
    }
  };

  const isLoading = !FINAL_STATUSES.has(status) && status !== 'idle';
  const isConnected = status === 'connected';
  const isFailed = status === 'failed';
  const accountCountLabel = `${accounts.length} connected ${accounts.length === 1 ? 'account' : 'accounts'}`;

  return (
    <div className="add-trade-form-container api-section broker-sync-section">
      <div className="broker-sync-panel">
        <div className="sync-panel-head">
          <div>
            <div className="section-title">
              <LegacyIcon className="fas fa-plug" />
              Broker Sync
            </div>
            <p className="sync-panel-copy">Manage connected broker accounts for exact trade sync.</p>
          </div>
          <button
            className="btn btn-primary sync-connect-more-btn"
            type="button"
            onClick={() => {
              setStatus('idle');
              setErrorMessage('');
              setRequestId(null);
              setShowConnectForm((previous) => !previous);
            }}
          >
            <LegacyIcon className="fas fa-plus" />
            Connect More
          </button>
        </div>

        <div className="broker-sync-summary">
          <span className="account-count-pill">
            <LegacyIcon className="fas fa-link" />
            {accountCountLabel}
          </span>
          {accountsError && (
            <span className="api-status status-disconnected">
              <LegacyIcon className="fas fa-exclamation-circle" />
              {accountsError}
            </span>
          )}
        </div>

        {isAccountsLoading ? (
          <div className="loading-accounts" role="status" aria-live="polite">
            <LegacyIcon className="fas fa-spinner fa-spin" />
            <span>Loading accounts...</span>
          </div>
        ) : accounts.length > 0 ? (
          <div className="accounts-list">
            {accounts.map((account) => {
              const currencyCode = account.temporary_currency || account.default_currency;

              return (
                <article className="account-item" key={account.id || account.account_id}>
                  <div className="account-header">
                    <div className="account-info">
                      <span className="broker-logo broker-logo--fallback" aria-hidden="true">
                        {(account.broker_name || 'MT5').slice(0, 3).toUpperCase()}
                      </span>
                      <div className="account-title-block">
                        <span className="account-name">{account.broker_name || 'MT5 Broker'}</span>
                        <span className="account-id">Account #{account.account_id || '-'}</span>
                      </div>
                    </div>

                    <span className="account-status-pill is-connected">
                      <LegacyIcon className="fas fa-check-circle" />
                      Connected
                    </span>
                  </div>

                  <div className="account-details">
                    <div className="detail-item">
                      <span className="detail-label">Server</span>
                      <span className="detail-value">{account.server_name || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Balance</span>
                      <span className="detail-value">{formatCurrency(account.balance, currencyCode)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Currency</span>
                      <span className="detail-value">{currencyCode || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Sync</span>
                      <span className="detail-value">{formatDateTime(account.last_synced_at)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="no-accounts">
            <LegacyIcon className="fas fa-plug" />
            <span>No connected accounts yet.</span>
          </div>
        )}

        {showConnectForm && (
          <div className="mt5-connect-panel">
            <div className="sync-form-title">
              <LegacyIcon className="fas fa-plus-circle" />
              Connect MT5 Account
            </div>

            {status === 'idle' && (
              <form className="mt5-connect-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="mt5-login" className="required">MT5 Login ID</label>
                  <input
                    id="mt5-login"
                    name="login"
                    inputMode="numeric"
                    type="text"
                    value={formData.login}
                    onChange={handleChange}
                    placeholder="12345678"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mt5-password" className="required">Password</label>
                  <input
                    id="mt5-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="MT5 password"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mt5-broker-server" className="required">Broker Server</label>
                  <input
                    id="mt5-broker-server"
                    name="brokerServer"
                    type="text"
                    value={formData.brokerServer}
                    onChange={handleChange}
                    placeholder="Broker-Server"
                    autoComplete="off"
                    required
                  />
                </div>

                <button className="btn btn-success" type="submit">
                  <LegacyIcon className="fas fa-plug" />
                  Connect
                </button>
              </form>
            )}

            {isLoading && (
              <div className="mt5-connect-state" role="status" aria-live="polite">
                <LegacyIcon className="fas fa-spinner fa-spin" />
                <span>Connecting...</span>
              </div>
            )}

            {isConnected && (
              <div className="mt5-connect-state mt5-connect-state--success" role="status" aria-live="polite">
                <LegacyIcon className="fas fa-check-circle" />
                <span>Connected</span>
              </div>
            )}

            {isFailed && (
              <div className="mt5-connect-state mt5-connect-state--error" role="alert">
                <LegacyIcon className="fas fa-times-circle" />
                <span>{errorMessage || 'Failed'}</span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setStatus('idle');
                    setRequestId(null);
                    setErrorMessage('');
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {requestId && <span className="mt5-connect-request" aria-hidden="true" />}
      </div>
    </div>
  );
}

export default ApiImportForm;

