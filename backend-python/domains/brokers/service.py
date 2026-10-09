import os
import json
import uuid
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from infra.db.postgres import init_db
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from domains.trading.writes import insert_trades_batch
from integrations.brokers.registry import broker_registry

POPULAR_BROKERS = ['mt4', 'mt5', 'ctrader', 'binance', 'robinhood', 'coinbase', 'angel-one', 'alpha-capital-group']

BROKER_SELECT = """
  id, name, slug, provider_type AS "providerType", logo_path AS "logoPath",
  COALESCE(supported_instruments, '{}') AS "supportedInstruments",
  COALESCE(supported_trade_methods, '{}') AS "supportedTradeMethods",
  COALESCE(search_keywords, '{}') AS "searchKeywords",
  is_active AS "isActive", is_visible AS "isVisible", sort_order AS "sortOrder"
"""

CONN_SELECT = """
  connection.id, connection.external_account_id AS "externalAccountId", connection.account_name AS "accountName",
  connection.account_currency AS "accountCurrency", connection.balance_snapshot AS "balanceSnapshot",
  connection.balance_updated_at AS "balanceUpdatedAt", connection.status, connection.metadata,
  connection.last_synced_at AS "lastSyncedAt", connection.last_sync_status AS "lastSyncStatus",
  connection.last_error AS "lastError", connection.connected_at AS "connectedAt",
  connection.created_at AS "createdAt", connection.updated_at AS "updatedAt",
  integration.id AS "integrationId", integration.trade_method AS "tradeMethod",
  broker.id AS "brokerId", broker.name AS "brokerName", broker.slug AS "brokerSlug",
  broker.logo_path AS "brokerLogoPath", platform.id AS "platformId",
  platform.name AS "platformName", platform.slug AS "platformSlug", platform.logo_path AS "platformLogoPath",
  COALESCE((
    SELECT JSONB_AGG(JSONB_BUILD_OBJECT(
      'id', available.id, 'tradeMethod', available.trade_method, 'platformId', available_platform.id,
      'platformName', COALESCE(available_platform.name, broker.name), 'platformSlug', COALESCE(available_platform.slug, broker.slug),
      'platformLogoPath', COALESCE(available_platform.logo_path, broker.logo_path),
      'isActive', (available.is_active AND COALESCE(available_platform.is_active, TRUE))
    ) ORDER BY available.sort_order, available.trade_method)
    FROM trading_catalog.broker_integrations available
    LEFT JOIN trading_catalog.platforms available_platform ON available_platform.id = available.platform_id
    WHERE available.broker_id = broker.id AND available.is_visible = TRUE
      AND (available_platform.id IS NULL OR available_platform.is_visible = TRUE)
  ), '[]'::jsonb) AS "supportedIntegrations"
"""

CONN_FROM = """
  FROM broker_connections.user_broker_connections connection
  JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
  JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
  LEFT JOIN trading_catalog.platforms platform ON platform.id = integration.platform_id
"""

def _format_conn(r: dict) -> dict:
    d = dict(r)
    for k in ("metadata", "balanceSnapshot", "supportedIntegrations"):
        if isinstance(d.get(k), str):
            try:
                d[k] = json.loads(d[k])
            except Exception:
                pass
    for k in ("id", "integrationId", "brokerId", "platformId"):
        if d.get(k):
            d[k] = str(d[k])
    return d

def _cipher():
    secret = os.getenv("USER_BROKER_CREDENTIALS_KEY", "")
    if len(secret) < 32:
        raise AppError(ERROR_MESSAGES["SERVER"]["CONFIG_ERROR"])
    return AESGCM(hashlib.sha256(secret.encode()).digest())

def encrypt_credentials(payload: dict, user_id: int) -> str:
    iv = os.urandom(12)
    raw = _cipher().encrypt(iv, json.dumps(payload).encode(), f"user:{user_id}".encode())
    return f"enc:v1:{base64.b64encode(iv).decode()}.{base64.b64encode(raw[-16:]).decode()}.{base64.b64encode(raw[:-16]).decode()}"

def decrypt_credentials(envelope: str, user_id: int) -> dict:
    if not envelope or not envelope.startswith("enc:v1:"):
        raise AppError(ERROR_MESSAGES["BROKER"]["INVALID_ENVELOPE"])
    parts = envelope[7:].split(".")
    if len(parts) != 3:
        raise AppError(ERROR_MESSAGES["BROKER"]["INVALID_PAYLOAD"])
    iv, tag, ct = base64.b64decode(parts[0]), base64.b64decode(parts[1]), base64.b64decode(parts[2])
    return json.loads(_cipher().decrypt(iv, ct + tag, f"user:{user_id}".encode()).decode())

