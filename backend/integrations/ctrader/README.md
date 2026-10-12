# cTrader Admin Data Endpoints

Manual smoke test order:

1. `GET /api/start-ctrader`
2. `GET /api/ctrader-status`
3. `GET /api/ctrader-symbols`
4. `GET /api/ctrader-klines?symbol=EURUSD&interval=1m&limit=10`
5. `POST /api/ctrader-live-ticks/subscribe` with JSON body `{ "symbol": "EURUSD" }`
6. `GET /api/ctrader-latest-tick?symbol=EURUSD`
7. `POST /api/ctrader-depth/subscribe` with JSON body `{ "symbol": "EURUSD" }`
8. `GET /api/ctrader-latest-depth?symbol=EURUSD`

All routes are admin-only through `authCheck` and `requireCtraderAdmin`.
The module intentionally exposes read-only data and subscription state only.
Trade execution, order modification, position closing, and cancel actions are not implemented.

## User account OAuth

The user-facing connection uses separate credentials and never shares the admin/feed token state:

```env
CTRADER_OAUTH_CLIENT_ID=
CTRADER_OAUTH_CLIENT_SECRET=
CTRADER_OAUTH_CALLBACK_URL=https://api.example.com/api/broker-connections/ctrader/callback
USER_BROKER_CREDENTIALS_KEY=
```

`USER_BROKER_CREDENTIALS_KEY` must be a secret of at least 32 characters. Register the exact callback URL in the cTrader Open API application. Apply `20260801_ctrader_user_oauth.sql` before enabling the Connect cTrader button.

The existing admin/feed cTrader connection uses its own `CTRADER_ADMIN_CREDENTIALS_KEY`.
