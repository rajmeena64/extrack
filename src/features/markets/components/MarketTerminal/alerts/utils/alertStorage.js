import { ALERTS_STORAGE_KEY } from '../constants/alertConstants';

export const loadSavedAlerts = () => {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
