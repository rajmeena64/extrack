const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');

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
  return JSON.parse(JSON.stringify(body));
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

    res.json({ success: true, settings: result.rows[0].settings });
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

    const currentSettings = exists.rows[0]?.settings || {};
    const mergedSettings = deepMerge(currentSettings, incomingSettings);

    const serializedSettings = JSON.stringify(mergedSettings);
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

    res.json({ success: true, settings: result.rows[0].settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/settings', authCheck, saveSettings);
router.patch('/settings', authCheck, saveSettings);

module.exports = router;
module.exports.ensureUserSettingsTable = ensureUserSettingsTable;
