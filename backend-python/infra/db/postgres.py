import os
import asyncio
from dotenv import load_dotenv
load_dotenv()
import asyncpg

_pool = None

async def init_db():
    global _pool
    loop = asyncio.get_running_loop()
    if not _pool or getattr(_pool, "_loop", None) != loop or getattr(_pool, "_closed", False):
        if _pool and not getattr(_pool, "_closed", False):
            try:
                old = _pool
                _pool = None
                p_loop = getattr(old, "_loop", None)
                if p_loop and not p_loop.is_closed():
                    if p_loop == loop:
                        await old.close()
                    else:
                        asyncio.run_coroutine_threadsafe(old.close(), p_loop)
            except Exception:
                pass
        _pool = await asyncpg.create_pool(
            dsn=os.getenv("DATABASE_URL"),
            min_size=int(os.getenv("DB_POOL_MIN", "1")),
            max_size=int(os.getenv("DB_POOL_MAX", "5")),
            ssl="require" if os.getenv("DB_SSL_ENABLED", "true") == "true" else False,
        )
    return _pool

async def get_db():
    pool = await init_db()
    async with pool.acquire() as conn:
        yield conn

async def close_db():
    global _pool
    if _pool and not getattr(_pool, "_closed", False):
        try:
            old = _pool
            _pool = None
            await old.close()
        except Exception:
            pass

