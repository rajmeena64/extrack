const TABLES = {
  users: 'app_auth.users',
  refreshTokens: 'app_auth.refresh_tokens',
  oauthLoginCodes: 'app_auth.oauth_login_codes',
  emailVerifications: 'app_auth.email_verifications',
  passwordResets: 'app_auth.password_resets',
  userSettings: 'app.user_settings',
  trades: 'trading.trades',
  journalEntries: 'trading.journal_entries',
  mt5Accounts: 'mt5.accounts',
  adminIntegrations: 'system.admin_integrations',
  schemaMigrations: 'system.schema_migrations',
  instruments: 'trading_catalog.instruments'
};

const USER_SELECT = `id AS "ID", first_name AS "firstName", last_name AS "lastName", email, phone, password, preferred_currency, is_deleted AS "isDeleted", reset_token, reset_token_expiry, name, email_normalized, email_original, password_hash, mobile_normalized, mobile_verified_at, email_verified_at, google_id, auth_provider, profile_picture, account_type AS "accountType", status, created_at AS "createdAt", created_at, updated_at, last_login_at`;

module.exports = { TABLES, USER_SELECT };
