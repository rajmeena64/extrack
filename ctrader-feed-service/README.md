# cTrader Feed Service

Standalone internal feed server that reuses your uploaded cTrader Open API logic.

It uses the same cTrader env names:

- `CTRADER_CLIENT_ID`
- `CTRADER_CLIENT_SECRET`
- `CTRADER_ACCESS_TOKEN`
- `CTRADER_REFRESH_TOKEN`
- `CTRADER_EXPIRES_AT`
- `CTRADER_ACCOUNT_ID`
- `CTRADER_IS_DEMO`

## What it does

- Connects to cTrader once.
- Loads symbols with your existing protobuf/WebSocket logic.
- Pre-subscribes every account symbol by default, in bounded batches.
- Restores subscriptions automatically after every reconnect and retries forever with backoff.
- Stores only a small rolling in-memory cache per symbol (15 minutes / 500 ticks by default).
- Cache retention is hard-capped at 4 hours.
- Gives your backend one simple endpoint to fetch data by symbol.
- Accepts only HMAC-signed requests from allow-listed backend service identities.
- Serves cached values during short cTrader outages and reports `connected: false` with them.

## Install

```bash
cd ctrader-feed-service
npm install
cp .env.example .env
```

Fill `.env`.

For this Newapp workspace, securely copy the existing backend DB/cTrader settings without printing secrets:

```bash
npm run setup:local
```

Apply the shared secret-table migration once before the first start:

```bash
cd ../backend
npm run migrate
```

## Run

```bash
npm start
```

## Endpoint

Get quote only:

```http
GET /internal/quote/EURUSD
```

Get several quotes in one backend request:

```http
GET /internal/quotes?symbols=EURUSD,XAUUSD,BTCUSD
```

List all available symbols and subscription state:

```http
GET /internal/symbols
```

Get rolling market data:

```http
GET /internal/data/EURUSD?interval=1m&limitTicks=2000&limitCandles=500
```

Response includes:

- `symbol`
- `quote`
- `ticks`
- `candles`
- `retainedHours`

## Backend usage

Your main Node backend should call:

```text
http://your-private-feed-host:8020/internal/data/EURUSD?interval=1m
```

The Newapp feed client automatically reads the encrypted current key from `system.service_secrets` and signs the exact request using these headers:

```text
x-feed-client-id
x-feed-timestamp
x-feed-nonce
x-feed-signature
```

Newapp now has a thin reusable client at:

```text
backend/integrations/ctrader/feed.client.js
```

The key rotates every 24 hours. The previous key remains valid for a short grace window so in-flight backend requests do not fail.
Only AES-GCM ciphertext is stored in `system.service_secrets`; both services decrypt it with the shared `MT5_CREDENTIALS_KEY`. Newapp caches the key briefly and reloads/retries once after a `401`.
The raw key is never sent over HTTP. Signatures bind the client identity, timestamp, one-time nonce, HTTP method, and exact request URL. Requests outside the clock window or reused nonces are rejected.

For an emergency manual rotation (the secret is never printed):

```bash
npm run rotate-key
```

## Important

This service is internal only. Do not expose it publicly.

Best deployment:

```text
Frontend -> Your main backend -> cTrader Feed Service -> cTrader
```

For a separate container/deploy, use `FEED_HOST=0.0.0.0`, an HTTPS platform/reverse proxy, and set `MARKET_FEED_URL` in Newapp backend to its private HTTPS URL. Keep both services on a private network and allow only the backend at the firewall/security-group layer.

`FEED_REQUIRE_HTTPS=true` is secure-by-default. The TLS proxy must forward `X-Forwarded-Proto: https`; set `FEED_TRUST_PROXY` only to that proxy's exact IP/CIDR (or `loopback` when it is truly local). Do not use a broad hop-count while the origin is directly reachable. Local setup explicitly uses `FEED_REQUIRE_HTTPS=false` only for `127.0.0.1` development.

If the database uses a private CA, mount its certificate with `DB_SSL_CA` (or `DB_SSL_CA_BASE64`) and keep `DB_SSL_REJECT_UNAUTHORIZED=true`.

## Deployment health checks

- `/health` is a liveness check and always answers while the HTTP process is alive.
- `/ready` answers `200` only after cTrader is connected and at least one symbol is subscribed.

The service starts its HTTP server even if cTrader or the database is temporarily unavailable, then keeps reconciling in the background.


## Token source fixed: database first

This version does **not** require `CTRADER_ACCESS_TOKEN` or `CTRADER_REFRESH_TOKEN` in `.env`.
By default it loads the fresh cTrader tokens from the backend database row:

```sql
SELECT account_id, is_demo, access_token, refresh_token, expires_at
FROM system.admin_integrations
WHERE id = 'ctrader';
```

If your table name is different, set:

```env
CTRADER_ADMIN_INTEGRATIONS_TABLE=your_schema.your_table
```

Required env for database-token mode:

```env
CTRADER_CLIENT_ID=...
CTRADER_CLIENT_SECRET=...
CTRADER_TOKEN_SOURCE=database
DATABASE_URL=...
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true
MT5_CREDENTIALS_KEY=...
```

`MT5_CREDENTIALS_KEY` must be the same key used by the backend because the uploaded cTrader token service stores tokens through the same credential encryption helper.

For emergency local testing only, you can switch back to env tokens:

```env
CTRADER_TOKEN_SOURCE=env
CTRADER_ACCESS_TOKEN=...
CTRADER_REFRESH_TOKEN=...
CTRADER_ACCOUNT_ID=...
CTRADER_IS_DEMO=true
```


## Debug commands

If startup says `cTrader connection is not ready`, enable debug:

```env
CTRADER_DEBUG=true
```

Check database token loading without printing the token value:

```bash
node scripts/check-db-token.js
```

Then start again:

```bash
npm start
```
