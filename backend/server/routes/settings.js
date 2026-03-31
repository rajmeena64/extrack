// routes/settings.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const {authCheck} = require('./auth'); // middleware from your auth.js

// GET user settings
router.get('/settings', authCheck, async (req, res) => {
  try {
    const userId = req.userId; // JWT se userId

    const result = await pool.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, settings: null });
    }

    res.json({ success: true, settings: result.rows[0].settings });
  } catch (err) {
    console.error("❌ GET SETTINGS ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST or UPDATE user settings
router.post('/settings', authCheck, async (req, res) => {
  try {
    const userId = req.userId; // JWT se
    const { filters, columns, currentMonth, currentYear } = req.body;
  //  console.log("👤 USER ID FROM AUTH:", req.userId);
    const settingsObject = { filters, columns, currentMonth, currentYear };

    // Check if user already has settings
    const exists = await pool.query(
      `SELECT * FROM public.user_settings WHERE user_id = $1`,
      [userId]
    );

    if (exists.rows.length === 0) {
      // Insert new
      const insert = await pool.query(
        `INSERT INTO public.user_settings (user_id, settings) VALUES ($1, $2) RETURNING *`,
        [userId, settingsObject]
      );
      return res.json({ success: true, settings: insert.rows[0].settings });
    }

    // Update existing
    const update = await pool.query(
      `UPDATE public.user_settings 
       SET settings = $1, updated_at = NOW() 
       WHERE user_id = $2 
       RETURNING *`,
      [settingsObject, userId]
    );

    res.json({ success: true, settings: update.rows[0].settings });
  } catch (err) {
    console.error("❌ SAVE SETTINGS ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;