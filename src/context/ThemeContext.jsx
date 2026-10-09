import React, { createContext, useState, useContext, useLayoutEffect, useCallback } from 'react';
import { decodeStorageValue, encodeStorageValue } from '../utils/storage/obfuscatedStorage';

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
  }
}

function applyThemeDOM(isDark) {
  if (typeof document === 'undefined') return;
  if (isDark) {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
}

function disableTransitions() {
  const css = document.createElement('style');
  css.setAttribute('type', 'text/css');
  css.setAttribute('id', 'theme-transition-lock');
  css.appendChild(
    document.createTextNode(
      `*, *::before, *::after {
        -webkit-transition: none !important;
        -moz-transition: none !important;
        -o-transition: none !important;
        -ms-transition: none !important;
        transition: none !important;
      }`
    )
  );
  document.head.appendChild(css);

  return () => {
    // eslint-disable-next-line no-unused-expressions
    window.getComputedStyle(document.body).opacity;

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (css.parentNode) {
          css.parentNode.removeChild(css);
        }
      }, 10);
    });
  };
}

function runWithThemeTransition(callback) {
  if (typeof document === 'undefined') {
    callback();
    return;
  }

  const restoreTransitions = disableTransitions();
  try {
    callback();
  } finally {
    restoreTransitions();
  }
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(getStoredDarkMode);

  useLayoutEffect(() => {
    applyThemeDOM(darkMode);
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => {
    runWithThemeTransition(() => {
      setDarkMode((prev) => {
        const nextDarkMode = !prev;
        storeDarkMode(nextDarkMode);
        return nextDarkMode;
      });
    });
  }, []);

  const setDarkModePreference = useCallback((value) => {
    const nextDarkMode = Boolean(value);
    runWithThemeTransition(() => {
      storeDarkMode(nextDarkMode);
      setDarkMode(nextDarkMode);
    });
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
