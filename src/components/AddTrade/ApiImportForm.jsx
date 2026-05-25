import React, { useEffect, useRef, useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import api from '../../utils/serve';
import { useAuth } from '../../context/AuthContext';
import { sanitizeDecimalInput } from '../../utils/fieldValidation';

const POLL_INTERVAL_MS = 2500;
const FINAL_STATUSES = new Set(['connected', 'failed']);

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

  useEffect(() => () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }
  }, []);

  const pollStatus = async (nextRequestId) => {
    try {
      const { data } = await api.get(`/mt5/connect/${nextRequestId}/status`);

      if (!data.success) {
        throw new Error(data.error || 'Unable to check MT5 connection');
      }

      setStatus(data.status);
      setErrorMessage(data.error_message || '');

      if (!FINAL_STATUSES.has(data.status)) {
        pollTimerRef.current = window.setTimeout(() => pollStatus(nextRequestId), POLL_INTERVAL_MS);
      }
    } catch (error) {
      setStatus('failed');
      setErrorMessage(error.response?.data?.error || error.message || 'Unable to check MT5 connection');
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
      pollTimerRef.current = window.setTimeout(() => pollStatus(data.request_id), POLL_INTERVAL_MS);
    } catch (error) {
      setStatus('failed');
      setErrorMessage(error.response?.data?.error || error.message || 'Unable to connect MT5');
    }
  };

  const isLoading = !FINAL_STATUSES.has(status) && status !== 'idle';
  const isConnected = status === 'connected';
  const isFailed = status === 'failed';

  return (
    <div className="form-container api-section mt5-connect-section">
      <div className="mt5-connect-panel">
        <div className="sync-panel-head">
          <div>
            <div className="section-title">
              <LegacyIcon className="fas fa-plug" />
              Connect MT5
            </div>
            <p className="sync-panel-copy">Enter your MT5 account details to connect.</p>
          </div>
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
            <span>Loading...</span>
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

        {requestId && <span className="mt5-connect-request" aria-hidden="true" />}
      </div>
    </div>
  );
}

export default ApiImportForm;
