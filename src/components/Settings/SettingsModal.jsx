import React, { useState, lazy, Suspense } from 'react';
import { Clock, Globe, LayoutDashboard, Search } from '../../icons/lucideIcons';
import { TIME_ZONES } from '../../utils/trading/tradeTime';
import { saveUserSettings } from '../../utils/user/userSettings';
import { useAppDialog } from '../../context/AppDialogContext';
import { Modal } from '../ui';

const DashboardSettings = lazy(() => import('../Sidebar/DashboardSettings'));

function SettingsModal({ isOpen, onClose, timeZone, setTimeZone }) {
  const [settingsTab, setSettingsTab] = useState('layout');
  const [tzSearch, setTzSearch] = useState('');
  const { notify } = useAppDialog();

  const handleClose = () => {
    setSettingsTab('layout');
    setTzSearch('');
    onClose();
  };

  const handleTimeZoneSelect = async (tz) => {
    if (tz === timeZone) return;
    const prev = timeZone;
    setTimeZone(tz);
    try {
      await saveUserSettings({ preferences: { timeZone: tz } });
      notify('Timezone updated', 'success');
    } catch {
      setTimeZone(prev);
      notify('Timezone could not be updated', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Settings" size="lg" bodyClassName="p-0">
      <div className="settings-modal__layout flex flex-col sm:flex-row h-full min-h-0 overflow-hidden">
        <nav className="settings-modal__sidebar settings-modal__nav w-full sm:w-[200px] shrink-0 border-b sm:border-b-0 sm:border-r border-[var(--border-light)] px-3 py-2 sm:px-2 sm:py-3 flex flex-row sm:flex-col gap-1 sm:gap-[2px] overflow-x-auto overflow-y-hidden sm:overflow-x-hidden sm:overflow-y-auto">
          <button type="button" className={`settings-modal__nav-item settings-modal__tab flex items-center gap-2.5 px-3.5 py-2 sm:px-3 sm:py-2.5 border-0 bg-transparent text-xs sm:text-[0.8125rem] font-medium rounded-lg cursor-pointer transition-colors duration-150 text-left w-auto sm:w-full shrink-0 whitespace-nowrap hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${settingsTab === 'layout' ? 'settings-modal__nav-item--active bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-secondary))] text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`} onClick={() => setSettingsTab('layout')}>
            <LayoutDashboard size={16} />
            <span>Dashboard Layout</span>
          </button>
          <button type="button" className={`settings-modal__nav-item settings-modal__tab flex items-center gap-2.5 px-3.5 py-2 sm:px-3 sm:py-2.5 border-0 bg-transparent text-xs sm:text-[0.8125rem] font-medium rounded-lg cursor-pointer transition-colors duration-150 text-left w-auto sm:w-full shrink-0 whitespace-nowrap hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] ${settingsTab === 'timezone' ? 'settings-modal__nav-item--active bg-[color-mix(in_srgb,var(--accent-ink)_10%,var(--bg-secondary))] text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`} onClick={() => setSettingsTab('timezone')}>
            <Globe size={16} />
            <span>Timezone</span>
          </button>
        </nav>
        <div className="settings-modal__content flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          {settingsTab === 'layout' && (
            <div className="settings-modal__section flex flex-col gap-4">
              <h3 className="settings-modal__section-title text-base font-bold text-[var(--text-primary)] m-0">Dashboard Layout</h3>
              <p className="settings-modal__section-desc text-[0.8125rem] text-[var(--text-secondary)] -mt-2 mb-1 mx-0 leading-[1.45]">Choose how your dashboard components are arranged.</p>
              <Suspense fallback={null}>
                <DashboardSettings />
              </Suspense>
            </div>
          )}
          {settingsTab === 'timezone' && (
            <div className="settings-modal__section flex flex-col gap-4">
              <h3 className="settings-modal__section-title text-base font-bold text-[var(--text-primary)] m-0">Timezone</h3>
              <p className="settings-modal__section-desc text-[0.8125rem] text-[var(--text-secondary)] -mt-2 mb-1 mx-0 leading-[1.45]">Select your preferred timezone for trade timestamps and calendar display.</p>
              <div className="settings-modal__tz-current flex items-center gap-2 px-3.5 py-2.5 bg-[color-mix(in_srgb,var(--accent-ink)_8%,var(--bg-secondary))] border border-[color-mix(in_srgb,var(--accent-ink)_20%,var(--border-light))] rounded-lg text-[0.8125rem] text-[var(--text-primary)]">
                <Clock size={14} />
                <span>Current: <strong>{timeZone}</strong></span>
              </div>
              <div className="settings-modal__tz-search settings-modal__search flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg transition-colors duration-150 focus-within:border-[var(--accent-ink)] [&>svg]:text-[var(--text-secondary)] [&>svg]:shrink-0">
                <Search size={14} className="text-[var(--text-secondary)] shrink-0" />
                <input type="text" placeholder="Search timezones..." value={tzSearch} onChange={(e) => setTzSearch(e.target.value)} className="settings-modal__tz-search-input border-0 bg-transparent outline-none text-[0.8125rem] text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)] font-inherit" />
              </div>
              <div className="settings-modal__tz-list flex flex-col gap-[1px] max-h-[250px] sm:max-h-[400px] overflow-y-auto border border-[var(--border-light)] rounded-lg bg-[var(--bg-secondary)]">
                {TIME_ZONES
                  .filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
                  .map((tz) => (
                    <button key={tz} type="button" className={`settings-modal__tz-item flex items-center justify-between px-3.5 py-[9px] border-0 border-b border-[var(--border-light)] last:border-b-0 text-[var(--text-primary)] text-[0.8125rem] cursor-pointer text-left transition-colors duration-100 hover:bg-[var(--bg-hover)] ${tz === timeZone ? 'settings-modal__tz-item--active bg-[color-mix(in_srgb,var(--accent-ink)_8%,transparent)] font-semibold' : 'bg-transparent'}`} onClick={() => handleTimeZoneSelect(tz)}>
                      <span className="settings-modal__tz-item-label min-w-0 truncate">{tz.replaceAll('_', ' ')}</span>
                      {tz === timeZone && (
                        <span className="settings-modal__tz-item-badge text-[0.6875rem] font-semibold text-[var(--accent-ink)] bg-[color-mix(in_srgb,var(--accent-ink)_12%,transparent)] px-2 py-0.5 rounded-[10px] shrink-0 ml-2">Active</span>
                      )}
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default SettingsModal;
