import os
import time
import json
import asyncio
from typing import Dict, Set, Any
from fastapi import WebSocket
import httpx
import websockets
from core.logger.logger import logger
from domains.instruments.registry import find_by_symbol

MAX_WS_PER_USER = int(os.environ.get("MAX_WS_CONNECTIONS_PER_USER", 10))
MAX_WS_TOTAL = int(os.environ.get("MAX_WS_TOTAL_CONNECTIONS", 1000))

class WebSocketServerManager:
    def __init__(self):
        self.user_sockets: Dict[str, Set[WebSocket]] = {}
        self.all_sockets: Set[WebSocket] = set()
        self.socket_symbols: Dict[WebSocket, Set[str]] = {}
        self.ticker_task: asyncio.Task | None = None
        self.fut_task: asyncio.Task | None = None
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
        cleaned = set()
        for s in symbols:
            inst = find_by_symbol(s)
            cleaned.add(inst["symbol"] if inst else str(s).strip().upper())
        self.socket_symbols[ws] = cleaned
        self.sync_ctrader_subscriptions()

    def get_all_subscribed_symbols(self) -> Set[str]:
        res = set()
        for syms in self.socket_symbols.values():
            res.update(syms)
        try:
            from domains.notifications.service import get_active_alert_symbols
            res.update(get_active_alert_symbols())
        except Exception:
            pass
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

    async def process_market_tick(self, symbol: str, price: float, bid: float = 0.0, ask: float = 0.0, timestamp: int | None = None, open_price: float = 0.0, high_price: float = 0.0, low_price: float = 0.0, candle_time: int | None = None):
        if not symbol or price <= 0:
            return
        inst = find_by_symbol(symbol)
        clean_sym = inst["symbol"] if inst else symbol.strip().upper()
        b = bid if bid > 0 else price
        a = ask if ask > 0 else price
        ts = timestamp or int(time.time())
        try:
            from domains.notifications.service import evaluate_tick_alerts
            await evaluate_tick_alerts(clean_sym, price)
        except Exception:
            pass
        payload = {
            "type": "MARKET_TICK",
            "tick": {
                "symbolName": clean_sym,
                "price": price,
                "last": price,
                "bid": b,
                "ask": a,
                "open": open_price if open_price > 0 else price,
                "high": high_price if high_price > 0 else price,
                "low": low_price if low_price > 0 else price,
                "candleTime": candle_time or ts,
                "timestamp": ts,
                "serverTime": ts
            }
        }
        for ws, syms in list(self.socket_symbols.items()):
            if clean_sym in syms:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass

    async def broadcast_tick(self, symbol: str, price: float, timestamp: int | None = None):
        await self.process_market_tick(symbol, price, timestamp=timestamp)

    async def broadcast_raw_tick(self, tick: dict):
        raw_sym = str(tick.get("symbolName") or tick.get("symbol") or "")
        bid = float(tick.get("bid") or 0)
        ask = float(tick.get("ask") or 0)
        price = float(tick.get("price") or ((bid + ask) / 2 if bid and ask else bid or ask))
        open_p = float(tick.get("open") or 0)
        high_p = float(tick.get("high") or 0)
        low_p = float(tick.get("low") or 0)
        c_time = tick.get("candleTime")
        await self.process_market_tick(raw_sym, price, bid=bid, ask=ask, timestamp=tick.get("timestamp"), open_price=open_p, high_price=high_p, low_price=low_p, candle_time=c_time)

    def ensure_loops(self):
        if self.ctrader_task is None or self.ctrader_task.done():
            self.ctrader_task = asyncio.create_task(self._ctrader_stream_loop())
        if self.ticker_task is None or self.ticker_task.done():
            self.ticker_task = asyncio.create_task(self._binance_stream_loop("wss://stream.binance.com:9443/ws/!miniTicker@arr"))
        if self.fut_task is None or self.fut_task.done():
            self.fut_task = asyncio.create_task(self._binance_stream_loop("wss://fstream.binance.com/ws/!miniTicker@arr"))

    async def _binance_stream_loop(self, url: str):
        while True:
            try:
                async with websockets.connect(url, open_timeout=10, ping_interval=20, ping_timeout=10) as ws:
                    async for raw in ws:
                        try:
                            data = json.loads(raw)
                            if isinstance(data, list):
                                for item in data:
                                    s = item.get("s")
                                    c = item.get("c")
                                    if s and c:
                                        ts = int(item.get("E", 0)) // 1000 or int(time.time())
                                        await self.process_market_tick(s, float(c), timestamp=ts)
                        except Exception:
                            pass
            except Exception:
                await asyncio.sleep(2.0)

    def sync_ctrader_subscriptions(self):
        ws = self.ctrader_ws
        if ws is not None:
            syms = list(self.get_all_subscribed_symbols())
            if not syms:
                from domains.instruments.registry import _cache
                syms = [i["symbol"] for i in _cache.get("list", []) if str(i.get("marketSource") or "").lower() == "entrackcfeed"]
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
        while True:
            try:
                async with websockets.connect(ws_url, additional_headers=headers, open_timeout=10, ping_interval=20, ping_timeout=10) as ws:
                    self.ctrader_ws = ws
                    self.sync_ctrader_subscriptions()
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                            if msg.get("type") == "MARKET_TICK" and isinstance(msg.get("tick"), dict):
                                await self.broadcast_raw_tick(msg["tick"])
                        except Exception:
                            pass
            except Exception:
                self.ctrader_ws = None
                await asyncio.sleep(2.0)
            finally:
                self.ctrader_ws = None

ws_manager = WebSocketServerManager()