async def list_brokers(search: str | None = None, popular: bool = False, limit: int = 50) -> list[dict]:
    pool = await init_db()
    params, wheres = [], ["is_active = TRUE", "is_visible = TRUE"]
    order_by = "sort_order, name"
    if popular:
        params.append(POPULAR_BROKERS)
        wheres.append(f"slug = ANY(${len(params)}::text[])")
        order_by = f"ARRAY_POSITION(${len(params)}::text[], slug)"
    if search:
        params.append(f"%{search}%")
        wheres.append(f"(name ILIKE ${len(params)} OR slug ILIKE ${len(params)} OR EXISTS (SELECT 1 FROM UNNEST(search_keywords) k WHERE k ILIKE ${len(params)}))")
    params.append(limit)
    rows = await pool.fetch(f"SELECT {BROKER_SELECT} FROM trading_catalog.brokers WHERE {' AND '.join(wheres)} ORDER BY {order_by} LIMIT ${len(params)}", *params)
    return [dict(r) for r in rows]

async def get_broker(broker_id: str) -> dict:
    pool = await init_db()
    row = await pool.fetchrow(f"SELECT {BROKER_SELECT} FROM trading_catalog.brokers WHERE (id::text = $1 OR slug = $1) AND is_active = TRUE LIMIT 1", str(broker_id))
    if not row:
        raise AppError(ERROR_MESSAGES["BROKER"]["NOT_FOUND"])
    res = dict(row)
    res["id"] = str(res["id"])
    return res

async def list_broker_integrations(broker_id: str) -> list[dict]:
    pool = await init_db()
    rows = await pool.fetch("""
        SELECT i.id, i.trade_method AS "tradeMethod", i.sort_order AS "sortOrder",
               i.trade_mapping AS "tradeMapping", p.id AS "platformId",
               p.name AS "platformName", p.slug AS "platformSlug", p.logo_path AS "platformLogoPath",
               (i.is_active AND COALESCE(p.is_active, TRUE)) AS "isActive"
        FROM trading_catalog.broker_integrations i
        JOIN trading_catalog.brokers b ON b.id = i.broker_id
        LEFT JOIN trading_catalog.platforms p ON p.id = i.platform_id
        WHERE (b.id::text = $1 OR b.slug = $1) AND i.is_active = TRUE AND i.is_visible = TRUE
        ORDER BY i.sort_order
    """, str(broker_id))
    return [{**dict(r), "id": str(r["id"]), "platformId": str(r["platformId"]) if r.get("platformId") else None} for r in rows]

async def list_user_connections(user_id: int) -> list[dict]:
    pool = await init_db()
    rows = await pool.fetch(f"SELECT {CONN_SELECT} {CONN_FROM} WHERE connection.user_id = $1 AND connection.deleted_at IS NULL ORDER BY connection.created_at DESC", user_id)
    return [_format_conn(r) for r in rows]

async def get_user_connection(user_id: int, connection_id: str) -> dict:
    pool = await init_db()
    try:
        parsed_id = uuid.UUID(str(connection_id))
    except (ValueError, TypeError):
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_CONNECTION_ID"])
    row = await pool.fetchrow(f"SELECT {CONN_SELECT} {CONN_FROM} WHERE connection.id = $1 AND connection.user_id = $2 AND connection.deleted_at IS NULL LIMIT 1", parsed_id, user_id)
    if not row:
        raise AppError(ERROR_MESSAGES["BROKER"]["CONNECTION_NOT_FOUND"])
    return _format_conn(row)

async def get_connection_mapping(user_id: int, connection_id: str, trade_method: str = "file_upload") -> dict:
    pool = await init_db()
    try:
        parsed_id = uuid.UUID(str(connection_id))
    except (ValueError, TypeError):
        raise AppError(ERROR_MESSAGES["TRADING"]["INVALID_CONNECTION_ID"])
    row = await pool.fetchrow("""
        SELECT target.trade_mapping AS normalization, broker.slug AS "brokerSlug", broker.name AS "brokerName"
        FROM broker_connections.user_broker_connections connection
        JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
        JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
        JOIN trading_catalog.broker_integrations target ON target.broker_id = broker.id
          AND (target.trade_method = $3 OR ($3 = 'file_upload' AND target.trade_method = 'csv_upload'))
        WHERE connection.user_id = $1 AND connection.id = $2
          AND integration.is_active = TRUE AND target.is_active = TRUE AND broker.is_active = TRUE
        LIMIT 1
    """, user_id, parsed_id, trade_method)
    if not row:
        raise AppError(ERROR_MESSAGES["BROKER"]["MAPPING_NOT_FOUND"])
    return dict(row)

