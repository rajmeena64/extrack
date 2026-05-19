import api from "./serve";

const SETTINGS_STORAGE_KEY = "extrack:userSettings";

export function loadCachedUserSettings() {
  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    return {};
  }
}

function cacheUserSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings || {}));
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
  const { data } = await api.get("/settings");
  const settings = data?.settings || {};
  cacheUserSettings(settings);
  return settings;
}

export async function saveUserSettings(settings) {
  cacheUserSettings(mergeSettings(loadCachedUserSettings(), settings));

  const { data } = await api.post("/settings", settings);

  if (!data?.success) {
    throw new Error(data?.error || "Settings save failed");
  }

  const savedSettings = mergeSettings(loadCachedUserSettings(), data?.settings || {});
  cacheUserSettings(savedSettings);
  return savedSettings;
}
