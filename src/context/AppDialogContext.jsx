import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from '../icons/lucideIcons';
import { Toaster, toast } from '@/components/ui/sonner';

const AppDialogContext = createContext({
  notify: () => {},
  confirm: async () => false,
  prompt: async () => null,
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

const normalizeMessage = (message) => String(message ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
const ALERT_ICONS = { error: CircleAlert, info: Info, success: CircleCheck, warning: TriangleAlert };
const ALERT_TITLES = { error: 'Action failed', info: 'Heads up', success: 'Saved successfully', warning: 'Check this' };
const ALERT_ACCENT_CLASSES = {
  error: '[--app-alert-accent:var(--accent-danger)]',
  info: '[--app-alert-accent:var(--accent-ink)]',
  success: '[--app-alert-accent:var(--accent-success-strong)]',
  warning: '[--app-alert-accent:var(--accent-rating)]',
};

export function AppDialogProvider({ children }) {
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);
  const confirmResolverRef = useRef(null);
  const promptResolverRef = useRef(null);

  const notify = useCallback((message, type) => {
    const alertMessage = normalizeMessage(message);
    if (!alertMessage) return;

    const resolvedType = type || getAlertType(alertMessage);
    if (resolvedType === 'error') {
      toast.error(alertMessage);
    } else if (resolvedType === 'warning') {
      toast.warning(alertMessage);
    } else if (resolvedType === 'info') {
      toast.info(alertMessage);
    } else {
      toast.success(alertMessage);
    }
  }, []);

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

  const prompt = useCallback((message, options = {}) => (
    new Promise((resolve) => {
      promptResolverRef.current = resolve;
      setPromptDialog({
        title: options.title || 'Enter a value',
        message: normalizeMessage(message),
        value: String(options.value || ''),
        confirmText: options.confirmText || 'Save',
        cancelText: options.cancelText || 'Cancel',
      });
    })
  ), []);

  const resolvePrompt = useCallback((value) => {
    if (promptResolverRef.current) {
      promptResolverRef.current(value);
      promptResolverRef.current = null;
    }
    setPromptDialog(null);
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
    <AppDialogContext.Provider value={{ notify, confirm, prompt }}>
      {children}
      <Toaster />
      {confirmDialog && (
        <div
          className="app-dialog-overlay app-confirm-backdrop fixed inset-0 z-[20010] grid place-items-center p-[18px] bg-[color-mix(in_srgb,var(--heading)_32%,transparent)] backdrop-blur-[4px]"
          role="presentation"
          onClick={() => resolveConfirm(false)}
        >
          <div
            className="app-dialog-modal app-confirm w-[min(420px,100%)] p-[18px] text-[var(--text-primary)] bg-[var(--surface-elevated)] [border:var(--dashboard-card-border)] rounded-[18px] max-md:rounded-[16px] shadow-[0_26px_70px_-36px_rgba(15,23,42,0.65)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm__header flex items-center gap-2.5 mb-2.5">
              <span className="app-dialog-modal__icon app-confirm__mark inline-flex items-center justify-center w-7 h-7 shrink-0 text-white bg-[var(--button-bg)] rounded-full font-[800]" aria-hidden="true">
                <CircleAlert size={17} />
              </span>
              <h2 id="app-confirm-title" className="m-0 text-[var(--heading)] text-[17px] leading-[1.2]">{confirmDialog.title}</h2>
            </div>
            <p className="app-dialog-modal__content m-0 text-[var(--text-secondary)] text-[14px] leading-[1.5]">{confirmDialog.message}</p>
            <div className="app-dialog-modal__actions app-confirm__actions flex justify-end gap-2.5 mt-[18px]">
              <button
                type="button"
                className="app-dialog-button app-confirm__cancel min-h-[38px] px-3.5 py-2 rounded-xl font-bold cursor-pointer text-[var(--text-secondary)] bg-[var(--surface-muted)] border border-[var(--divider-strong)]"
                onClick={() => resolveConfirm(false)}
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                className="app-dialog-button app-confirm__confirm min-h-[38px] px-3.5 py-2 rounded-xl font-bold cursor-pointer text-white bg-[var(--button-bg)] border border-transparent disabled:opacity-55 disabled:cursor-not-allowed"
                onClick={() => resolveConfirm(true)}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
      {promptDialog && (
        <div
          className="app-dialog-overlay app-confirm-backdrop fixed inset-0 z-[20010] grid place-items-center p-[18px] bg-[color-mix(in_srgb,var(--heading)_32%,transparent)] backdrop-blur-[4px]"
          role="presentation"
          onClick={() => resolvePrompt(null)}
        >
          <form
            className="app-dialog-modal app-confirm app-prompt w-[min(420px,100%)] p-[18px] text-[var(--text-primary)] bg-[var(--surface-elevated)] [border:var(--dashboard-card-border)] rounded-[18px] max-md:rounded-[16px] shadow-[0_26px_70px_-36px_rgba(15,23,42,0.65)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-prompt-title"
            onSubmit={(event) => { event.preventDefault(); resolvePrompt(promptDialog.value.trim()); }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-confirm__header flex items-center gap-2.5 mb-2.5">
              <h2 id="app-prompt-title" className="m-0 text-[var(--heading)] text-[17px] leading-[1.2]">{promptDialog.title}</h2>
            </div>
            <p className="app-dialog-modal__content m-0 text-[var(--text-secondary)] text-[14px] leading-[1.5]">{promptDialog.message}</p>
            <input
              autoFocus
              aria-label={promptDialog.title}
              maxLength={150}
              value={promptDialog.value}
              onChange={(event) => setPromptDialog((current) => ({ ...current, value: event.target.value }))}
              className="app-dialog-modal__input w-full min-h-[42px] mt-3.5 px-3 py-[9px] border border-[var(--divider-strong)] rounded-xl outline-none bg-[var(--bg-card)] text-[var(--text-primary)] font-inherit focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
            />
            <div className="app-dialog-modal__actions app-confirm__actions flex justify-end gap-2.5 mt-[18px]">
              <button
                type="button"
                className="app-dialog-button app-confirm__cancel min-h-[38px] px-3.5 py-2 rounded-xl font-bold cursor-pointer text-[var(--text-secondary)] bg-[var(--surface-muted)] border border-[var(--divider-strong)]"
                onClick={() => resolvePrompt(null)}
              >
                {promptDialog.cancelText}
              </button>
              <button
                type="submit"
                className="app-dialog-button app-confirm__confirm min-h-[38px] px-3.5 py-2 rounded-xl font-bold cursor-pointer text-white bg-[var(--button-bg)] border border-transparent disabled:opacity-55 disabled:cursor-not-allowed"
                disabled={!promptDialog.value.trim()}
              >
                {promptDialog.confirmText}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  return useContext(AppDialogContext);
}
