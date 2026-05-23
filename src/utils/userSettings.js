import api from "./serve";
import { decodeStorageValue, encodeStorageValue } from "./obfuscatedStorage";

export const SETTINGS_STORAGE_KEY = "x9$eA.7";
export const LEGACY_SETTINGS_STORAGE_KEY = "entrack:userSettings";
const PREVIOUS_SETTINGS_STORAGE_KEY = ["ex", "track:userSettings"].join("");
let settingsSaveVersion = 0;
let activeSettingsSaves = 0;

export function loadCachedUserSettings() {
  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (cached) {
      return decodeStorageValue(cached) || {};
    }

    const legacyCached =
      localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY) ||
      localStorage.getItem(PREVIOUS_SETTINGS_STORAGE_KEY);
    if (legacyCached) {
      const settings = JSON.parse(legacyCached);
      cacheUserSettings(settings);
      localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_SETTINGS_STORAGE_KEY);
      return settings || {};
    }

    return {};
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    localStorage.removeItem(PREVIOUS_SETTINGS_STORAGE_KEY);
    return {};
  }
}

function cacheUserSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, encodeStorageValue(settings || {}));
    localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
    localStorage.removeItem(PREVIOUS_SETTINGS_STORAGE_KEY);
  } catch {
    // Storage can fail in private mode; backend settings still work.
  }
}

function mergeSettings(base, patch) {
  const nextSettings = { ...(base || {}) };

  Object.entries(patch || {}).forEach(([key, value]) => {
    nextSettings[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? { ...(nextSettings[key] || {}), ...value }
        : value;
  });

  return nextSettings;
}

export async function loadUserSettings() {
  const loadVersion = settingsSaveVersion;
  const { data } = await api.get("/settings");
  const settings = data?.settings || {};
  if (activeSettingsSaves === 0 && loadVersion === settingsSaveVersion) {
    cacheUserSettings(settings);
  }
  return settings;
}

export async function saveUserSettings(settings) {
  const saveVersion = settingsSaveVersion + 1;
  settingsSaveVersion = saveVersion;
  activeSettingsSaves += 1;

  cacheUserSettings(mergeSettings(loadCachedUserSettings(), settings));

  try {
    const { data } = await api.post("/settings", settings);

    if (!data?.success) {
      throw new Error(data?.error || "Settings save failed");
    }

    const savedSettings = mergeSettings(loadCachedUserSettings(), data?.settings || {});
    if (saveVersion === settingsSaveVersion) {
      cacheUserSettings(savedSettings);
    }
    return savedSettings;
  } finally {
    activeSettingsSaves = Math.max(0, activeSettingsSaves - 1);
  }
}
