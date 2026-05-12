import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './AppDialogContext.css';

const AppDialogContext = createContext({
  notify: () => {},
  confirm: async () => false,
});

const getAlertType = (message) => {
  const text = String(message || '').toLowerCase();

  if (text.includes('error') || text.includes('failed') || text.includes('network') || text.includes('do not')) {
    return 'error';
  }

  if (text.includes('please') || text.includes('missing') || text.includes('required')) {
    return 'warning';
  }

  return 'success';
};

const normalizeMessage = (message) => String(message ?? '').replace(/^[✅❌⚠️\s]+/u, '').trim();

export function AppDialogProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolverRef = useRef(null);

  const dismissAlert = useCallback((id) => {
    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== id));
  }, []);

  const notify = useCallback((message, type) => {
    const alertMessage = normalizeMessage(message);
    if (!alertMessage) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextAlert = {
      id,
      message: alertMessage,
      type: type || getAlertType(alertMessage),
    };

    setAlerts((currentAlerts) => [...currentAlerts.slice(-3), nextAlert]);
    window.setTimeout(() => dismissAlert(id), 3600);
  }, [dismissAlert]);

  const confirm = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({
        title: options.title || 'Confirm action',
        message: normalizeMessage(message),
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
      });
    })
  ), []);

  const resolveConfirm = useCallback((result) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }

    setConfirmDialog(null);
  }, []);

  useEffect(() => {
    const nativeAlert = window.alert;

    window.alert = (message) => {
      notify(message);
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, [notify]);

  return (
    <AppDialogContext.Provider value={{ notify, confirm }}>
      {children}

      <div className="app-alert-stack" aria-live="polite" aria-relevant="additions">
        {alerts.map((alert) => (
          <div key={alert.id} className={`app-alert app-alert--${alert.type}`} role="status">
            <div className="app-alert__icon" aria-hidden="true" />
            <div className="app-alert__message">{alert.message}</div>
            <button
              type="button"
              className="app-alert__close"
              aria-label="Dismiss message"
              onClick={() => dismissAlert(alert.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {confirmDialog && (
        <div className="app-confirm-backdrop" role="presentation" onClick={() => resolveConfirm(false)}>
          <div
            className="app-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm__header">
              <span className="app-confirm__mark" aria-hidden="true">!</span>
              <h2 id="app-confirm-title">{confirmDialog.title}</h2>
            </div>
            <p>{confirmDialog.message}</p>
            <div className="app-confirm__actions">
              <button type="button" className="app-confirm__cancel" onClick={() => resolveConfirm(false)}>
                {confirmDialog.cancelText}
              </button>
              <button type="button" className="app-confirm__confirm" onClick={() => resolveConfirm(true)}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  return useContext(AppDialogContext);
}
