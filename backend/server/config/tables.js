const TABLES = {
  users: 'app_auth.users',
  refreshTokens: 'app_auth.refresh_tokens',
  emailVerifications: 'app_auth.email_verifications',
  passwordResets: 'app_auth.password_resets',
  userSettings: 'app.user_settings',
  manualTrades: 'trading.manual_trades',
  apiTrades: 'trading.api_trades',
  mt5Accounts: 'mt5.accounts',
  mt5ConnectionRequests: 'mt5.connection_requests',
  mt5VpsJobs: 'mt5.vps_jobs',
  adminIntegrations: 'system.admin_integrations',
  schemaMigrations: 'system.schema_migrations',
};

const USER_SELECT = `
  id AS "ID",
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  phone,
  password,
  preferred_currency,
  is_deleted AS "isDeleted",
  reset_token,
  reset_token_expiry,
  name,
  email_normalized,
  email_original,
  password_hash,
  mobile_normalized,
  mobile_verified_at,
  email_verified_at,
  account_type AS "accountType",
  status,
  created_at AS "createdAt",
  created_at,
  updated_at,
  last_login_at
`;

const MANUAL_TRADE_SELECT = `
  id AS "ID",
  id,
  user_id,
  symbol,
  trade_type,
  price,
  category,
  exit_price,
  strategy,
  quantity,
  pnl,
  notes,
  screenshots,
  timestamp,
  unique_id,
  open_timestamp,
  close_timestamp,
  is_breakeven,
  created_at,
  updated_at
`;

const API_TRADE_SELECT = `
  id AS "ID",
  id,
  user_id,
  account_id,
  platform,
  symbol,
  trade_type,
  quantity,
  price,
  exit_price,
  pnl,
  timestamp,
  created_at,
  ticket,
  notes,
  screenshots,
  strategy,
  unique_id,
  percent_change,
  open_timestamp,
  close_timestamp,
  is_breakeven,
  category,
  symbol_path,
  symbol_description
`;

function logAuthTableUse(action, table) {
  if (process.env.NODE_ENV !== 'development') return;
  console.info('auth.table_use', { action, table });
}

module.exports = {
  API_TRADE_SELECT,
  logAuthTableUse,
  MANUAL_TRADE_SELECT,
  TABLES,
  USER_SELECT,
};
