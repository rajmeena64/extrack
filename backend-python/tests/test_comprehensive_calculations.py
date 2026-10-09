import sys
import unittest
import time
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from infra.db.postgres import init_db, close_db
from domains.trading.writes import insert_trade, update_trade
from core.calculations.formulas import (
    calculate_gross_pnl, calculate_net_pnl, calculate_percent_change,
    calculate_trade_risk, calculate_initial_target, calculate_planned_r_multiple,
    calculate_realized_r_multiple, calculate_breakeven_price, resolve_multiplier
)
from core.calculations.metrics import compute_stats
from core.finance.currency import get_fx_rate

class TestComprehensiveCalculations(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.pool = await init_db()
        self.ts = int(time.time() * 1000)
        self.email = f"comp_tester_{self.ts}@entrack-test.com"
        user_row = await self.pool.fetchrow(
            "INSERT INTO app_auth.users (first_name, last_name, name, email, email_normalized, password_hash, status, is_deleted) VALUES ('Comp', 'Tester', 'Comp Tester', $1, $1, 'pwd', 'active', false) RETURNING id",
            self.email
        )
        self.user_id = user_row["id"]
        integration_id = await self.pool.fetchval("SELECT id FROM trading_catalog.broker_integrations LIMIT 1")
        conn_row = await self.pool.fetchrow(
            "INSERT INTO broker_connections.user_broker_connections (user_id, integration_id, external_account_id, account_name, status, metadata, connected_at) VALUES ($1, $2, $3, 'Test Acc', 'connected', '{}'::jsonb, NOW()) RETURNING id",
            self.user_id, integration_id, f"acct_{self.ts}"
        )
        self.connection_id = str(conn_row["id"])
        self.now_str = "2026-07-24T10:00:00Z"

    async def asyncTearDown(self):
        await self.pool.execute("DELETE FROM trading.trades WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM app_auth.users WHERE id = $1", self.user_id)
        await close_db()

    async def test_forex_jpy_manual_trade_dynamic_usd_conversion(self):
        entry_p, exit_p, qty = 155.0, 156.0, 1.0
        trade = {
            "user_id": self.user_id, "broker_connection_id": self.connection_id,
            "symbol": "USDJPY", "product_type": "forex", "side": "long",
            "quantity": qty, "entry_price": entry_p, "exit_price": exit_p,
            "total_charges": 5.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str
        }
        mult = resolve_multiplier("USDJPY", "forex", trade)
        raw_jpy = (exit_p - entry_p) * 1.0 * qty * mult
        fx_rate = await get_fx_rate(self.pool, "JPY", "USD", "2026-07-24")
        expected_gross_usd = round(raw_jpy * fx_rate, 2)
        expected_net_usd = round(expected_gross_usd - 5.0, 2)
        row = await insert_trade(self.pool, trade)
        self.assertEqual(row["pnl_currency"], "USD")
        self.assertEqual(float(row["gross_pnl"]), expected_gross_usd)
        self.assertEqual(float(row["net_pnl"]), expected_net_usd)

    async def test_broker_file_import_mismatched_quote_pnl_normalization(self):
        trade = {
            "user_id": self.user_id, "broker_connection_id": self.connection_id,
            "symbol": "GBPJPY", "product_type": "forex", "side": "long",
            "quantity": 1.0, "entry_price": 208.45, "exit_price": 208.534,
            "gross_pnl": 8400.0, "net_pnl": 53.59, "total_charges": 0.0,
            "source": "file", "entry_timestamp": self.now_str, "exit_timestamp": self.now_str
        }
        row = await insert_trade(self.pool, trade)
        self.assertEqual(row["pnl_currency"], "USD")
        self.assertEqual(float(row["net_pnl"]), 53.59)
        self.assertEqual(float(row["gross_pnl"]), float(row["net_pnl"]) + float(row["total_charges"]))

    async def test_trade_update_auto_recalculates_stale_pnl(self):
        trade = {
            "user_id": self.user_id, "broker_connection_id": self.connection_id,
            "symbol": "AAPL", "product_type": "stock", "side": "long", "quantity": 10.0,
            "entry_price": 100.0, "exit_price": 110.0, "total_charges": 2.0,
            "entry_timestamp": self.now_str, "exit_timestamp": self.now_str
        }
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 100.0)
        self.assertEqual(float(row["net_pnl"]), 98.0)
        self.assertEqual(float(row["percent_change"]), 10.0)
        updated = await update_trade(self.pool, self.user_id, row["unique_id"], {"exit_price": 150.0})
        self.assertIsNotNone(updated)
        self.assertEqual(float(updated["gross_pnl"]), 500.0)
        self.assertEqual(float(updated["net_pnl"]), 498.0)
        self.assertEqual(float(updated["percent_change"]), 50.0)

    def test_direction_long_short_sign_inversion(self):
        self.assertEqual(calculate_gross_pnl(100.0, 110.0, 1.0, "long"), 10.0)
        self.assertEqual(calculate_gross_pnl(100.0, 90.0, 1.0, "long"), -10.0)
        self.assertEqual(calculate_gross_pnl(100.0, 90.0, 1.0, "short"), 10.0)
        self.assertEqual(calculate_gross_pnl(100.0, 110.0, 1.0, "short"), -10.0)
        self.assertEqual(calculate_percent_change(100.0, 110.0, "long"), 10.0)
        self.assertEqual(calculate_percent_change(100.0, 90.0, "short"), 10.0)
        self.assertEqual(calculate_percent_change(100.0, 110.0, "short"), -10.0)

    def test_charges_and_fees_impact(self):
        self.assertEqual(calculate_net_pnl(100.0, 15.0), 85.0)
        self.assertEqual(calculate_net_pnl(-100.0, 15.0), -115.0)
        self.assertEqual(calculate_net_pnl(100.0, -15.0), 85.0)
        self.assertEqual(calculate_net_pnl(-100.0, -15.0), -115.0)

    def test_multipliers_by_asset_class(self):
        self.assertEqual(calculate_gross_pnl(2.0, 3.5, 2.0, "long", multiplier=100.0), 300.0)
        self.assertEqual(calculate_gross_pnl(1.0800, 1.0850, 1.0, "long", multiplier=100000.0), 500.0)
        self.assertEqual(calculate_gross_pnl(60000.0, 65000.0, 0.5, "long", multiplier=1.0), 2500.0)

    def test_risk_target_rmultiple_breakeven(self):
        risk = calculate_trade_risk(100.0, 90.0, 2.0, 1.0)
        self.assertEqual(risk, 20.0)
        target = calculate_initial_target(100.0, 130.0, 2.0, 1.0)
        self.assertEqual(target, 60.0)
        self.assertEqual(calculate_planned_r_multiple(risk, target), 3.0)
        self.assertEqual(calculate_realized_r_multiple(40.0, risk), 2.0)
        self.assertEqual(calculate_breakeven_price(100.0, 10.0, 2.0, "long", 1.0), 105.0)
        self.assertEqual(calculate_breakeven_price(100.0, 10.0, 2.0, "short", 1.0), 95.0)

    def test_dashboard_metrics_aggregation_consistency(self):
        trades = [
            {"pnl": 53.59, "date": "2026-07-24"},
            {"pnl": -178.10, "date": "2026-07-24"},
            {"pnl": 120.0, "date": "2026-07-25"}
        ]
        stats = compute_stats(trades)
        self.assertEqual(stats["totalTrades"], 3)
        self.assertEqual(stats["winningTrades"], 2)
        self.assertEqual(stats["losingTrades"], 1)
        self.assertEqual(stats["totalPnL"], -4.51)
        self.assertEqual(stats["grossProfit"], 173.59)
        self.assertEqual(stats["grossLoss"], 178.10)
        self.assertEqual(stats["profitFactor"], 0.97)

if __name__ == "__main__":
    unittest.main()
