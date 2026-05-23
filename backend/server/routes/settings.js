const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');

const SETTINGS_BLOB_KEY = 'x9$eA.7';
const OBFUSCATION_PREFIX = 'v1.';
const OBFUSCATION_SALT = 'Entrack.Settings.2026';
const LEGACY_OBFUSCATION_SALT = ['Ex', 'track.Settings.2026'].join('');

async function ensureUserSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.user_settings (
      user_id INTEGER PRIMARY KEY,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE public.user_settings
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
}

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)
);

const deepMerge = (target, source) => {
  const merged = { ...(isPlainObject(target) ? target : {}) };

  Object.entries(source || {}).forEach(([key, value]) => {
    if (value === undefined) return;

    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMerge(merged[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
};

const normalizeSettingsBody = (body) => {
  if (!isPlainObject(body)) return null;
  const serialized = JSON.stringify(body);
  if (serialized.length > 50 * 1024) return null;
  return JSON.parse(serialized);
};

const toBase64Url = (buffer) => buffer
  .toString('base64')
  .replaceAll('+', '-')
  .replaceAll('/', '_')
  .replaceAll('=', '');

const fromBase64Url = (value) => {
  const base64 = String(value || '')
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  return Buffer.from(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='), 'base64');
};

const xorBuffer = (buffer, salt = OBFUSCATION_SALT) => {
  const saltBuffer = Buffer.from(salt, 'utf8');
  const nextBuffer = Buffer.alloc(buffer.length);

  for (let index = 0; index < buffer.length; index += 1) {
    nextBuffer[index] = buffer[index] ^ saltBuffer[index % saltBuffer.length];
  }

  return nextBuffer;
};

const encodeSettingsForStorage = (settings) => ({
  [SETTINGS_BLOB_KEY]: `${OBFUSCATION_PREFIX}${toBase64Url(
    xorBuffer(Buffer.from(JSON.stringify(settings || {}), 'utf8'))
  )}`,
});

const decodeSettingsFromStorage = (storedSettings) => {
  if (!isPlainObject(storedSettings)) return {};

  const codedSettings = storedSettings[SETTINGS_BLOB_KEY];
  if (typeof codedSettings !== 'string') {
    return storedSettings;
  }

  try {
    const encoded = codedSettings.startsWith(OBFUSCATION_PREFIX)
      ? codedSettings.slice(OBFUSCATION_PREFIX.length)
      : codedSettings;
    const salts = [OBFUSCATION_SALT, LEGACY_OBFUSCATION_SALT];

    for (const salt of salts) {
      try {
        const decodedJson = xorBuffer(fromBase64Url(encoded), salt).toString('utf8');
        const decodedSettings = JSON.parse(decodedJson);
        if (isPlainObject(decodedSettings)) return decodedSettings;
      } catch {
        // Try the next salt for settings saved before the rename.
      }
    }

    return {};
  } catch {
    return {};
  }
};

router.get('/settings', authCheck, async (req, res) => {
  try {
    await ensureUserSettingsTable();

    const result = await pool.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, settings: {} });
    }

    res.json({
      success: true,
      settings: decodeSettingsFromStorage(result.rows[0].settings),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const saveSettings = async (req, res) => {
  try {
    await ensureUserSettingsTable();

    const incomingSettings = normalizeSettingsBody(req.body);

    if (!incomingSettings) {
      return res.status(400).json({
        success: false,
        error: 'Settings payload must be a JSON object',
      });
    }

    const exists = await pool.query(
      `SELECT settings FROM public.user_settings WHERE user_id = $1`,
      [req.userId]
    );

    const currentSettings = decodeSettingsFromStorage(exists.rows[0]?.settings || {});
    const mergedSettings = deepMerge(currentSettings, incomingSettings);

    const serializedSettings = JSON.stringify(encodeSettingsForStorage(mergedSettings));
    let result;

    if (exists.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO public.user_settings (user_id, settings)
         VALUES ($1, $2::jsonb)
         RETURNING settings`,
        [req.userId, serializedSettings]
      );
    } else {
      result = await pool.query(
        `UPDATE public.user_settings
         SET settings = $1::jsonb, updated_at = NOW()
         WHERE user_id = $2
         RETURNING settings`,
        [serializedSettings, req.userId]
      );
    }

    res.json({
      success: true,
      settings: decodeSettingsFromStorage(result.rows[0].settings),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/settings', authCheck, saveSettings);
router.patch('/settings', authCheck, saveSettings);

module.exports = router;
module.exports.ensureUserSettingsTable = ensureUserSettingsTable;
