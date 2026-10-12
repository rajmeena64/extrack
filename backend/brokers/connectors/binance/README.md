# Binance connector flow

This connector uses Binance API Key + Secret Key. It does not use OAuth and never calls order, transfer, or withdrawal endpoints.

## Connection

1. The UI first creates a pending Binance account through `POST /api/broker-connections` using the catalog's Binance `api_sync` integration.
2. `POST /api/broker-connections/binance/connect` accepts the selected `connectionId`, `environment` (`real` or `demo`), `apiKey`, and `secretKey` in the JSON body.
3. `validation.js` rejects missing, placeholder, non-string, unexpected, or oversized input.
4. A Real connection independently signs and calls:
   - Spot: `GET /api/v3/account`
   - USD-M Futures: `GET /fapi/v3/balance`
   - COIN-M Futures: `GET /dapi/v1/balance`
5. A Demo connection uses Binance's USD-M Demo REST endpoint and verifies only `GET /fapi/v3/balance`; Spot and COIN-M are unavailable for this connection type.
6. At least one applicable check must succeed. The successful checks become the stored `spot`, `usdmFutures`, and `coinmFutures` capabilities.
7. The stable Binance account identity is the Spot `uid`, falling back to the Futures `accountAlias`. Real and Demo use separate fingerprint namespaces, so the two environments never collide. `service.js` stores only the SHA-256 fingerprint, so new API keys for the same account still match the retained connection.
8. The API Key and Secret Key are encrypted together with the user-scoped context `binance:user:{userId}`. `repository.js` transactionally updates the selected connection and upserts the encrypted `api_credentials` row.

`GET /api/broker-connections/binance` returns only connection state and detected capabilities. It never returns credentials, signatures, fingerprints, encrypted payloads, or raw Binance errors.

## Signed requests

`signedRequest.js` is shared by verification and trade-history calls. It:

- selects the official Real Spot/USD-M/COIN-M base URL or the USD-M Demo base URL;
- reads Binance server time;
- adds `timestamp` and `recvWindow=5000`;
- creates an HMAC-SHA256 signature with the Secret Key;
- sends the API Key in `X-MBX-APIKEY`;
- applies request timeouts and maps provider failures to safe internal error codes.

## Trade history

Recent, symbol-specific reads use:

- Spot: `GET /api/v3/myTrades`
- USD-M: `GET /fapi/v1/userTrades`
- COIN-M: `GET /dapi/v1/userTrades`

Complete Futures history uses Binance exports instead of scanning symbols:

1. Request an export with `POST .../trades/{market}/history-export`.
2. `tradeExport.js` calls `/fapi/v1/trade/asyn` for USD-M or `/dapi/v1/trade/asyn` for COIN-M.
3. The returned download ID and status are stored in the connection metadata under `binanceTradeExports`.
4. Poll `POST .../history-export/poll`; the connector calls the matching `/trade/asyn/id` endpoint.
5. When complete, only an allowlisted HTTPS URL is downloaded. The original CSV/ZIP is archived in the private Cloudflare R2 bucket before it is parsed or imported.
6. `roundTrips.js` pairs opening and closing fills and calculates the completed-trade summary. `repository.saveTrades` idempotently upserts that summary into `trading.trades` and preserves the allocated provider fills in `trading.trade_executions`.
7. Requesting the exact same market and Unix-millisecond range replays the R2 archive through the same upsert pipeline instead of spending another Binance export request. A new Binance export is requested only when that archive is absent or fails its stored size/SHA-256 integrity check.

If an export range starts after a position was already opened, its opening price/time is not present in that file. That unmatched close is skipped rather than fabricating entry data. Import older ranges first so later ranges have the best chance of containing complete round trips; exact cross-range position state is not persisted yet.

The completed-trade mapping carries provider IDs, symbol, product type, position direction, closed quantity, entry/exit prices and times, realized gross/net P&L, P&L currency, commission, commission asset, percentage change, and optional `stop_loss` and `take_profit`. Dated Futures symbols are classified as `future`; Spot is `spot`; non-dated USD-M/COIN-M contracts are `perpetual`. P&L currency falls back to the matched instrument catalog's Binance profit currency; it is never guessed from the symbol text. Binance's standard Futures trade export normally does not include SL/TP; those values remain null instead of being invented, and later user-entered values survive re-sync.

Spot has no account-wide history export in this connector and is never discovered by scanning symbols. Its fills are captured by the live user stream after connection. Real USD-M and COIN-M history are selected separately; Demo connections expose only USD-M. Demo history uses the same yearly export and R2 replay pipeline, scoped to that Demo connection.

No trading endpoint is implemented.

## Live user streams

`liveSync.js` starts with the backend for every connected Binance account and reloads after connect or delete.

- Spot uses the current WebSocket API `userDataStream.subscribe.signature` method with the stored HMAC API credentials. It consumes `executionReport`, `outboundAccountPosition`, and `balanceUpdate` events.
- USD-M Futures creates an API-key-only `/fapi/v1/listenKey`, keeps it alive, and consumes `ORDER_TRADE_UPDATE` and `ACCOUNT_UPDATE` events from the Real or Demo USD-M stream selected by the connection environment.
- Initial Spot and USD-M wallet balances come from the same read-only account endpoints used for verification. Stream events then keep the cached asset balances current.
- Initial USD-M open positions come from `/fapi/v3/positionRisk`; `ACCOUNT_UPDATE` events add/remove them and a five-second position refresh keeps mark price and unrealized P&L current in the dashboard's existing Open trades tab. Incomplete trades are never written into `trading.trades`.
- The Binance Exact Sync page receives a sanitized list of every non-zero Spot asset from that in-memory snapshot. Spot holdings are displayed separately from open leveraged positions and are not stored as trades.
- The latest selected wallet balance for each market is updated in place under `user_broker_connections.balance_snapshot`; `balance_updated_at` records freshness. No balance-history rows are created.
- Every `TRADE` execution event is normalized and sent through the existing idempotent `repository.saveTrades` path. The browser receives only a `TRADE_UPDATED` notification and reloads the user's sanitized trades.
- Sanitized balance snapshots are sent to the owning browser as `BROKER_BALANCES_UPDATED`. API keys, secrets, signatures, listen keys, and raw provider frames never leave the backend.
- Streams reconnect with bounded backoff and are rotated before Binance's connection lifetime limit.

The live stream observes account activity only. It never places, changes, or cancels an order.

## Delete and reconnect retention

`DELETE /api/broker-connections/:id` is special for Binance:

- the connection is hidden and reduced to the stable account fingerprint plus R2 export metadata;
- encrypted credentials are deleted immediately;
- linked `trading.trades` rows are deleted immediately;
- reconnecting the same fingerprint removes the retention marker and reuses the retained R2 archive metadata;
- selecting an archived range restores its trades from R2 without another Binance historical export;
- the minimal retained connection remains until the Entrack user account itself is permanently deleted.

Every connection, credential, export, and trade query is scoped to the authenticated `req.userId`.
