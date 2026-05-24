import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NEWS from "../Analytics/NEWS";
import LegacyIcon from "../Common/LegacyIcon";
import EconomicCalendarWidget from "./EconomicCalendarWidget";
import "../Analytics/Analytics.css";
import { useAuth } from "../../context/AuthContext";
import { loadCachedUserSettings, loadUserSettings, saveUserSettings } from "../../utils/userSettings";
import MainContentWrapper from "../Layout/MainContentWrapper";
import PageHeader from "../Layout/PageHeader";

const CALENDAR_OPTIONS = [
  { value: "tradingview", label: "TradingView" },
  { value: "metatrader", label: "MetaTrader Calendar" },
];

// Global tracker to persist calendar source loading
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

    let isCurrent = true;

    loadUserSettings()
      .then((settings) => {
        const savedProvider = settings?.economicCalendar?.provider;

        if (isCurrent && providerChangeVersion.current === 0 && isValidProvider(savedProvider)) {
          setProvider(savedProvider);
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

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
    <MainContentWrapper className="economic-calendar-page">
        <PageHeader
          title="Economic Calendar"
          onBack={() => navigate(-1)}
          actions={(
          <div className="economic-calendar-settings" ref={settingsRef}>
            <button
              className="economic-calendar-settings__button"
              type="button"
              onClick={() => setSettingsOpen((previous) => !previous)}
              aria-label="Calendar settings"
              title="Calendar settings"
            >
              <LegacyIcon className="fas fa-cog" />
            </button>

            {settingsOpen && (
              <div className="economic-calendar-settings__menu">
                <span className="economic-calendar-settings__eyebrow">Calendar source</span>
                {CALENDAR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`economic-calendar-settings__option ${provider === option.value ? "active" : ""}`}
                    type="button"
                    onClick={() => handleProviderChange(option.value)}
                  >
                    <span>{option.label}</span>
                    {provider === option.value && <strong>Active</strong>}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        />

        <div className="analytics-content">
          <div style={{ display: provider === "metatrader" ? "block" : "none", height: "100%" }}>
            <EconomicCalendarWidget />
          </div>
          <div style={{ display: provider === "tradingview" ? "block" : "none", height: "100%" }}>
            <NEWS />
          </div>
        </div>
    </MainContentWrapper>
  );}

export default EconomicCalendar;
