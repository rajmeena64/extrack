import React, { useEffect, useRef, useState } from "react";
import NEWS from "../Analytics/NEWS";
import LegacyIcon from "../Common/LegacyIcon";
import EconomicCalendarWidget from "./EconomicCalendarWidget";
import "../Analytics/Analytics.css";
import { useAuth } from "../../context/AuthContext";
import { loadUserSettings, saveUserSettings } from "../../utils/userSettings";

const CALENDAR_OPTIONS = [
  { value: "tradingview", label: "TradingView" },
  { value: "metatrader", label: "MetaTrader Calendar" },
];

function EconomicCalendar() {
  const { isAuthenticated } = useAuth();
  const [provider, setProvider] = useState("tradingview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

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
        const isValidProvider = CALENDAR_OPTIONS.some((option) => option.value === savedProvider);

        if (isCurrent && isValidProvider) {
          setProvider(savedProvider);
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const handleProviderChange = (nextProvider) => {
    if (isAuthenticated) {
      saveUserSettings({ economicCalendar: { provider: nextProvider } })
        .then(() => {
          setProvider(nextProvider);
          setSettingsOpen(false);
        })
        .catch(() => null);
      return;
    }

    setProvider(nextProvider);
    setSettingsOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <main className="main-content economic-calendar-page" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="analytics-topbar app-page-header">
          <div className="app-page-header__left">
            <h1 className="analytics-title app-page-title">Economic Calendar</h1>
          </div>

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
        </div>

        <div className="analytics-content">
          {provider === "metatrader" ? <EconomicCalendarWidget /> : <NEWS />}
        </div>
      </main>
    </div>
  );}

export default EconomicCalendar;
