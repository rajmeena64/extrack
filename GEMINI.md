# Project Instructions: Trading Journal & Analytics Dashboard

## Project Overview
A platform for traders to log, track, and analyze trades across Crypto, Forex, and Commodities. Supports automated imports via API (Binance, MT5, cTrader) and manual/CSV logging.

## Tech Stack
- **Frontend**: React (Vite), Material UI, Chart.js, Lightweight Charts, React Query, React Router.
- **Backend**: Node.js/Express, WebSocket (WS), gRPC/Protobuf.
- **Database**: PostgreSQL.
- **Services**: Cloudinary (screenshots), Nodemailer (emails).

## Coding Conventions
### Frontend
- **Components**: Use functional components with hooks.
- **Routing**: Use `react-router-dom` with lazy loading for all page-level components.
- **Data Fetching**: Prefer `@tanstack/react-query` for all server state management.
- **Styling**: Material UI for components; modular CSS for specific layouts.

### Backend
- **Modules**: Standard CommonJS (`require`).
- **Security**: JWT for authentication (Access + Refresh tokens).
- **Environment**: Strict environment variable validation at startup (see `app.js`).
- **Protobuf**: Use `google-protobuf` and `protobufjs` for trading platform integrations.

## Folder Structure
- `/src/components`: UI components organized by feature (e.g., `Analytics`, `Daily`, `myTrades`).
- `/src/utils`: Frontend utility functions (e.g., `tradeManager`, `Currency`, `serve`).
- `/backend/server/routes`: Express API endpoints.
- `/backend/server/utils`: Shared backend logic.

## Security & Secrets
- **NEVER** commit `.env` files.
- Protect MT5 and trade ingest secrets.
- Use `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` for secure session management.
