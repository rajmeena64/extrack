import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, TriangleAlert } from '@/icons/lucideIcons';
import { Toggle } from '@/components/ui/toggle';
import { useAppDialog } from '@/context/AppDialogContext';
import { getWebPushStatus, registerWebPush, unregisterWebPush } from '@/utils/notifications/webPush';

export default function NotificationSettings() {
  const { notify } = useAppDialog();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ supported: false, permission: 'default', subscribed: false });

  const refreshStatus = async () => {
    const s = await getWebPushStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    getWebPushStatus().then((s) => {
      if (!cancelled) {
        setStatus(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (checked) => {
    setLoading(true);
    if (checked) {
      const ok = await registerWebPush();
      if (ok) {
        notify?.('Web push notifications enabled', 'success');
      } else {
        const current = await getWebPushStatus();
        if (current.permission === 'denied') {
          notify?.('Notifications are blocked by your browser settings', 'warning');
        } else {
          notify?.('Could not enable notifications', 'error');
        }
      }
    } else {
      await unregisterWebPush();
      notify?.('Web push notifications disabled', 'info');
    }
    await refreshStatus();
  };

  const isEnabled = status.subscribed && status.permission === 'granted';

  return (
    <div className="settings-modal__section flex flex-col gap-4">
      <div>
        <h3 className="settings-modal__section-title text-base font-bold text-[var(--text-primary)] m-0">Notifications</h3>
        <p className="settings-modal__section-desc text-[0.8125rem] text-[var(--text-secondary)] -mt-1 mb-1 mx-0 leading-[1.45]">Manage browser push notifications for trades, market alerts, and system updates.</p>
      </div>

      <div className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-secondary))] text-[var(--text-primary)] shrink-0 mt-0.5">
              <Bell size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">Browser Push Notifications</span>
              <span className="text-xs text-[var(--text-secondary)] mt-0.5">Receive native desktop/mobile alerts even when Entrack is closed or running in background.</span>
            </div>
          </div>
          <Toggle isSelected={isEnabled} isDisabled={loading || !status.supported} onChange={handleToggle} size="md" />
        </div>

        <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)]">
          {status.permission === 'granted' ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={13} /> Browser permission allowed
            </span>
          ) : status.permission === 'denied' ? (
            <span className="flex items-center gap-1.5 text-red-500 font-medium">
              <TriangleAlert size={13} /> Permission blocked in browser settings
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              Browser permission not granted yet
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
