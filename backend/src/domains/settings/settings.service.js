const settingsRepository = require('./settings.repository');
const AppError = require('../../core/errors/AppError');

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz }).format();
    return true;
  } catch {
    return false;
  }
}

function deepMerge(target, source) {
  const merged = { ...(target || {}) };
  Object.entries(source || {}).forEach(([key, val]) => {
    if (val === undefined) return;
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof merged[key] === 'object') {
      merged[key] = deepMerge(merged[key], val);
    } else {
      merged[key] = val;
    }
  });
  return merged;
}

const settingsService = {
  async getSettings(userId) {
    const raw = await settingsRepository.getSettings(userId);
    return raw || {};
  },

  async updateSettings(userId, incoming) {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      throw AppError.badRequest('Settings payload must be an object');
    }

    if (incoming.preferences?.timeZone && !isValidTimeZone(incoming.preferences.timeZone)) {
      throw AppError.badRequest('Invalid timezone');
    }

    const current = await this.getSettings(userId);
    const merged = deepMerge(current, incoming);
    const saved = await settingsRepository.saveSettings(userId, JSON.stringify(merged));
    return saved || merged;
  }
};

module.exports = settingsService;
