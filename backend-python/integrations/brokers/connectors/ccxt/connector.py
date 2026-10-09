from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
import ccxt.async_support as ccxt
from integrations.brokers.base import BaseBroker

class CCXTBroker(BaseBroker):
    def __init__(self, exchange_slug: str):
        self._slug = exchange_slug
        cls = getattr(ccxt, exchange_slug, None)
        if not cls:
            raise ValueError(f"Unsupported exchange: {exchange_slug}")
        self._cls = cls

    @property
    def slug(self) -> str:
        return self._slug

    def _get_client(self, credentials: Dict[str, Any]):
        market = credentials.get("market", "future")
        default_type = "spot" if market == "spot" else "future"
        client = self._cls({
            "apiKey": credentials.get("apiKey"),
            "secret": credentials.get("secretKey"),
            "password": credentials.get("passphrase"),
            "enableRateLimit": True,
            "options": {
                "defaultType": default_type,
                "adjustForTimeDifference": True,
                "recvWindow": 10000,
            },
        })
        if credentials.get("environment") == "demo":
            if hasattr(client, "set_sandbox_mode"):
                client.set_sandbox_mode(True)
            elif hasattr(client, "enable_demo_trading"):
                client.enable_demo_trading(True)
        return client

    async def connect(self, credentials: Dict[str, Any]) -> bool:
        client = self._get_client(credentials)
        try:
            await client.fetch_balance()
            return True
        finally:
            await client.close()

    async def fetch_trades(self, credentials: Dict[str, Any], since: Optional[int] = None) -> List[Dict[str, Any]]:
        client = self._get_client(credentials)
        trades: List[Dict[str, Any]] = []
        try:
            if self._slug == "binance" and hasattr(client, "fapiPrivateGetIncome"):
                params: Dict[str, Any] = {"incomeType": "REALIZED_PNL", "limit": 1000}
                if since:
                    params["startTime"] = since
                income_list = await client.fapiPrivateGetIncome(params)
                symbols = list({str(inc.get("symbol", "")).upper() for inc in (income_list or []) if inc.get("symbol")})
                all_user_trades: List[Dict[str, Any]] = []
                for sym in symbols[:15]:
                    try:
                        p_args: Dict[str, Any] = {"symbol": sym, "limit": 1000}
                        if since:
                            p_args["startTime"] = since
                        ut_list = await client.fapiPrivateGetUserTrades(p_args)
                        if isinstance(ut_list, list):
                            all_user_trades.extend(ut_list)
                    except Exception:
                        pass
                if all_user_trades:
                    for ut in all_user_trades:
                        raw_pnl = float(ut.get("realizedPnl", 0) or 0)
                        price = float(ut.get("price", 0) or 0)
                        qty = float(ut.get("qty", 0) or 0)
                        if price <= 0 or qty <= 0:
                            continue
                        side_str = str(ut.get("side", "")).upper()
                        pos_side = str(ut.get("positionSide", "BOTH")).upper()
                        is_sell = side_str in ("SELL", "S")
                        direction = "short" if (pos_side == "SHORT" or (pos_side == "BOTH" and is_sell and raw_pnl == 0)) else "long"
                        if raw_pnl != 0:
                            entry_p = (price - (raw_pnl / qty)) if direction == "long" else (price + (raw_pnl / qty))
                            if entry_p <= 0:
                                entry_p = price
                        else:
                            entry_p = price
                        t_ms = ut.get("time")
                        iso_time = datetime.fromtimestamp(t_ms / 1000.0, tz=timezone.utc).isoformat() if t_ms else None
                        comm = abs(float(ut.get("commission", 0) or 0))
                        trades.append({
                            "unique_id": f"binance:{ut.get('id', t_ms)}",
                            "symbol": str(ut.get("symbol", "")).upper(),
                            "side": direction,
                            "entry_price": entry_p,
                            "exit_price": price,
                            "quantity": qty,
                            "entry_timestamp": iso_time,
                            "exit_timestamp": iso_time,
                            "gross_pnl": raw_pnl,
                            "net_pnl": raw_pnl - comm,
                            "pnl_currency": str(ut.get("marginAsset", "USDT")).upper(),
                            "product_type": "crypto",
                            "category": "crypto",
                            "status": "closed" if raw_pnl != 0 else "open",
                            "total_charges": comm,
                        })
                else:
                    for inc in (income_list or []):
                        pnl = float(inc.get("income", 0))
                        symbol = str(inc.get("symbol", "")).upper()
                        t_ms = inc.get("time")
                        iso_time = datetime.fromtimestamp(t_ms / 1000.0, tz=timezone.utc).isoformat() if t_ms else None
                        trade_id = str(inc.get("tranId") or inc.get("tradeId") or t_ms)
                        trades.append({
                            "unique_id": f"binance:{trade_id}",
                            "symbol": symbol,
                            "side": "long",
                            "entry_price": 1.0,
                            "exit_price": 1.0 + pnl,
                            "quantity": 1.0,
                            "entry_timestamp": iso_time,
                            "exit_timestamp": iso_time,
                            "gross_pnl": pnl,
                            "net_pnl": pnl,
                            "pnl_currency": inc.get("asset", "USDT"),
                            "product_type": "crypto",
                            "category": "crypto",
                            "status": "closed",
                            "total_charges": 0.0,
                        })
            elif hasattr(client, "fetch_positions_history") and client.has.get("fetchPositionsHistory"):
                raw_positions = await client.fetch_positions_history(since=since)
                for p in (raw_positions or []):
                    side = str(p.get("side", "")).lower()
                    if side not in ("long", "short"):
                        continue
                    entry_p = float(p.get("entryPrice", 0) or 0)
                    exit_p = float(p.get("lastPrice", 0) or 0)
                    qty = float(p.get("contracts", 0) or 0)
                    if entry_p <= 0 or exit_p <= 0 or qty <= 0:
                        continue
                    net_pnl = float(p.get("realizedPnl", 0) or 0)
                    t_ms = p.get("timestamp")
                    iso_time = datetime.fromtimestamp(t_ms / 1000.0, tz=timezone.utc).isoformat() if t_ms else None
                    trades.append({
                        "unique_id": f"{self._slug}:{p.get('id', uuid.uuid4())}",
                        "symbol": str(p.get("symbol", "")).upper(),
                        "side": side,
                        "entry_price": entry_p,
                        "exit_price": exit_p,
                        "quantity": qty,
                        "entry_timestamp": iso_time,
                        "exit_timestamp": iso_time,
                        "gross_pnl": net_pnl,
                        "net_pnl": net_pnl,
                        "pnl_currency": p.get("marginAsset", "USDT"),
                        "product_type": "crypto",
                        "category": "crypto",
                        "status": "closed",
                        "total_charges": 0.0,
                    })
            return trades
        finally:
            await client.close()

    async def fetch_positions(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        client = self._get_client(credentials)
        try:
            return await client.fetch_positions()
        finally:
            await client.close()

    async def fetch_balances(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        client = self._get_client(credentials)
        try:
            bal = await client.fetch_balance()
            total_map = bal.get("total") if isinstance(bal.get("total"), dict) else {}
            free_map = bal.get("free") if isinstance(bal.get("free"), dict) else {}
            return [{"currency": k, "free": free_map[k] if k in free_map else 0, "total": v} for k, v in total_map.items() if isinstance(v, (int, float)) and v > 0]
        finally:
            await client.close()
