# cTrader connector flow

This connector uses cTrader OAuth with the accounts-only permission scope. A broker account must be saved before OAuth starts.

## Connection

1. The UI saves the broker account, then selects that broker's cTrader `oauth_sync` integration before OAuth starts.
2. `GET /api/broker-connections/ctrader/start?connectionId=...` verifies that the saved connection belongs to `req.userId`.
3. The route creates a random OAuth state, stores only its hash with a five-minute expiry, and returns the cTrader authorization URL.
4. cTrader redirects to `GET /api/broker-connections/ctrader/callback`.
5. The callback atomically consumes the user-owned state, exchanges the authorization code for tokens, and verifies authorized accounts over the cTrader Open API WebSocket.
6. `accountVerification.js` checks both live and demo endpoints, accepts only accounts returned with the accounts/view permission scope, and matches the provider's broker title to the saved broker. The generic cTrader catalog entry remains broker-agnostic.
7. Access and refresh tokens are encrypted with the user-scoped context `ctrader:user:{userId}`.
8. `repository.saveConnection` transactionally marks the saved connection as connected, stores authorized-account metadata, and upserts the encrypted `oauth_tokens` credential.

`GET /api/broker-connections/ctrader` returns sanitized connection status. Tokens and raw provider responses are never returned.

## Token refresh

`POST /api/broker-connections/ctrader/:id/refresh` locks the owned credential row, decrypts the refresh token, requests new tokens, re-verifies authorized accounts, rotates the encrypted payload, and updates the connection metadata in one transaction.

Manual sync also refreshes automatically when the token is close to expiry or the requested account is missing from cached authorization metadata.

## Closed-trade history sync

`POST /api/broker-connections/ctrader/:id/sync` accepts an authorized `accountId`, `fromTimestamp`, and `toTimestamp`.

1. The route validates ownership, account authorization, date range, credential availability, and token expiry.
2. `dealSync.js` connects to the account's live or demo WebSocket endpoint and authenticates the application and account.
3. It loads current and archived symbols, symbol categories, historical deals, orders, and position protection values.
4. Deal and order history is paginated backward inside the requested range. Filled closing deals produce trade summaries, while available opening and closing fills are retained as executions.
5. The shared broker mapping normalizes the records.
6. `repository.saveTrades` idempotently upserts them into `trading.trades` by `(user_id, unique_id)`, links each row to its broker connection, and upserts fills into `trading.trade_executions` by provider execution ID.

cTrader exposes Forex and broker-defined leveraged symbols through this connector. Exact Forex categories are normalized to `forex`; other cTrader contracts are normalized to `cfd`. P&L and charge currency use the account deposit asset name when the asset catalog supplies it; otherwise they remain null. The provider does not supply option contract fields or a multi-leg strategy name, so this connector leaves option details and trade grouping unset rather than inferring them.

Sync status is stored on the connection as `running`, `success`, or `failed`. Provider errors are logged internally; the frontend receives safe errors.

## Live stream

`liveSync.js` starts with the backend and loads connected cTrader credentials from the database. It:

- refreshes tokens nearing expiry;
- keeps separate live and demo WebSocket streams;
- authorizes each account before subscribing;
- reconciles open positions and balances;
- updates each account's latest balance in the connection row's `balance_snapshot` JSON and refreshes `balance_updated_at` without creating balance-history rows;
- polls unrealized PnL only while an owning user is online;
- broadcasts sanitized snapshots through the app WebSocket;
- saves newly closed deals through the same idempotent `repository.saveTrades` path;
- reconnects with bounded backoff after stream failure.

## Deletion

`DELETE /api/broker-connections/:id` uses the generic broker deletion flow for cTrader. The owned connection is deleted, its encrypted credentials are removed by foreign-key cascade, and linked synced trades follow the existing trade-connection cascade.

All connection, credential, OAuth state, refresh, sync, and trade writes enforce ownership using the authenticated user ID.
