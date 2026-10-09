import asyncpg

async def delete_trade(pool: asyncpg.Pool, user_id: int, unique_id: str) -> dict | None:
    row = await pool.fetchrow("DELETE FROM trading.trades WHERE unique_id = $1 AND user_id = $2 RETURNING id, unique_id, symbol", unique_id, user_id)
    return dict(row) if row else None
