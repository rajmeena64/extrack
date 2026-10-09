import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NEWS from "./NEWS";
import { Settings } from "lucide-react";
import EconomicCalendarWidget from "./EconomicCalendarWidget";
import { useAuth } from "@/context/AuthContext";
import { loadCachedUserSettings, saveUserSettings } from "@/utils/user/userSettings";
import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import PageHeader from "@/components/Layout/PageHeader";
import { useUserSettings } from "@/hooks/useUserSettings";

const CALENDAR_OPTIONS = [
  { value: "tradingview", label: "TradingView" },
  { value: "metatrader", label: "MetaTrader Calendar" },
];

const LOADED_CALENDARS = new Set();

const isValidProvider = (provider) => (
  CALENDAR_OPTIONS.some((option) => option.value === provider)
);

const getCachedProvider = () => {
  const provider = loadCachedUserSettings()?.economicCalendar?.provider;
  return isValidProvider(provider) ? provider : "tradingview";
};

function EconomicCalendar() {
  const { isAuthenticated } = useAuth();
  const userSettingsQuery = useUserSettings();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(getCachedProvider);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const providerChangeVersion = useRef(0);

  useEffect(() => {
    if (provider) {
      LOADED_CALENDARS.add(provider);
    }
  }, [provider]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const savedProvider = userSettingsQuery.data?.economicCalendar?.provider;
    if (providerChangeVersion.current === 0 && isValidProvider(savedProvider)) {
      window.queueMicrotask(() => {
        if (providerChangeVersion.current === 0) setProvider(savedProvider);
      });
    }
  }, [isAuthenticated, userSettingsQuery.data]);

  const handleProviderChange = (nextProvider) => {
    providerChangeVersion.current += 1;
    setProvider(nextProvider);
    setSettingsOpen(false);

    if (isAuthenticated) {
      saveUserSettings({ economicCalendar: { provider: nextProvider } })
        .catch(() => null);
    }
  };

  return (
    <MainContentWrapper className="economic-calendar-page flex flex-col h-screen min-h-screen px-0 overflow-hidden [&_.app-page-header]:mx-0">
      <PageHeader
        className="mx-0"
        title="Economic Calendar"
        onBack={() => navigate(-1)}
        actions={(
          <div className="economic-calendar-settings relative ml-auto" ref={settingsRef}>
            <button
              className="economic-calendar-settings__button w-[34px] h-[34px] inline-flex items-center justify-center border border-[var(--border-light)] rounded-[8px] bg-[var(--bg-card)] text-[var(--text-primary)] cursor-pointer transition-[background,color,transform] duration-200 ease hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)] hover:-translate-y-px"
              type="button"
              onClick={() => setSettingsOpen((previous) => !previous)}
              aria-label="Calendar settings"
              title="Calendar settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {settingsOpen && (
              <div className="economic-calendar-settings__menu absolute top-[calc(100%+8px)] right-0 z-20 min-w-[220px] p-2 border border-[var(--border-light)] rounded-[10px] bg-[var(--bg-card)] shadow-[var(--shadow-md)]">
                <span className="economic-calendar-settings__eyebrow block pt-1.5 px-2 pb-2 text-[var(--text-secondary)] text-[11px] font-bold uppercase">Calendar source</span>
                {CALENDAR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`economic-calendar-settings__option ${provider === option.value ? "active bg-[var(--bg-hover)] text-[var(--accent-ink)]" : ""} w-full min-h-[36px] flex items-center justify-between gap-3 px-[9px] py-2 border-0 rounded-[8px] bg-transparent text-[var(--text-primary)] text-[13px] cursor-pointer text-left hover:bg-[var(--bg-hover)] hover:text-[var(--accent-ink)]`}
                    type="button"
                    onClick={() => handleProviderChange(option.value)}
                  >
                    <span>{option.label}</span>
                    {provider === option.value && <strong className="text-[var(--primary)] text-[11px]">Active</strong>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      />

      <div className="analytics-content economic-calendar-content flex-1 pt-2 min-h-0 overflow-hidden flex flex-col">
        <div
          className="economic-calendar-provider-panel w-full h-full min-h-0"
          style={{ display: provider === "metatrader" ? "block" : "none" }}
        >
          <EconomicCalendarWidget />
        </div>
        <div
          className="economic-calendar-provider-panel w-full h-full min-h-0"
          style={{ display: provider === "tradingview" ? "block" : "none" }}
        >
          <NEWS />
        </div>
      </div>
    </MainContentWrapper>
  );
}

export default EconomicCalendar;
