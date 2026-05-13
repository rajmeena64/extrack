const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authCheck } = require('./auth');

router.get('/settings', authCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, settings: null });
    }

    res.json({ success: true, settings: result.rows[0].settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings', authCheck, async (req, res) => {
  try {
    const { filters, columns, currentMonth, currentYear } = req.body;
    const settingsObject = { filters, columns, currentMonth, currentYear };

    const exists = await pool.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [req.userId]
    );

    if (exists.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO public.user_settings (user_id, settings) VALUES ($1, $2) RETURNING *`,
        [req.userId, settingsObject]
      );
      return res.json({ success: true, settings: insert.rows[0].settings });
    }

    const update = await pool.query(
      `UPDATE public.user_settings
       SET settings = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [settingsObject, req.userId]
    );

    res.json({ success: true, settings: update.rows[0].settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
