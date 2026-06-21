const pool = require('../../infra/db/database');
const { TABLES } = require('../../config/tables');
const { ADMIN_ACCOUNT_TYPES } = require('./constants');

async function requireCtraderAdmin(req, res, next) {
  try {
    const userResult = await pool.query(
      `SELECT account_type AS "accountType", is_deleted AS "isDeleted" FROM ${TABLES.users} WHERE id = $1`,
      [req.userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].isDeleted) {
      return res.status(403).json({ success: false, error: 'Admin account not found' });
    }

    const accountType = String(userResult.rows[0].accountType || '').toLowerCase();
    if (!ADMIN_ACCOUNT_TYPES.has(accountType)) {
      return res.status(403).json({
        success: false,
        error: 'cTrader integration is restricted to admin users',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify cTrader access',
    });
  }
}

module.exports = {
  requireCtraderAdmin,
};
