import sys
import unittest
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

import httpx
from app import app
from infra.db.postgres import init_db, close_db
from infra.db.redis import get_redis
from domains.auth.service import sign_access_token

class TestTradeLifecycleEndToEnd(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.pool = await init_db()
        self.redis = get_redis()
        self.transport = httpx.ASGITransport(app=app)
        self.ts = int(time.time() * 1000)
        self.email = f"tradetest_{self.ts}@entrack-test.com"
        user_row = await self.pool.fetchrow(
            "INSERT INTO app_auth.users (first_name, last_name, name, email, email_normalized, password_hash, status, is_deleted) VALUES ('Trade', 'Tester', 'Trade Tester', $1, $1, 'hashed_test_password', 'active', false) RETURNING id",
            self.email
        )
        self.user_id = user_row["id"]
        self.access_token = sign_access_token(self.user_id)
        integration_id = await self.pool.fetchval("SELECT id FROM trading_catalog.broker_integrations LIMIT 1")
        conn_row = await self.pool.fetchrow(
            "INSERT INTO broker_connections.user_broker_connections (user_id, integration_id, external_account_id, account_name, status, metadata, connected_at) VALUES ($1, $2, $3, 'Test Manual Account', 'connected', '{}'::jsonb, NOW()) RETURNING id",
            self.user_id, integration_id, f"test_acct_{self.ts}"
        )
        self.connection_id = str(conn_row["id"])
        now = datetime.now(timezone.utc).replace(microsecond=0)
        self.d1 = (now - timedelta(days=2)).isoformat()
        self.d2 = (now - timedelta(days=1)).isoformat()
        self.d1_key = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        self.d2_key = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    async def asyncTearDown(self):
        await self.pool.execute("DELETE FROM trading.trades WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM trading.journal_entries WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM app_auth.users WHERE id = $1", self.user_id)
        await close_db()

    async def test_full_trade_and_dashboard_lifecycle(self):
        cookies = {"accessToken": self.access_token}
        async with httpx.AsyncClient(transport=self.transport, base_url="http://test", cookies=cookies) as client:
            t1_payload = {
                "broker_connection_id": self.connection_id,
                "symbol": "BTCUSDT",
                "side": "long",
                "quantity": 2.0,
                "entry_price": 60000.0,
                "exit_price": 65000.0,
                "total_charges": 20.0,
                "stop_loss": 58000.0,
                "take_profit": 66000.0,
                "strategy": "Breakout",
                "notes": "Solid breakout setup",
                "entry_timestamp": self.d1,
                "exit_timestamp": self.d1,
                "pnl_currency": "USD"
            }
            res1 = await client.post("/api/v1/trades", json=t1_payload)
            self.assertEqual(res1.status_code, 200)
            data1 = res1.json()
            self.assertTrue(data1["success"])
            t1 = data1["trade"]
            t1_id = t1["uniqueId"]
            self.assertEqual(t1["grossPnl"], 10000.0)
            self.assertEqual(t1["netPnl"], 9980.0)
            self.assertEqual(t1["pnl"], 9980.0)
            self.assertEqual(t1["totalCharges"], 20.0)
            self.assertEqual(t1["status"], "closed")

            t2_payload = {
                "broker_connection_id": self.connection_id,
                "symbol": "ETHUSDT",
                "side": "short",
                "quantity": 10.0,
                "entry_price": 3000.0,
                "exit_price": 2800.0,
                "total_charges": 15.0,
                "stop_loss": 3100.0,
                "take_profit": 2750.0,
                "strategy": "Mean Reversion",
                "notes": "Clean resistance short",
                "entry_timestamp": self.d1,
                "exit_timestamp": self.d1,
                "pnl_currency": "USD"
            }
            res2 = await client.post("/api/v1/trades", json=t2_payload)
            self.assertEqual(res2.status_code, 200)
            data2 = res2.json()
            t2 = data2["trade"]
            t2_id = t2["uniqueId"]
            self.assertEqual(t2["grossPnl"], 2000.0)
            self.assertEqual(t2["netPnl"], 1985.0)
            self.assertEqual(t2["pnl"], 1985.0)

            t3_payload = {
                "broker_connection_id": self.connection_id,
                "symbol": "SOLUSDT",
                "side": "long",
                "quantity": 50.0,
                "entry_price": 150.0,
                "exit_price": 140.0,
                "total_charges": 10.0,
                "stop_loss": 140.0,
                "take_profit": 170.0,
                "entry_timestamp": self.d2,
                "exit_timestamp": self.d2,
                "pnl_currency": "USD"
            }
            res3 = await client.post("/api/v1/trades", json=t3_payload)
            self.assertEqual(res3.status_code, 200)
            data3 = res3.json()
            t3 = data3["trade"]
            t3_id = t3["uniqueId"]
            self.assertEqual(t3["grossPnl"], -500.0)
            self.assertEqual(t3["netPnl"], -510.0)
            self.assertEqual(t3["pnl"], -510.0)

            t4_payload = {
                "broker_connection_id": self.connection_id,
                "symbol": "BNBUSDT",
                "side": "long",
                "quantity": 5.0,
                "entry_price": 500.0,
                "total_charges": 5.0,
                "entry_timestamp": self.d2,
                "pnl_currency": "USD"
            }
            res4 = await client.post("/api/v1/trades", json=t4_payload)
            self.assertEqual(res4.status_code, 200)
            data4 = res4.json()
            t4 = data4["trade"]
            t4_id = t4["uniqueId"]
            self.assertEqual(t4["status"], "open")
            self.assertIsNone(t4["grossPnl"])
            self.assertIsNone(t4["netPnl"])

            get_single = await client.get(f"/api/v1/trades/{t1_id}")
            self.assertEqual(get_single.status_code, 200)
            self.assertEqual(get_single.json()["trade"]["uniqueId"], t1_id)
            self.assertEqual(get_single.json()["trade"]["symbol"], "BTCUSDT")

            get_none = await client.get(f"/api/v1/trades/{uuid.uuid4()}")
            self.assertEqual(get_none.status_code, 404)

            list_all = await client.get("/api/v1/trades")
            self.assertEqual(list_all.status_code, 200)
            self.assertEqual(list_all.json()["totalCount"], 4)
            self.assertEqual(len(list_all.json()["trades"]), 4)

            list_btc = await client.get("/api/v1/trades?symbol=BTC")
            self.assertEqual(list_btc.status_code, 200)
            self.assertEqual(list_btc.json()["totalCount"], 1)
            self.assertEqual(list_btc.json()["trades"][0]["uniqueId"], t1_id)

            list_short = await client.get("/api/v1/trades?tradeType=short")
            self.assertEqual(list_short.status_code, 200)
            self.assertEqual(list_short.json()["totalCount"], 1)
            self.assertEqual(list_short.json()["trades"][0]["uniqueId"], t2_id)

            list_wins = await client.get("/api/v1/trades?winTrades=true")
            self.assertEqual(list_wins.status_code, 200)
            self.assertEqual(list_wins.json()["totalCount"], 2)

            list_loss = await client.get("/api/v1/trades?lossTrades=true")
            self.assertEqual(list_loss.status_code, 200)
            self.assertEqual(list_loss.json()["totalCount"], 1)
            self.assertEqual(list_loss.json()["trades"][0]["uniqueId"], t3_id)

            list_paginated = await client.get("/api/v1/trades?page=1&limit=2")
            self.assertEqual(list_paginated.status_code, 200)
            self.assertEqual(len(list_paginated.json()["trades"]), 2)
            self.assertEqual(list_paginated.json()["totalCount"], 4)

            update_res = await client.patch(f"/api/v1/trades/{t4_id}", json={
                "exitPrice": 550.0,
                "grossPnl": 250.0,
                "netPnl": 245.0,
                "status": "closed",
                "notes": "Closed on target",
                "strategy": "Momentum",
                "exit_timestamp": self.d2
            })
            self.assertEqual(update_res.status_code, 200)
            updated_t4 = update_res.json()["trade"]
            self.assertEqual(updated_t4["status"], "closed")
            self.assertEqual(updated_t4["netPnl"], 245.0)
            self.assertEqual(updated_t4["strategy"], "Momentum")

            list_sorted = await client.get("/api/v1/trades?sortBy=pnl&order=desc")
            self.assertEqual(list_sorted.status_code, 200)
            sorted_trades = list_sorted.json()["trades"]
            self.assertEqual(sorted_trades[0]["uniqueId"], t1_id)
            self.assertEqual(sorted_trades[1]["uniqueId"], t2_id)
            self.assertEqual(sorted_trades[2]["uniqueId"], t4_id)
            self.assertEqual(sorted_trades[3]["uniqueId"], t3_id)

            be_res = await client.patch("/api/v1/trades/breakeven-day", json={"date": self.d2_key, "isBreakeven": True})
            self.assertEqual(be_res.status_code, 200)
            self.assertTrue(be_res.json()["success"])

            dash_res = await client.get("/api/v1/analytics/dashboard")
            self.assertEqual(dash_res.status_code, 200)
            dash = dash_res.json()
            stats = dash["stats"]
            self.assertEqual(stats["totalTrades"], 4)
            self.assertEqual(stats["winningTrades"], 3)
            self.assertEqual(stats["losingTrades"], 1)
            self.assertEqual(stats["winRate"], 75.0)
            self.assertEqual(stats["totalPnL"], 11700.0)
            self.assertEqual(stats["grossProfit"], 12210.0)
            self.assertEqual(stats["grossLoss"], 510.0)
            self.assertEqual(stats["profitFactor"], 23.94)
            self.assertEqual(stats["avgPnL"], 2925.0)
            self.assertEqual(stats["totalTradingDays"], 2)
            self.assertEqual(stats["winningDays"], 1)
            self.assertEqual(stats["losingDays"], 1)
            self.assertEqual(stats["dayWinRate"], 50.0)

            cal = {item["dateKey"]: item for item in dash["calendar"]}
            self.assertIn(self.d1_key, cal)
            self.assertIn(self.d2_key, cal)
            self.assertEqual(cal[self.d1_key]["pnl"], 11965.0)
            self.assertEqual(cal[self.d1_key]["trades"], 2)
            self.assertEqual(cal[self.d1_key]["wins"], 2)
            self.assertEqual(cal[self.d1_key]["winRate"], 100.0)
            self.assertTrue(cal[self.d1_key]["hasBadge"])
            self.assertEqual(cal[self.d2_key]["pnl"], -265.0)
            self.assertEqual(cal[self.d2_key]["trades"], 2)
            self.assertEqual(cal[self.d2_key]["wins"], 1)
            self.assertEqual(cal[self.d2_key]["winRate"], 50.0)
            self.assertTrue(cal[self.d2_key]["isBreakeven"])

            perf = dash["performanceChart"]
            self.assertEqual(len(perf), 2)
            self.assertEqual(perf[0]["date"], self.d1_key)
            self.assertEqual(perf[0]["cumulativePnL"], 11965.0)
            self.assertEqual(perf[1]["date"], self.d2_key)
            self.assertEqual(perf[1]["cumulativePnL"], 11700.0)

            radar = dash["radar"]
            self.assertIn("overallScore", radar)
            self.assertIn("win", radar)
            self.assertIn("profit", radar)
            self.assertIn("avg", radar)
            self.assertIn("recovery", radar)
            self.assertIn("drawdown", radar)
            self.assertIn("consistency", radar)

            be_reset = await client.patch("/api/v1/trades/breakeven-day", json={"date": self.d2_key, "isBreakeven": False})
            self.assertEqual(be_reset.status_code, 200)

            del_res = await client.delete(f"/api/v1/trades/{t4_id}")
            self.assertEqual(del_res.status_code, 200)
            self.assertTrue(del_res.json()["success"])

            post_del_get = await client.get(f"/api/v1/trades/{t4_id}")
            self.assertEqual(post_del_get.status_code, 404)

            dash_after_del = await client.get("/api/v1/analytics/dashboard")
            self.assertEqual(dash_after_del.status_code, 200)
            stats_after = dash_after_del.json()["stats"]
            self.assertEqual(stats_after["totalTrades"], 3)
            self.assertEqual(stats_after["winningTrades"], 2)
            self.assertEqual(stats_after["losingTrades"], 1)
            self.assertEqual(stats_after["winRate"], 66.67)
            self.assertEqual(stats_after["totalPnL"], 11455.0)

    async def test_bulk_and_upsert_trades(self):
        cookies = {"accessToken": self.access_token}
        async with httpx.AsyncClient(transport=self.transport, base_url="http://test", cookies=cookies) as client:
            u1, u2 = f"bulk_{self.ts}_1", f"bulk_{self.ts}_2"
            batch_payload = [
                {
                    "unique_id": u1,
                    "broker_connection_id": self.connection_id,
                    "symbol": "ETHUSDT",
                    "side": "long",
                    "quantity": 5.0,
                    "entry_price": 3000.0,
                    "exit_price": 3100.0,
                    "total_charges": 10.0,
                    "entry_timestamp": self.d1,
                    "exit_timestamp": self.d1,
                    "source": "file"
                },
                {
                    "unique_id": u2,
                    "broker_connection_id": self.connection_id,
                    "symbol": "SOLUSDT",
                    "side": "short",
                    "quantity": 20.0,
                    "entry_price": 150.0,
                    "exit_price": 140.0,
                    "total_charges": 5.0,
                    "entry_timestamp": self.d2,
                    "exit_timestamp": self.d2,
                    "source": "sync"
                }
            ]
            res = await client.post("/api/v1/trades", json=batch_payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["count"], 2)
            self.assertEqual(len(data["trades"]), 2)
            self.assertEqual(data["trades"][0]["uniqueId"], u1)
            self.assertEqual(data["trades"][0]["netPnl"], 490.0)
            self.assertEqual(data["trades"][1]["uniqueId"], u2)
            self.assertEqual(data["trades"][1]["netPnl"], 195.0)

            db_count_1 = await self.pool.fetchval("SELECT COUNT(*) FROM trading.trades WHERE user_id = $1 AND unique_id IN ($2, $3)", self.user_id, u1, u2)
            self.assertEqual(db_count_1, 2)

            batch_payload[0]["exit_price"] = 3200.0
            upsert_res = await client.post("/api/v1/trades", json=batch_payload)
            self.assertEqual(upsert_res.status_code, 200)
            upsert_data = upsert_res.json()
            self.assertTrue(upsert_data["success"])
            self.assertEqual(upsert_data["trades"][0]["netPnl"], 990.0)

            db_count_2 = await self.pool.fetchval("SELECT COUNT(*) FROM trading.trades WHERE user_id = $1 AND unique_id IN ($2, $3)", self.user_id, u1, u2)
            self.assertEqual(db_count_2, 2)

if __name__ == "__main__":
    unittest.main()

