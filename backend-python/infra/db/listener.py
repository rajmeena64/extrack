import os, json, asyncio, asyncpg
from typing import Callable, Dict, List
from core.websocket.ws_server import ws_manager
from domains.instruments.registry import refresh_instrument_cache

_handlers: Dict[str, List[Callable]] = {
    "instruments": [lambda *_: refresh_instrument_cache()]
}

def register_table_handler(table: str, handler: Callable):
    _handlers.setdefault(table, []).append(handler)

def _get_listener_dsn() -> str:
    dsn = os.getenv("DATABASE_URL", "")
    return dsn.replace(":6543", ":5432").replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

async def _on_db_change(conn, pid, channel, payload):
    try:
        data = json.loads(payload)
        tbl = data.get("table")
        for fn in _handlers.get(tbl, []):
            res = fn(data)
            if asyncio.iscoroutine(res):
                asyncio.create_task(res)
        await ws_manager.broadcast({"type": "DB_CHANGE", "change": data})
    except Exception:
        pass

async def run_db_listener():
    dsn = _get_listener_dsn()
    ssl = "require" if os.getenv("DB_SSL_ENABLED", "true") == "true" else False
    while True:
        conn = None
        try:
            conn = await asyncpg.connect(dsn=dsn, ssl=ssl)
            await conn.add_listener("db_changes", _on_db_change)
            while not conn.is_closed():
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            if conn and not conn.is_closed():
                await conn.close()
            break
        except Exception:
            if conn and not conn.is_closed():
                try:
                    await conn.close()
                except Exception:
                    pass
            await asyncio.sleep(5)
