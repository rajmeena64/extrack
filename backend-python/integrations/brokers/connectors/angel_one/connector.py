import base64
import hashlib
import hmac
import os
import struct
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from integrations.brokers.base import BaseBroker

BASE_URL = os.getenv("ANGEL_ONE_BASE_URL", "https://apiconnect.angelbroking.com").rstrip("/")

def _generate_totp(secret: str) -> str:
    s = secret.strip().upper()
    if s.isdigit() and len(s) == 6:
        return s
    k = base64.b32decode(s, casefold=True)
    c = struct.pack(">Q", int(time.time() // 30))
    m = hmac.new(k, c, hashlib.sha1).digest()
    o = m[-1] & 0x0F
    val = (struct.unpack(">I", m[o:o+4])[0] & 0x7FFFFFFF) % 1000000
    return f"{val:06d}"

def _headers(api_key: str, jwt_token: str = "") -> Dict[str, str]:
    h = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "fe80::1",
        "X-PrivateKey": api_key,
    }
    if jwt_token:
        h["Authorization"] = f"Bearer {jwt_token.removeprefix('Bearer ')}"
    return h

class AngelOneBroker(BaseBroker):
    def __init__(self):
        self._slug = "angel-one"

    @property
    def slug(self) -> str:
        return self._slug

    async def _login(self, creds: Dict[str, Any]) -> tuple[str, str]:
        api_key = str(creds.get("apiKey") or os.getenv("ANGEL_ONE_API_KEY", "")).strip()
        client_code = str(creds.get("clientCode") or os.getenv("ANGEL_ONE_CLIENT_CODE", "")).strip()
        pwd = str(creds.get("password") or creds.get("pin") or os.getenv("ANGEL_ONE_PASSWORD", "")).strip()
        totp_secret = str(creds.get("totpKey") or creds.get("totp") or os.getenv("ANGEL_ONE_TOTP_KEY", "")).strip()
        totp_val = _generate_totp(totp_secret)
        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(
                f"{BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword",
                json={"clientcode": client_code, "password": pwd, "totp": totp_val},
                headers=_headers(api_key),
            )
            data = res.json()
            if not data.get("status"):
                err = data.get("message") or data.get("errorcode") or "Angel One authentication failed"
                raise RuntimeError(str(err))
            jwt = data.get("data", {}).get("jwtToken", "")
            return api_key, jwt

    async def connect(self, credentials: Dict[str, Any]) -> bool:
        await self._login(credentials)
        return True

    async def fetch_trades(self, credentials: Dict[str, Any], since: Optional[int] = None) -> List[Dict[str, Any]]:
        api_key, jwt = await self._login(credentials)
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{BASE_URL}/rest/secure/angelbroking/order/v1/getTradeBook",
                headers=_headers(api_key, jwt),
            )
            data = res.json()
            raw_fills = data.get("data") if isinstance(data.get("data"), list) else []
            trades: List[Dict[str, Any]] = []
            sym_fills: Dict[str, List[Dict[str, Any]]] = {}
            for fill in raw_fills:
                sym = str(fill.get("tradingsymbol", "")).upper()
                if sym:
                    sym_fills.setdefault(sym, []).append(fill)
            for sym, fills in sym_fills.items():
                buys: List[Dict[str, Any]] = []
                sells: List[Dict[str, Any]] = []
                for f in fills:
                    txn = str(f.get("transactiontype", "")).upper()
                    price = float(f.get("fillprice", 0) or 0)
                    qty = float(f.get("fillsize", 0) or 0)
                    if price <= 0 or qty <= 0:
                        continue
                    f_time = f.get("filltime")
                    iso_time = None
                    if f_time:
                        try:
                            iso_time = datetime.strptime(str(f_time).strip(), "%d-%b-%Y %H:%M:%S").replace(tzinfo=timezone.utc).isoformat()
                        except Exception:
                            iso_time = str(f_time)
                    mult = float(f.get("multiplier", 1.0) or 1.0)
                    seg = str(f.get("segment", "EQUITY")).lower()
                    cat = "options" if "opt" in seg else ("futures" if "fut" in seg else ("commodity" if "mcx" in seg else "equity"))
                    item = {"id": str(f.get("fillid") or f.get("orderid", "")), "price": price, "qty": qty, "time": iso_time, "mult": mult, "cat": cat}
                    if txn in ("BUY", "B"):
                        buys.append(item)
                    else:
                        sells.append(item)
                b_idx, s_idx = 0, 0
                while b_idx < len(buys) and s_idx < len(sells):
                    b, s = buys[b_idx], sells[s_idx]
                    matched_qty = min(b["qty"], s["qty"])
                    pnl = (s["price"] - b["price"]) * matched_qty * b["mult"]
                    trades.append({
                        "unique_id": f"angel-one:{b['id']}_{s['id']}",
                        "symbol": sym,
                        "side": "long",
                        "entry_price": b["price"],
                        "exit_price": s["price"],
                        "quantity": matched_qty,
                        "contract_multiplier": b["mult"],
                        "entry_timestamp": b["time"],
                        "exit_timestamp": s["time"] or b["time"],
                        "gross_pnl": pnl,
                        "net_pnl": pnl,
                        "pnl_currency": "INR",
                        "product_type": b["cat"],
                        "category": b["cat"],
                        "status": "closed",
                        "total_charges": 0.0,
                    })
                    b["qty"] -= matched_qty
                    s["qty"] -= matched_qty
                    if b["qty"] <= 0:
                        b_idx += 1
                    if s["qty"] <= 0:
                        s_idx += 1
                while b_idx < len(buys):
                    b = buys[b_idx]
                    if b["qty"] > 0:
                        trades.append({
                            "unique_id": f"angel-one:{b['id']}",
                            "symbol": sym,
                            "side": "long",
                            "entry_price": b["price"],
                            "exit_price": b["price"],
                            "quantity": b["qty"],
                            "contract_multiplier": b["mult"],
                            "entry_timestamp": b["time"],
                            "exit_timestamp": b["time"],
                            "pnl_currency": "INR",
                            "product_type": b["cat"],
                            "category": b["cat"],
                            "status": "open",
                            "total_charges": 0.0,
                        })
                    b_idx += 1
                while s_idx < len(sells):
                    s = sells[s_idx]
                    if s["qty"] > 0:
                        trades.append({
                            "unique_id": f"angel-one:{s['id']}",
                            "symbol": sym,
                            "side": "short",
                            "entry_price": s["price"],
                            "exit_price": s["price"],
                            "quantity": s["qty"],
                            "contract_multiplier": s["mult"],
                            "entry_timestamp": s["time"],
                            "exit_timestamp": s["time"],
                            "pnl_currency": "INR",
                            "product_type": s["cat"],
                            "category": s["cat"],
                            "status": "open",
                            "total_charges": 0.0,
                        })
                    s_idx += 1
            return trades

    async def fetch_positions(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        api_key, jwt = await self._login(credentials)
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{BASE_URL}/rest/secure/angelbroking/order/v1/getPosition",
                headers=_headers(api_key, jwt),
            )
            data = res.json()
            raw_pos = data.get("data") if isinstance(data.get("data"), list) else []
            positions: List[Dict[str, Any]] = []
            for p in raw_pos:
                sym = str(p.get("tradingsymbol", "")).upper()
                net_qty = float(p.get("netqty", 0) or 0)
                if net_qty == 0:
                    continue
                side = "long" if net_qty > 0 else "short"
                price = float(p.get("netprice", 0) or 0)
                pnl = float(p.get("pnl", 0) or p.get("unrealised", 0) or 0)
                positions.append({
                    "symbol": sym,
                    "side": side,
                    "contracts": abs(net_qty),
                    "entryPrice": price,
                    "unrealizedPnl": pnl,
                    "id": str(p.get("symboltoken", sym)),
                })
            return positions

    async def fetch_balances(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        api_key, jwt = await self._login(credentials)
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{BASE_URL}/rest/secure/angelbroking/user/v1/getRMS",
                headers=_headers(api_key, jwt),
            )
            data = res.json()
            rms = data.get("data", {}) if isinstance(data.get("data"), dict) else {}
            cash = float(rms.get("availablecash", 0) or rms.get("net", 0) or 0)
            return [{"currency": "INR", "free": cash, "total": cash}]
