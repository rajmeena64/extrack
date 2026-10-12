# Angel One Connector Flow

This connector integrates Angel One using SmartAPI (REST API) with TOTP-based authentication.

## Connection & Auth Flow

1. User provides `apiKey`, `clientCode`, `password` (PIN), and `totpSecret` via `POST /api/broker-connections/angel-one/connect`.
2. `validation.js` validates non-empty string parameters.
3. `verification.js` generates a TOTP code using the stored TOTP secret, calls `POST /rest/auth/angelbroking/user/v1/loginByPassword`, and verifies profile with `GET /rest/secure/angelbroking/user/v1/getProfile`.
4. `repository.js` encrypts credentials with context `angel-one:user:{userId}` and upserts into `broker_connections.credentials`.
5. API responses return only connection status and profile details. Secrets and tokens are never returned to the frontend.

## Trade History

- `trades.js` calls `GET /rest/secure/angelbroking/order/v1/getTradeBook` to retrieve executed fills.
- Fills are normalized via canonical mapping:
  - `fillid` -> `unique_id`
  - `tradingsymbol` -> `symbol`
  - `transactiontype` -> `side` (`buy` / `sell`)
  - `fillprice` -> `entry_price` / `exit_price`
  - `fillsize` -> `quantity`
  - `filltime` -> `entry_timestamp` / `exit_timestamp`
  - `net_pnl`, `pnl_currency` (`INR`)
  - `brokerage` -> `charges`
- Trades are idempotently saved in `trading.trades` using `repository.saveAngelOneTrades`. Unsupported values remain `null`.

## Limitations

- `getTradeBook` returns fills for the active trading session. For historical date ranges beyond today, users can upload Angel One P&L / Trade statements via CSV import.
- Stop Loss and Take Profit levels are not supplied by Angel One trade book responses and remain `null` (preserving user manual edits on re-sync).
