# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## VPS MT5 Template Setup

The VPS agent creates every user MT5 instance from a prepared MT5 template. The template is a ready MT5 environment with broker server discovery data already initialized. It is not a saved user account, and it must not contain any real user's login session.

Required agent environment:

```bash
MT5_TEMPLATE_DIR=/home/ubuntu/mt5-template
MT5_INSTANCES_DIR=/home/ubuntu/mt5-instances
```

`MT5_TEMPLATE_DIR` is preferred. If an older deployment still sets `MT5_SOURCE_DIR`, the agent can use it as a fallback template path, but new deployments should use `MT5_TEMPLATE_DIR`.

To prepare `/home/ubuntu/mt5-template`:

1. On the VPS, create/open a dedicated Wine prefix or MT5 folder for the template.
2. Install/open MT5 once manually in that template environment.
3. Let MT5 initialize fully.
4. Open the server login/search window.
5. Search for broker servers so MT5 downloads/populates broker server discovery data.
6. Confirm the server list is not limited to only `MetaQuotes-Demo`.
7. Do not login with any real user account in the template.
8. Close MT5 cleanly.
9. Save this prepared folder as `/home/ubuntu/mt5-template`.
10. Set `MT5_TEMPLATE_DIR` and `MT5_INSTANCES_DIR` in the VPS agent environment.
11. Restart the VPS agent.

Supported template layouts:

- `/home/ubuntu/mt5-template/terminal64.exe`
- `/home/ubuntu/mt5-template/mt5/terminal64.exe` with optional `/home/ubuntu/mt5-template/wine`
- `/home/ubuntu/mt5-template/drive_c/Program Files/MetaTrader 5/terminal64.exe` as a full Wine prefix

For each job, the agent copies the template into a unique folder under `MT5_INSTANCES_DIR`, applies that job's login config and EA files, launches the copied `terminal64.exe`, and only completes the job after `verified_running=true` process verification succeeds.

Test one job:

1. Start with a prepared `MT5_TEMPLATE_DIR`.
2. Submit one MT5 connection job with login ID, password, and broker server.
3. Confirm a unique copied instance exists under `/home/ubuntu/mt5-instances`.
4. Confirm logs show the template path and destination path, but no password.
5. Confirm `terminal64.exe` launched from the copied instance path, not the template path.
6. Confirm the backend job completes only after the running process is verified.

If the copied MT5 still shows only `MetaQuotes-Demo`, check the VPS agent logs for:

- `MT5 template appears fresh/uninitialized`
- `found MT5 prepared data candidate`
- `template=... destination=...`
- `terminal64.exe missing in copied MT5 instance`

Then reopen the template manually, search for broker servers again, confirm the server list is populated, close MT5 cleanly, and restart the agent.
