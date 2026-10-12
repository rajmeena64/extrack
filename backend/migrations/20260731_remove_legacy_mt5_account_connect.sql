-- Remove only the retired MT5 account-connect and worker orchestration model.
-- mt5.accounts and its trade-ingest columns remain because API trade ingestion
-- resolves the owning user and updates account balances through this table.

DROP TABLE IF EXISTS mt5.sync_jobs;
DROP TABLE IF EXISTS mt5.vps_jobs;
DROP TABLE IF EXISTS mt5.connection_requests;

DROP INDEX IF EXISTS mt5.mt5_accounts_instance_key_idx;

ALTER TABLE mt5.accounts
  DROP COLUMN IF EXISTS investor_password,
  DROP COLUMN IF EXISTS connection_status,
  DROP COLUMN IF EXISTS server_name,
  DROP COLUMN IF EXISTS login_id,
  DROP COLUMN IF EXISTS broker_server,
  DROP COLUMN IF EXISTS instance_key,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS connected_at,
  DROP COLUMN IF EXISTS last_synced_at,
  DROP COLUMN IF EXISTS last_sync_status,
  DROP COLUMN IF EXISTS last_sync_error;
