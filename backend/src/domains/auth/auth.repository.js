const postgres = require('../../infra/db/postgres');
const { TABLES, USER_SELECT } = require('../../core/constants/tables');

const authRepository = {
  async findById(userId) {
    const res = await postgres.query(
      `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE id = $1 AND is_deleted = false`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async findByEmailOrPhone(identifier) {
    const clean = String(identifier || '').trim().toLowerCase();
    const res = await postgres.query(
      `SELECT ${USER_SELECT} FROM ${TABLES.users} 
       WHERE (LOWER(email) = $1 OR phone = $1 OR mobile_normalized = $1) AND is_deleted = false`,
      [clean]
    );
    return res.rows[0] || null;
  },

  async findByEmail(email) {
    const clean = String(email || '').trim().toLowerCase();
    const res = await postgres.query(
      `SELECT ${USER_SELECT} FROM ${TABLES.users} WHERE LOWER(email) = $1 AND is_deleted = false`,
      [clean]
    );
    return res.rows[0] || null;
  },

  async createUser({ email, passwordHash, firstName, lastName, phone, preferredCurrency }) {
    const name = [firstName, lastName].filter(Boolean).join(' ') || null;
    const res = await postgres.query(
      `INSERT INTO ${TABLES.users} 
       (email, email_normalized, email_original, password, password_hash, first_name, last_name, name, phone, mobile_normalized, preferred_currency, auth_provider)
       VALUES ($1, $1, $1, $2, $2, $3, $4, $5, $6, $6, $7, 'local')
       RETURNING ${USER_SELECT}`,
      [email.toLowerCase(), passwordHash, firstName, lastName, name, phone, preferredCurrency]
    );
    return res.rows[0];
  },

  async updateProfile(userId, { firstName, lastName, email, phone, passwordHash, preferredCurrency }) {
    const res = await postgres.query(
      `UPDATE ${TABLES.users} SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         email_normalized = COALESCE(LOWER($3), email_normalized),
         email_original = COALESCE($3, email_original),
         phone = COALESCE($4, phone),
         mobile_normalized = COALESCE($4, mobile_normalized),
         password = COALESCE($5, password),
         password_hash = COALESCE($5, password_hash),
         preferred_currency = COALESCE($6, preferred_currency),
         updated_at = NOW()
       WHERE id = $7 AND is_deleted = false
       RETURNING ${USER_SELECT}`,
      [firstName, lastName, email, phone, passwordHash, preferredCurrency, userId]
    );
    return res.rows[0] || null;
  },

  async updatePassword(userId, passwordHash) {
    await postgres.query(
      `UPDATE ${TABLES.users} SET password = $1, password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
  },

  async softDeleteUser(userId) {
    await postgres.query(`DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`, [userId]);
    await postgres.query(
      `UPDATE ${TABLES.users} SET is_deleted = true, status = 'deleted', updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  },

  async saveRefreshToken({ userId, tokenHash, token, expiresAt, userAgent, ipAddress }) {
    await postgres.query(
      `INSERT INTO ${TABLES.refreshTokens} (user_id, token_hash, token, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tokenHash, token, expiresAt, String(userAgent || '').slice(0, 512), ipAddress]
    );
  },

  async findRefreshToken(tokenHash) {
    const res = await postgres.query(
      `SELECT * FROM ${TABLES.refreshTokens} WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );
    return res.rows[0] || null;
  },

  async deleteRefreshToken(tokenHash) {
    await postgres.query(`DELETE FROM ${TABLES.refreshTokens} WHERE token_hash = $1`, [tokenHash]);
  },

  async deleteAllUserRefreshTokens(userId) {
    await postgres.query(`DELETE FROM ${TABLES.refreshTokens} WHERE user_id = $1`, [userId]);
  }
};

module.exports = authRepository;
