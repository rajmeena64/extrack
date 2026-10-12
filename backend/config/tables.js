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
};

const USER_SELECT = `
  id AS "ID", first_name AS "firstName", last_name AS "lastName", email, phone,
  password, preferred_currency, is_deleted AS "isDeleted", reset_token,
  reset_token_expiry, name, email_normalized, email_original, password_hash,
  mobile_normalized, mobile_verified_at, email_verified_at, google_id,
  auth_provider, profile_picture, account_type AS "accountType", status,
  created_at AS "createdAt", created_at, updated_at, last_login_at
`;

const MANUAL_TRADE_SELECT = `
  id AS "ID", id, user_id, broker_connection_id, source, instrument_id,
  product_type, symbol, side, status, close_reason, category,
  quantity, quantity_unit, entry_price, exit_price, total_charges,
  gross_pnl, net_pnl, pnl_currency, pnl_source,
  strategy, notes, attachments, attachments AS screenshots, custom_fields,
  charges, entry_timestamp, exit_timestamp,
  COALESCE(unique_id, CAST(id AS TEXT)) AS unique_id, percent_change, stop_loss, take_profit, created_at, updated_at
`;

function logAuthTableUse(action, table) {
  // Debug log disabled
}

module.exports = { logAuthTableUse, MANUAL_TRADE_SELECT, TABLES, USER_SELECT };