async def create_user_connection(user_id: int, payload: dict) -> dict:
    pool = await init_db()
    integration_id = payload.get("integrationId")
    account_name = payload.get("accountName")
    if not integration_id or not account_name:
        raise AppError(ERROR_MESSAGES["BROKER"]["VALIDATION_FAILED"])
    meta = payload["metadata"] if payload.get("metadata") is not None else {}
    row = await pool.fetchrow("""
        INSERT INTO broker_connections.user_broker_connections (
          user_id, integration_id, external_account_id, account_name, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, NOW(), NOW())
        RETURNING id
    """, user_id, uuid.UUID(str(integration_id)), payload.get("externalAccountId"), str(account_name).strip(), json.dumps(meta))
    return await get_user_connection(user_id, str(row["id"]))

async def update_user_connection(user_id: int, connection_id: str, payload: dict) -> dict:
    conn = await get_user_connection(user_id, connection_id)
    pool = await init_db()
    sets, params = ["updated_at = NOW()"], [user_id, uuid.UUID(connection_id)]
    if "accountName" in payload and payload["accountName"]:
        params.append(str(payload["accountName"]).strip())
        sets.append(f"account_name = ${len(params)}")
    if "metadata" in payload:
        params.append(json.dumps(payload["metadata"]))
        sets.append(f"metadata = ${len(params)}::jsonb")
    await pool.execute(f"UPDATE broker_connections.user_broker_connections SET {', '.join(sets)} WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL", *params)
    return await get_user_connection(user_id, connection_id)

async def set_connection_integration(user_id: int, connection_id: str, integration_id: str) -> dict:
    await get_user_connection(user_id, connection_id)
    pool = await init_db()
    parsed_id = uuid.UUID(connection_id)
    await pool.execute("DELETE FROM broker_connections.credentials WHERE connection_id = $1", parsed_id)
    await pool.execute("""
        UPDATE broker_connections.user_broker_connections
        SET integration_id = $3, external_account_id = NULL, status = 'pending', metadata = '{}'::jsonb,
            last_synced_at = NULL, last_sync_status = NULL, last_error = NULL, connected_at = NULL, updated_at = NOW()
        WHERE user_id = $1 AND id = $2
    """, user_id, parsed_id, uuid.UUID(str(integration_id)))
    return await get_user_connection(user_id, connection_id)

def _trigger_live_reload():
    try:
        from integrations.brokers.connectors.ctrader.connector import ctrader_live_sync
        ctrader_live_sync.trigger_reload()
    except Exception:
        pass

async def delete_user_connection(user_id: int, connection_id: str) -> str:
    await get_user_connection(user_id, connection_id)
    pool = await init_db()
    parsed_id = uuid.UUID(connection_id)
    await pool.execute("DELETE FROM broker_connections.credentials WHERE connection_id = $1", parsed_id)
    await pool.execute("UPDATE broker_connections.user_broker_connections SET deleted_at = NOW(), status = 'disconnected', updated_at = NOW() WHERE user_id = $1 AND id = $2", user_id, parsed_id)
    _trigger_live_reload()
    return connection_id

async def find_archived_connection(user_id: int, external_account_id: str, integration_id: str | None = None) -> dict | None:
    pool = await init_db()
    q = "SELECT id, integration_id, external_account_id, account_name, metadata, deleted_at FROM broker_connections.user_broker_connections WHERE user_id = $1 AND LOWER(BTRIM(external_account_id)) = LOWER(BTRIM($2)) AND deleted_at IS NOT NULL AND deleted_at >= NOW() - INTERVAL '30 days'"
    params = [user_id, str(external_account_id).strip()]
    if integration_id:
        params.append(uuid.UUID(str(integration_id)))
        q += f" AND integration_id = ${len(params)}"
    q += " ORDER BY deleted_at DESC LIMIT 1"
    row = await pool.fetchrow(q, *params)
    return dict(row) if row else None

async def restore_user_connection(user_id: int, archived_connection_id: str, active_connection_id: str | None = None) -> dict:
    pool = await init_db()
    arc_id = uuid.UUID(str(archived_connection_id))
    if active_connection_id and str(active_connection_id) != str(archived_connection_id):
        act_id = uuid.UUID(str(active_connection_id))
        creds = await get_credentials(user_id, str(act_id))
        if creds:
            await save_credentials(user_id, str(arc_id), creds)
        await pool.execute("DELETE FROM broker_connections.credentials WHERE connection_id = $1", act_id)
        await pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE id = $1 AND user_id = $2", act_id, user_id)
    await pool.execute("UPDATE broker_connections.user_broker_connections SET deleted_at = NULL, status = 'connected', updated_at = NOW() WHERE id = $1 AND user_id = $2", arc_id, user_id)
    _trigger_live_reload()
    return await get_user_connection(user_id, str(arc_id))

