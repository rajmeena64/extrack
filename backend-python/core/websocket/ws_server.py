import os
import time
import json
import asyncio
from typing import Dict, Set, Any
from fastapi import WebSocket
import httpx
import websockets
from core.logger.logger import logger

MAX_WS_PER_USER = int(os.environ.get("MAX_WS_CONNECTIONS_PER_USER", 10))
MAX_WS_TOTAL = int(os.environ.get("MAX_WS_TOTAL_CONNECTIONS", 1000))

class WebSocketServerManager:
    def __init__(self):
        self.user_sockets: Dict[str, Set[WebSocket]] = {}
        self.all_sockets: Set[WebSocket] = set()
        self.socket_symbols: Dict[WebSocket, Set[str]] = {}
        self.ticker_task: asyncio.Task | None = None
        self.ctrader_task: asyncio.Task | None = None
        self.ctrader_ws: Any = None

    async def register_connection(self, ws: WebSocket, user_id: str) -> bool:
        if len(self.all_sockets) >= MAX_WS_TOTAL or len(self.user_sockets.get(user_id, set())) >= MAX_WS_PER_USER:
            await ws.close(code=1008)
            return False
        await ws.accept()
        self.all_sockets.add(ws)
        self.socket_symbols[ws] = set()
        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = set()
        self.user_sockets[user_id].add(ws)
        self.ensure_loops()
        return True

    def remove_connection(self, ws: WebSocket, user_id: str):
        if ws in self.all_sockets:
            self.all_sockets.remove(ws)
        if ws in self.socket_symbols:
            del self.socket_symbols[ws]
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(ws)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]
        self.sync_ctrader_subscriptions()

    def set_subscriptions(self, ws: WebSocket, symbols: list[str]):
        if ws not in self.socket_symbols:
            self.socket_symbols[ws] = set()
        cleaned = {str(s).strip().upper().replace("/", "").replace("-", "").replace("_", "") for s in symbols if s}
        self.socket_symbols[ws] = cleaned
        self.sync_ctrader_subscriptions()

    def get_all_subscribed_symbols(self) -> Set[str]:
        res = set()
        for syms in self.socket_symbols.values():
            res.update(syms)
        return res

    async def send_to_user(self, user_id: str, payload: Dict[str, Any]):
        sockets = self.user_sockets.get(user_id, set())
        for ws in list(sockets):
            try:
                await ws.send_json(payload)
            except Exception:
                self.remove_connection(ws, user_id)

    async def broadcast(self, payload: Dict[str, Any]):
        for ws in list(self.all_sockets):
            try:
                await ws.send_json(payload)
            except Exception:
                self.all_sockets.discard(ws)

    async def broadcast_tick(self, symbol: str, price: float, timestamp: int | None = None):
        clean_sym = symbol.strip().upper().replace("/", "").replace("-", "").replace("_", "")
        ts = timestamp or int(time.time())
        payload = {
            "type": "MARKET_TICK",
            "tick": {
                "symbolName": clean_sym,
                "price": price,
                "last": price,
                "bid": price,
                "ask": price,
                "timestamp": ts,
                "serverTime": ts
            }
        }
        for ws, syms in list(self.socket_symbols.items()):
            if clean_sym in syms or (clean_sym + "USDT") in syms or clean_sym.replace("USDT", "") in syms:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    async def broadcast_raw_tick(self, tick: dict):
        raw_sym = str(tick.get("symbolName") or tick.get("symbol") or "")
        clean_sym = raw_sym.strip().upper().replace("/", "").replace("-", "").replace("_", "")
        if not clean_sym:
            return
        bid = float(tick.get("bid") or 0)
        ask = float(tick.get("ask") or 0)
        price = float(tick.get("price") or ((bid + ask) / 2 if bid and ask else bid or ask))
        tick["symbolName"] = clean_sym
        tick["price"] = price
        tick["last"] = price
        payload = {"type": "MARKET_TICK", "tick": tick}
        for ws, syms in list(self.socket_symbols.items()):
            if clean_sym in syms or (clean_sym + "USDT") in syms or clean_sym.replace("USDT", "") in syms:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    def ensure_loops(self):
        if self.ticker_task is None or self.ticker_task.done():
            self.ticker_task = asyncio.create_task(self._market_ticker_loop())
        if self.ctrader_task is None or self.ctrader_task.done():
            self.ctrader_task = asyncio.create_task(self._ctrader_stream_loop())

    def sync_ctrader_subscriptions(self):
        ws = self.ctrader_ws
        if ws is not None:
            syms = list(self.get_all_subscribed_symbols())
            if syms:
                asyncio.create_task(self._safe_ws_send(ws, json.dumps({
                    "type": "MARKET_SUBSCRIBE",
                    "symbols": syms
                })))

    async def _safe_ws_send(self, ws: Any, text: str):
        try:
            await ws.send(text)
        except Exception:
            pass

    async def _ctrader_stream_loop(self):
        feed_url = str(os.getenv("FEED_SERVICE_URL") or os.getenv("MARKET_FEED_URL") or "").rstrip("/")
        if not feed_url:
            return
        ws_url = feed_url.replace("https://", "wss://").replace("http://", "ws://") + "/internal/stream"
        api_key = os.getenv("FEED_INTERNAL_API_KEY", "")
        headers = {"x-internal-api-key": api_key} if api_key else None

        while len(self.all_sockets) > 0:
            try:
                async with websockets.connect(
                    ws_url,
                    additional_headers=headers,
                    open_timeout=10,
                    ping_interval=20,
                    ping_timeout=10
                ) as ws:
                    self.ctrader_ws = ws
                    self.sync_ctrader_subscriptions()
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                            if msg.get("type") == "MARKET_TICK" and isinstance(msg.get("tick"), dict):
                                await self.broadcast_raw_tick(msg["tick"])
                        except Exception:
                            pass
            except Exception as e:
                self.ctrader_ws = None
                await asyncio.sleep(2.0)
            finally:
                self.ctrader_ws = None

    async def _market_ticker_loop(self):
        b_url = os.getenv("BINANCE_API_URL", "https://api.binance.com").rstrip("/")
        async with httpx.AsyncClient(timeout=3.0) as client:
            while len(self.all_sockets) > 0:
                try:
                    symbols = self.get_all_subscribed_symbols()
                    if symbols:
                        crypto_syms = [s for s in symbols if s.endswith("USDT") or s.endswith("BUSD") or s in {"BTC", "ETH", "SOL", "XRP", "ADA", "BNB"}]
                        if crypto_syms:
                            resp = await client.get(f"{b_url}/api/v3/ticker/price")
                            if resp.status_code == 200:
                                price_map = {item["symbol"]: float(item["price"]) for item in resp.json() if "symbol" in item and "price" in item}
                                now_ts = int(time.time())
                                for s in crypto_syms:
                                    pair = s if s.endswith("USDT") else f"{s}USDT"
                                    if pair in price_map:
                                        await self.broadcast_tick(s, price_map[pair], now_ts)
                except Exception as e:
                    logger.warning("ws_ticker_loop.error", {"error": str(e)})
                await asyncio.sleep(1.0)

ws_manager = WebSocketServerManager()
