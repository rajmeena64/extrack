import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { decodeStorageValue, encodeStorageValue } from '../utils/obfuscatedStorage';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'k7@dm.2';
const LEGACY_THEME_STORAGE_KEY = 'entrack:darkMode';
const PREVIOUS_THEME_STORAGE_KEY = ['trade', 'analytics:darkMode'].join('');

function getStoredDarkMode() {
  try {
    const storedValue = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedValue) {
      return Boolean(decodeStorageValue(storedValue));
    }

    const legacyValue =
      localStorage.getItem(LEGACY_THEME_STORAGE_KEY) ||
      localStorage.getItem(PREVIOUS_THEME_STORAGE_KEY);
    if (legacyValue !== null) {
      const nextDarkMode = legacyValue === 'true';
      storeDarkMode(nextDarkMode);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_THEME_STORAGE_KEY);
      return nextDarkMode;
    }

    return false;
  } catch {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    localStorage.removeItem(PREVIOUS_THEME_STORAGE_KEY);
    return false;
  }
}

function storeDarkMode(value) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, encodeStorageValue(Boolean(value)));
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    localStorage.removeItem(PREVIOUS_THEME_STORAGE_KEY);
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