async def fresh_start_connection(user_id: int, active_connection_id: str, archived_connection_id: str | None = None) -> dict:
    pool = await init_db()
    if archived_connection_id:
        arc_id = uuid.UUID(str(archived_connection_id))
        await pool.execute("DELETE FROM trading.trades WHERE broker_connection_id = $1 AND user_id = $2", arc_id, user_id)
        await pool.execute("DELETE FROM broker_connections.credentials WHERE connection_id = $1", arc_id)
        await pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE id = $1 AND user_id = $2", arc_id, user_id)
    act_id = uuid.UUID(str(active_connection_id))
    await pool.execute("UPDATE broker_connections.user_broker_connections SET status = 'connected', deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND user_id = $2", act_id, user_id)
    _trigger_live_reload()
    return await get_user_connection(user_id, str(act_id))

async def cleanup_expired_connections() -> int:
    pool = await init_db()
    res = await pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'")
    return int(res.split(" ")[-1]) if res else 0

async def save_credentials(user_id: int, connection_id: str, credentials: dict, credential_type: str = "api_credentials"):
    pool = await init_db()
    parsed_id = uuid.UUID(connection_id)
    enc_payload = encrypt_credentials(credentials, user_id)
    await pool.execute("""
        INSERT INTO broker_connections.credentials (connection_id, credential_type, encrypted_payload, encryption_algorithm, key_version, updated_at)
        VALUES ($1, $2, $3, 'aes-256-gcm', 'v1', NOW())
        ON CONFLICT (connection_id, credential_type) DO UPDATE SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()
    """, parsed_id, credential_type, enc_payload)
    _trigger_live_reload()

async def get_credentials(user_id: int, connection_id: str, credential_type: str = "api_credentials") -> dict | None:
    pool = await init_db()
    parsed_id = uuid.UUID(connection_id)
    row = await pool.fetchrow("SELECT encrypted_payload FROM broker_connections.credentials WHERE connection_id = $1 AND credential_type = $2 LIMIT 1", parsed_id, credential_type)
    if not row or not row["encrypted_payload"]:
        return None
    return decrypt_credentials(row["encrypted_payload"], user_id)

async def update_sync_status(connection_id: str, status: str = "connected", last_sync_status: str = "success", last_error: str | None = None, balance_snapshot: dict | None = None):
    pool = await init_db()
    parsed_id = uuid.UUID(connection_id)
    sets, params = ["last_synced_at = NOW()", "updated_at = NOW()"], [parsed_id]
    if status:
        params.append(status)
        sets.append(f"status = ${len(params)}")
    if last_sync_status:
        params.append(last_sync_status)
        sets.append(f"last_sync_status = ${len(params)}")
    if last_error is not None:
        params.append(last_error)
        sets.append(f"last_error = ${len(params)}")
    if balance_snapshot:
        params.append(json.dumps(balance_snapshot))
        sets.append(f"balance_snapshot = ${len(params)}::jsonb")
    await pool.execute(f"UPDATE broker_connections.user_broker_connections SET {', '.join(sets)} WHERE id = $1", *params)

async def sync_connection(user_id: int, connection_id: str, payload: dict | None = None) -> dict:
    conn = await get_user_connection(user_id, connection_id)
    slug = conn.get("platformSlug") if (conn.get("platformSlug") and broker_registry.get(conn.get("platformSlug"))) else conn.get("brokerSlug")
    connector = broker_registry.get(slug)
    if not connector:
        raise AppError(ERROR_MESSAGES["BROKER"]["CONNECTOR_UNAVAILABLE"])
    creds = await get_credentials(user_id, connection_id)
    if not creds:
        raise AppError(ERROR_MESSAGES["BROKER"]["CREDENTIALS_MISSING"])
    since = None
    if payload:
        if payload.get("accountId"):
            creds["accountId"] = payload["accountId"]
        since = payload.get("fromTimestamp") or payload.get("startTime")
    try:
        raw_trades = await connector.fetch_trades(creds, since=since)
        for t in raw_trades:
            t["broker_connection_id"] = connection_id
            t["user_id"] = user_id
            t["source"] = "sync"
        pool = await init_db()
        saved = await insert_trades_batch(pool, raw_trades, user_id)
        balance_snapshot = None
        try:
            balances = await connector.fetch_balances(creds)
            if balances:
                balance_snapshot = balances[0]
        except Exception:
            pass
        await update_sync_status(connection_id, status="connected", last_sync_status="success", balance_snapshot=balance_snapshot)
        return {"success": True, "synced": len(saved), "total": len(raw_trades)}
    except Exception as e:
        await update_sync_status(connection_id, status="connected", last_sync_status="failed", last_error=str(e))
        raise AppError(ERROR_MESSAGES["BROKER"]["SYNC_FAILED"])
