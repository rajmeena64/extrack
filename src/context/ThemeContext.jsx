import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'tradeanalytics:darkMode';

function getStoredDarkMode() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function storeDarkMode(value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, String(Boolean(value)));
  } catch {
    // Theme still works for this session if storage is unavailable.
  }
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(getStoredDarkMode);

  useLayoutEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const nextDarkMode = !prev;
      storeDarkMode(nextDarkMode);
      return nextDarkMode;
    });
  }, []);

  const setDarkModePreference = useCallback((value) => {
    const nextDarkMode = Boolean(value);
    storeDarkMode(nextDarkMode);
    setDarkMode(nextDarkMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkModePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
