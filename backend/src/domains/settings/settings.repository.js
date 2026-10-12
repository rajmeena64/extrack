const postgres = require('../../infra/db/postgres');
const { TABLES } = require('../../core/constants/tables');

const settingsRepository = {
  async getSettings(userId) {
    const res = await postgres.query(
      `SELECT settings FROM ${TABLES.userSettings} WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0]?.settings || null;
  },

  async saveSettings(userId, serializedSettings) {
    const res = await postgres.query(`
      INSERT INTO ${TABLES.userSettings} (user_id, settings, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET settings = $2::jsonb, updated_at = NOW()
      RETURNING settings
    `, [userId, serializedSettings]);
    return res.rows[0]?.settings || null;
  }
};

module.exports = settingsRepository;
