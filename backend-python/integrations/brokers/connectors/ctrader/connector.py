import asyncio
import hashlib
import json
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
import httpx
import websockets
from infra.db.postgres import init_db
from integrations.brokers.base import BaseBroker
from domains.instruments.registry import find_by_symbol

ENDPOINTS = {
    "live": os.getenv("CTRADER_WS_LIVE_URL", "wss://live.ctraderapi.com:5036"),
    "demo": os.getenv("CTRADER_WS_DEMO_URL", "wss://demo.ctraderapi.com:5036"),
}

class CTraderBroker(BaseBroker):
    def __init__(self):
        self._slug = "ctrader"

    @property
    def slug(self) -> str:
        return self._slug

    def _get_endpoint(self, creds: Dict[str, Any]) -> str:
        env = str(creds.get("environment", "live")).lower()
        return ENDPOINTS.get(env, ENDPOINTS["live"])

    def _get_client_creds(self, creds: Dict[str, Any]) -> tuple[str, str]:
        cid = str(creds.get("clientId") or os.getenv("CTRADER_OAUTH_CLIENT_ID") or os.getenv("CTRADER_CLIENT_ID", "")).strip()
        csec = str(creds.get("clientSecret") or os.getenv("CTRADER_OAUTH_CLIENT_SECRET") or os.getenv("CTRADER_CLIENT_SECRET", "")).strip()
        return cid, csec

    async def get_authorization_url(self, user_id: int, connection_id: str, return_origin: str = "") -> str:
        cid, _ = self._get_client_creds({})
        api_base = os.getenv("API_URL", "http://localhost:5000").rstrip("/")
        cb_url = str(os.getenv("CTRADER_OAUTH_CALLBACK_URL", "")).strip() or f"{api_base}/api/v1/brokers/ctrader/callback"
        state = secrets.token_urlsafe(32)
        state_hash = hashlib.sha256(state.encode()).hexdigest()
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        origin = return_origin or os.getenv("FRONTEND_URL", "http://localhost:3000")
        pool = await init_db()
        await pool.execute("""
            INSERT INTO broker_connections.oauth_states (user_id, provider, connection_id, state_hash, expires_at, return_origin)
            VALUES ($1, 'ctrader', $2::uuid, $3, $4, $5)
            ON CONFLICT (user_id, provider) DO UPDATE SET
              connection_id = EXCLUDED.connection_id, state_hash = EXCLUDED.state_hash,
              expires_at = EXCLUDED.expires_at, return_origin = EXCLUDED.return_origin, created_at = NOW()
        """, user_id, uuid.UUID(str(connection_id)), state_hash, expires, origin)
        params = {"client_id": cid, "redirect_uri": cb_url, "scope": "accounts", "product": "web", "state": state}
        auth_base = os.getenv("CTRADER_AUTH_URL", "https://id.ctrader.com/my/settings/openapi/grantingaccess/").rstrip("?")
        return f"{auth_base}?{urlencode(params)}"

    async def get_authorized_accounts(self, access_token: str, client_id: str, client_secret: str) -> List[Dict[str, Any]]:
        for ep in (ENDPOINTS["live"], ENDPOINTS["demo"]):
            try:
                async with websockets.connect(ep, open_timeout=10) as ws:
                    await self._rpc(ws, 2100, {"clientId": client_id, "clientSecret": client_secret})
                    res = await self._rpc(ws, 2149, {"accessToken": access_token})
                    accounts = []
                    for a in res.get("ctidTraderAccount", []):
                        acc_id = str(a.get("ctidTraderAccountId", ""))
                        if acc_id:
                            accounts.append({
                                "id": acc_id,
                                "isLive": bool(a.get("isLive", True)),
                                "login": str(a.get("traderLogin", acc_id)),
                                "brokerName": str(a.get("brokerTitleShort", "cTrader")).strip(),
                            })
                    if accounts:
                        return accounts
            except Exception:
                continue
        return []

    async def handle_oauth_callback(self, code: str, state: str, error: Optional[str] = None) -> str:
        fallback_origin = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        if error or not code or not state:
            return f"{fallback_origin}/add-trade?oauth=error&ctrader=error"
        state_hash = hashlib.sha256(state.encode()).hexdigest()
        pool = await init_db()
        row = await pool.fetchrow("""
            DELETE FROM broker_connections.oauth_states
            WHERE provider = 'ctrader' AND state_hash = $1 AND expires_at > NOW()
            RETURNING user_id, connection_id, return_origin
        """, state_hash)
        if not row:
            return f"{fallback_origin}/add-trade?oauth=invalid&ctrader=invalid"
        user_id = row["user_id"]
        conn_id = str(row["connection_id"])
        origin = (row["return_origin"] or fallback_origin).rstrip("/")
        cid, csec = self._get_client_creds({})
        cb_url = str(os.getenv("CTRADER_OAUTH_CALLBACK_URL", "")).strip() or f"{origin}/api/v1/brokers/ctrader/callback"
        token_url = os.getenv("CTRADER_TOKEN_URL", "https://openapi.ctrader.com/apps/token")
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_res = await client.post(token_url, params={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": cb_url,
                "client_id": cid,
                "client_secret": csec,
            })
            tokens = token_res.json()
        access_token = tokens.get("accessToken")
        if not access_token:
            return f"{origin}/add-trade?oauth=error&ctrader=error"
        accounts = await self.get_authorized_accounts(access_token, cid, csec)
        if not accounts:
            return f"{origin}/add-trade?oauth=error&ctrader=no_accounts"
        first_acc = accounts[0]["id"]
        is_live = bool(accounts[0].get("isLive", True))
        env = "live" if is_live else "demo"
        from domains.brokers.service import save_credentials, update_sync_status, find_archived_connection
        await save_credentials(user_id, conn_id, {
            "accessToken": access_token,
            "refreshToken": tokens.get("refreshToken", ""),
            "accountId": first_acc,
            "clientId": cid,
            "clientSecret": csec,
            "environment": env,
        })
        meta = {
            "provider": "ctrader",
            "scope": "accounts",
            "environment": env,
            "authorizedAccounts": accounts,
            "authorizedAccountIds": [a["id"] for a in accounts],
        }
        archived = await find_archived_connection(user_id, first_acc)
        if archived:
            await pool.execute("UPDATE broker_connections.user_broker_connections SET external_account_id = $1, metadata = $2::jsonb, status = 'pending', updated_at = NOW() WHERE id = $3::uuid AND user_id = $4", first_acc, json.dumps(meta), uuid.UUID(conn_id), user_id)
            return f"{origin}/add-trade?oauth=reconnect_prompt&archivedId={archived['id']}&connectionId={conn_id}&accountId={first_acc}&brokerName=cTrader"
        await pool.execute("""
            UPDATE broker_connections.user_broker_connections
            SET external_account_id = $1, metadata = $2::jsonb, status = 'connected', updated_at = NOW()
            WHERE id = $3::uuid AND user_id = $4
        """, first_acc, json.dumps(meta), uuid.UUID(conn_id), user_id)
        await update_sync_status(conn_id, status="connected")
        return f"{origin}/add-trade?oauth=connected"

    async def _rpc(self, ws: websockets.ClientConnection, payload_type: int, payload: Dict[str, Any], timeout: float = 12.0) -> Dict[str, Any]:
        msg_id = str(uuid.uuid4())
        await ws.send(json.dumps({"clientMsgId": msg_id, "payloadType": payload_type, "payload": payload}))
        start = asyncio.get_event_loop().time()
        while (asyncio.get_event_loop().time() - start) < timeout:
            raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            msg = json.loads(raw)
            if msg.get("clientMsgId") == msg_id or msg.get("payloadType") in (payload_type + 1, 2142, 50):
                if msg.get("payloadType") in (2142, 50):
                    err = msg.get("payload", {}).get("description") or msg.get("payload", {}).get("errorCode", "CTRader error")
                    raise RuntimeError(str(err))
                return msg.get("payload", {})
        raise TimeoutError("cTrader request timeout")

    async def _auth(self, ws: websockets.ClientConnection, creds: Dict[str, Any]) -> int:
        cid, csec = self._get_client_creds(creds)
        await self._rpc(ws, 2100, {"clientId": cid, "clientSecret": csec})
        acc_id = int(creds.get("accountId") or creds.get("ctidTraderAccountId") or 0)
        token = str(creds.get("accessToken", ""))
        await self._rpc(ws, 2102, {"ctidTraderAccountId": acc_id, "accessToken": token})
        return acc_id

    async def connect(self, credentials: Dict[str, Any]) -> bool:
        ep = self._get_endpoint(credentials)
        async with websockets.connect(ep, open_timeout=10) as ws:
            await self._auth(ws, credentials)
            return True

    async def fetch_trades(self, credentials: Dict[str, Any], since: Optional[int] = None) -> List[Dict[str, Any]]:
        ep = self._get_endpoint(credentials)
        async with websockets.connect(ep, open_timeout=10) as ws:
            acc_id = await self._auth(ws, credentials)
            assets = {int(a["assetId"]): str(a.get("name", "")).upper() for a in (await self._rpc(ws, 2112, {"ctidTraderAccountId": acc_id})).get("asset", []) if "assetId" in a}
            trader = (await self._rpc(ws, 2121, {"ctidTraderAccountId": acc_id})).get("trader", {})
            cur, digits = assets.get(int(trader.get("depositAssetId", 0)), ""), int(trader.get("moneyDigits", 0))
            sym_res = await self._rpc(ws, 2114, {"ctidTraderAccountId": acc_id, "includeArchivedSymbols": True})
            symbols = {str(s["symbolId"]): str(s.get("symbolName", "")).upper() for s in sym_res.get("symbol", []) if "symbolId" in s}
            now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
            from_ms = since if since else (now_ms - 90 * 86400 * 1000)
            deals_res = await self._rpc(ws, 2133, {"ctidTraderAccountId": acc_id, "fromTimestamp": from_ms, "toTimestamp": now_ms, "maxRows": 1000})
            trades: List[Dict[str, Any]] = []
            for deal in deals_res.get("deal", []):
                close = deal.get("closePositionDetail")
                if not close or deal.get("dealStatus") not in (2, 3, "2", "3", "FILLED", "PARTIALLY_FILLED"):
                    continue
                div = 10.0 ** int(close.get("moneyDigits", digits))
                gross, comm, swap = float(close.get("grossProfit", 0)) / div, abs(float(deal.get("commission", 0))) / div, float(close.get("swap", 0)) / div
                exec_ts = deal.get("executionTimestamp")
                iso = datetime.fromtimestamp(exec_ts / 1000.0, tz=timezone.utc).isoformat() if exec_ts else None
                sym = symbols.get(str(deal.get("symbolId", "")), "")
                inst = find_by_symbol(sym)
                c_size = float(inst["contractSize"]) if (inst and "contractSize" in inst and inst["contractSize"]) else 100000.0
                cat = inst["category"] if (inst and "category" in inst) else "forex"
                ptype = inst["productType"] if (inst and "productType" in inst) else "forex_cfd"
                trades.append({
                    "unique_id": f"ctrader:{deal.get('dealId', exec_ts)}",
                    "symbol": sym,
                    "side": "short" if str(deal.get("tradeSide", "")).upper() in ("2", "SELL") else "long",
                    "entry_price": float(close.get("entryPrice", deal.get("executionPrice", 0))),
                    "exit_price": float(deal.get("executionPrice", 0)),
                    "quantity": float(deal.get("filledVolume", 0)) / c_size,
                    "entry_timestamp": iso, "exit_timestamp": iso,
                    "gross_pnl": gross, "net_pnl": gross - comm + swap,
                    "pnl_currency": cur, "product_type": ptype, "category": cat,
                    "status": "closed", "total_charges": comm,
                })
            return trades

    async def fetch_positions(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        ep = self._get_endpoint(credentials)
        async with websockets.connect(ep, open_timeout=10) as ws:
            acc_id = await self._auth(ws, credentials)
            sym_res = await self._rpc(ws, 2114, {"ctidTraderAccountId": acc_id, "includeArchivedSymbols": True})
            symbols = {str(s["symbolId"]): str(s.get("symbolName", "")).upper() for s in sym_res.get("symbol", []) if "symbolId" in s}
            res = await self._rpc(ws, 2124, {"ctidTraderAccountId": acc_id})
            pos_list = []
            for p in res.get("position", []):
                sym = symbols.get(str(p.get("symbolId", "")), "")
                inst = find_by_symbol(sym)
                c_size = float(inst["contractSize"]) if (inst and "contractSize" in inst and inst["contractSize"]) else 100000.0
                pos_list.append({
                    "symbol": sym,
                    "side": "short" if str(p.get("tradeSide", "")).upper() in ("2", "SELL") else "long",
                    "contracts": float(p.get("volume", 0)) / c_size,
                    "entryPrice": float(p.get("price", 0)),
                    "unrealizedPnl": 0.0,
                    "id": str(p.get("positionId", "")),
                })
            return pos_list

    async def fetch_balances(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        ep = self._get_endpoint(credentials)
        async with websockets.connect(ep, open_timeout=10) as ws:
            acc_id = await self._auth(ws, credentials)
            assets = {int(a["assetId"]): str(a.get("name", "")).upper() for a in (await self._rpc(ws, 2112, {"ctidTraderAccountId": acc_id})).get("asset", []) if "assetId" in a}
            trader = (await self._rpc(ws, 2121, {"ctidTraderAccountId": acc_id})).get("trader", {})
            cur, digits = assets.get(int(trader.get("depositAssetId", 0)), ""), int(trader.get("moneyDigits", 0))
            bal = float(trader.get("balance", 0)) / (10.0 ** digits)
            return [{"currency": cur, "free": bal, "total": bal}]

class CTraderLiveSync:
    def __init__(self):
        self.positions, self.running, self.reload_event = {}, False, asyncio.Event()

    async def start(self):
        self.running = True
        while self.running:
            self.reload_event.clear()
            pool = await init_db()
            rows = await pool.fetch("SELECT c.id, c.user_id, c.account_name FROM broker_connections.user_broker_connections c JOIN trading_catalog.broker_integrations i ON i.id = c.integration_id JOIN trading_catalog.brokers b ON b.id = i.broker_id WHERE b.slug = 'ctrader' AND c.status = 'connected' AND c.deleted_at IS NULL")
            from domains.brokers.service import get_credentials
            tasks = [asyncio.create_task(self._run_stream(str(r["id"]), r["user_id"], str(r["account_name"] or "cTrader"), creds)) for r in rows if (creds := await get_credentials(r["user_id"], str(r["id"])))]
            await self.reload_event.wait()
            for t in tasks: t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    def trigger_reload(self): self.reload_event.set()
    async def stop(self): self.running = False; self.reload_event.set()

    async def send_snapshot(self, user_id: str):
        pos = [p for lst in self.positions.values() for p in lst if str(p.get("userId")) == str(user_id)]
        from core.websocket.ws_server import ws_manager
        await ws_manager.send_to_user(str(user_id), {"type": "OPEN_POSITIONS_UPDATED", "connection_ids": list({p["connection_id"] for p in pos if p.get("connection_id")}), "positions": pos})

    async def _run_stream(self, conn_id: str, user_id: int, acc_name: str, creds: dict):
        broker = CTraderBroker()
        ep, acc_id, token = broker._get_endpoint(creds), int(creds.get("accountId") or 0), str(creds.get("accessToken", ""))
        cid, csec = broker._get_client_creds(creds)
        from core.websocket.ws_server import ws_manager
        from domains.trading.writes import insert_trades_batch
        while self.running and not self.reload_event.is_set():
            try:
                async with websockets.connect(ep, open_timeout=10) as ws:
                    pending, symbols = {}, {}
                    async def rpc(ptype, payload):
                        mid, fut = str(uuid.uuid4()), asyncio.get_running_loop().create_future()
                        pending[mid] = fut
                        await ws.send(json.dumps({"clientMsgId": mid, "payloadType": ptype, "payload": payload}))
                        return await asyncio.wait_for(fut, timeout=10.0)
                    async def read_loop():
                        async for raw in ws:
                            m = json.loads(raw)
                            mid, pt = m.get("clientMsgId"), m.get("payloadType")
                            if mid in pending and not (f := pending.pop(mid)).done(): f.set_result(m.get("payload", {}))
                            elif pt == 2126: await on_event(m.get("payload", {}))
                    async def on_event(pld):
                        deal = pld.get("deal", {})
                        if (close := deal.get("closePositionDetail")) and deal.get("dealStatus") in (2, 3, "2", "3", "FILLED", "PARTIALLY_FILLED"):
                            div = 10.0 ** int(close.get("moneyDigits", mdigits))
                            gross, comm, swap = float(close.get("grossProfit", 0)) / div, abs(float(deal.get("commission", 0))) / div, float(close.get("swap", 0)) / div
                            ts = deal.get("executionTimestamp")
                            iso = datetime.fromtimestamp(ts / 1000.0, tz=timezone.utc).isoformat() if ts else None
                            sym = symbols.get(str(deal.get("symbolId", "")), "")
                            inst = find_by_symbol(sym)
                            c_size = float(inst["contractSize"]) if (inst and "contractSize" in inst and inst["contractSize"]) else 100000.0
                            cat = inst["category"] if (inst and "category" in inst) else "forex"
                            ptype = inst["productType"] if (inst and "productType" in inst) else "forex_cfd"
                            pool = await init_db()
                            await insert_trades_batch(pool, [{
                                "unique_id": f"ctrader:{deal.get('dealId', ts)}",
                                "symbol": sym,
                                "side": "short" if str(deal.get("tradeSide", "")).upper() in ("2", "SELL") else "long",
                                "entry_price": float(close.get("entryPrice", deal.get("executionPrice", 0))),
                                "exit_price": float(deal.get("executionPrice", 0)),
                                "quantity": float(deal.get("filledVolume", 0)) / c_size,
                                "entry_timestamp": iso, "exit_timestamp": iso, "gross_pnl": gross, "net_pnl": gross - comm + swap,
                                "pnl_currency": cur, "product_type": ptype, "category": cat, "status": "closed",
                                "total_charges": comm, "broker_connection_id": conn_id, "user_id": user_id, "source": "sync"
                            }], user_id)
                            await ws_manager.send_to_user(str(user_id), {"type": "TRADE_UPDATED", "connectionId": conn_id})
                        await reconcile()
                    async def reconcile():
                        res = await rpc(2124, {"ctidTraderAccountId": acc_id})
                        raw_pos = [p for p in res.get("position", []) if str(p.get("positionStatus", "")) in ("1", "OPEN")]
                        pnl_map = {str(x["positionId"]): x for x in (await rpc(2187, {"ctidTraderAccountId": acc_id})).get("positionUnrealizedPnL", [])} if raw_pos else {}
                        formatted = []
                        for p in raw_pos:
                            pid = str(p.get("positionId", ""))
                            sym = symbols.get(str(p.get("symbolId", "")), "")
                            inst = find_by_symbol(sym)
                            c_size = float(inst["contractSize"]) if (inst and "contractSize" in inst and inst["contractSize"]) else 100000.0
                            qty, eprice = float(p.get("volume", 0)) / c_size, float(p.get("price", 0))
                            is_sell = str(p.get("tradeSide", "")).upper() in ("2", "SELL")
                            pinfo = pnl_map.get(pid, {})
                            div = 10.0 ** int(pinfo.get("moneyDigits", mdigits))
                            gpnl, npnl = float(pinfo.get("grossUnrealizedPnL", 0)) / div, float(pinfo.get("netUnrealizedPnL", 0)) / div
                            cur_p = (eprice - gpnl / qty) if (is_sell and qty > 0) else (eprice + gpnl / qty if qty > 0 else eprice)
                            ots = p.get("tradeData", {}).get("openTimestamp")
                            formatted.append({
                                "unique_id": f"ctrader-open:{conn_id}:{pid}", "uniqueId": f"ctrader-open:{conn_id}:{pid}",
                                "connection_id": conn_id, "account_id": str(acc_id), "account_name": acc_name,
                                "brokerName": "cTrader", "platform": "cTrader",
                                "symbol": symbols.get(str(p.get("symbolId", "")), ""),
                                "side": "short" if is_sell else "long", "positionDirection": "short" if is_sell else "long",
                                "tradeType": "short" if is_sell else "long", "status": "open", "is_open_position": True,
                                "quantity": qty, "quantityUnit": "lot", "entryPrice": eprice, "price": eprice,
                                "currentPrice": cur_p, "current_price": cur_p, "pnl": npnl, "grossPnl": gpnl,
                                "gross_pnl": gpnl, "netPnl": npnl, "net_pnl": npnl, "pnlCurrency": cur,
                                "pnl_currency": cur, "currency": cur, "userId": str(user_id),
                                "entryAt": datetime.fromtimestamp(ots / 1000.0, tz=timezone.utc).isoformat() if ots else None,
                            })
                        self.positions[conn_id] = formatted
                        await ws_manager.send_to_user(str(user_id), {"type": "OPEN_POSITIONS_UPDATED", "connection_ids": [conn_id], "positions": formatted})

                    rtask = asyncio.create_task(read_loop())
                    try:
                        await rpc(2100, {"clientId": cid, "clientSecret": csec})
                        await rpc(2102, {"ctidTraderAccountId": acc_id, "accessToken": token})
                        assets = {int(a["assetId"]): str(a.get("name", "")).upper() for a in (await rpc(2112, {"ctidTraderAccountId": acc_id})).get("asset", []) if "assetId" in a}
                        trader = (await rpc(2121, {"ctidTraderAccountId": acc_id})).get("trader", {})
                        cur = assets.get(int(trader.get("depositAssetId", 0)), "")
                        mdigits = int(trader.get("moneyDigits", 0))
                        symbols.update({str(s["symbolId"]): str(s.get("symbolName", "")).upper() for s in (await rpc(2114, {"ctidTraderAccountId": acc_id, "includeArchivedSymbols": True})).get("symbol", []) if "symbolId" in s})
                        await reconcile()
                        while not self.reload_event.is_set():
                            await asyncio.sleep(2.0)
                            await ws.send(json.dumps({"payloadType": 51, "payload": {}}))
                            if self.positions.get(conn_id): await reconcile()
                    finally: rtask.cancel()
            except asyncio.CancelledError: break
            except Exception: await asyncio.sleep(5.0)

ctrader_live_sync = CTraderLiveSync()

