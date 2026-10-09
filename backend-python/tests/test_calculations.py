import sys
import unittest
import time
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from infra.db.postgres import init_db, close_db
from domains.trading.writes import insert_trade
from core.calculations.formulas import (
    calculate_gross_pnl, calculate_net_pnl,
    calculate_adjusted_cost, calculate_adjusted_proceeds, calculate_net_roi,
    calculate_trade_risk, calculate_initial_target, calculate_planned_r_multiple,
    calculate_realized_r_multiple, calculate_breakeven_price, calculate_forex_pips,
    is_forex_jpy_pair, get_forex_pip_size
)
from core.calculations.metrics import compute_stats, compute_radar
from core.calculations.engine import build_performance_and_activity, build_calendar_breakdown
from core.finance.currency import convert_trade_pnl, get_fx_rate
from core.calculations.calculator import calculate_trade_pnl
from domains.instruments.registry import ensure_loaded
from core.errors.app_error import AppError

class TestBackendTradingCalculations(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.pool = await init_db()
        await ensure_loaded()
        self.ts = int(time.time() * 1000)
        self.email = f"calc_tester_{self.ts}@entrack-test.com"
        user_row = await self.pool.fetchrow(
            "INSERT INTO app_auth.users (first_name, last_name, name, email, email_normalized, password_hash, status, is_deleted) VALUES ('Calc', 'Tester', 'Calc Tester', $1, $1, 'pwd', 'active', false) RETURNING id",
            self.email
        )
        self.user_id = user_row["id"]
        integration_id = await self.pool.fetchval("SELECT id FROM trading_catalog.broker_integrations LIMIT 1")
        conn_row = await self.pool.fetchrow(
            "INSERT INTO broker_connections.user_broker_connections (user_id, integration_id, external_account_id, account_name, status, metadata, connected_at) VALUES ($1, $2, $3, 'Account', 'connected', '{}'::jsonb, NOW()) RETURNING id",
            self.user_id, integration_id, f"acct_{self.ts}"
        )
        self.connection_id = str(conn_row["id"])
        self.now_str = "2026-09-21T10:00:00Z"

    async def asyncTearDown(self):
        await self.pool.execute("DELETE FROM trading.trades WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM broker_connections.user_broker_connections WHERE user_id = $1", self.user_id)
        await self.pool.execute("DELETE FROM app_auth.users WHERE id = $1", self.user_id)
        await close_db()

    async def test_stock_long_calculation(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "AAPL", "product_type": "stock", "side": "long", "quantity": 100, "entry_price": 220.0, "exit_price": 225.0, "total_charges": 5.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 500.0)
        self.assertEqual(float(row["net_pnl"]), 495.0)
        self.assertEqual(float(row["percent_change"]), 2.27)

    async def test_stock_short_calculation(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "NVDA", "product_type": "stock", "side": "short", "quantity": 200, "entry_price": 128.50, "exit_price": 122.20, "total_charges": 6.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 1260.0)
        self.assertEqual(float(row["net_pnl"]), 1254.0)

    async def test_fee_reversal_impact(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "COIN", "product_type": "stock", "side": "long", "quantity": 2, "entry_price": 100.0, "exit_price": 101.0, "total_charges": 5.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 2.0)
        self.assertEqual(float(row["net_pnl"]), -3.0)

    async def test_option_us_equity_with_multiplier(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "QQQ260925C00485000", "product_type": "option", "side": "long", "quantity": 5, "multiplier": 100, "entry_price": 3.40, "exit_price": 5.90, "total_charges": 6.50, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 1250.0)
        self.assertEqual(float(row["net_pnl"]), 1243.50)

    async def test_option_dynamic_lot_size(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "NIFTY25000CE", "product_type": "option", "side": "long", "quantity": 2, "multiplier": 25, "entry_price": 120.0, "exit_price": 150.0, "total_charges": 50.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 1500.0)
        self.assertEqual(float(row["net_pnl"]), 1450.0)

    async def test_forex_non_jpy_eurusd(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "EURUSD", "product_type": "forex", "side": "long", "quantity": 1, "entry_price": 1.0850, "exit_price": 1.0920, "total_charges": 7.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 700.0)
        self.assertEqual(float(row["net_pnl"]), 693.0)
        self.assertFalse(is_forex_jpy_pair("EURUSD"))
        self.assertEqual(get_forex_pip_size("EURUSD"), 0.0001)
        self.assertEqual(calculate_forex_pips(1.0850, 1.0920, "EURUSD", "long"), 70.0)

    async def test_forex_jpy_pair_usdjpy(self):
        self.assertTrue(is_forex_jpy_pair("USDJPY"))
        self.assertTrue(is_forex_jpy_pair("EUR/JPY"))
        self.assertEqual(get_forex_pip_size("USDJPY"), 0.01)
        self.assertEqual(calculate_forex_pips(155.20, 155.85, "USDJPY", "long"), 65.0)

    async def test_cme_futures_es(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "ESZ4", "product_type": "future", "side": "long", "quantity": 1, "entry_price": 5700.0, "exit_price": 5710.0, "total_charges": 4.50, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 500.0)
        self.assertEqual(float(row["net_pnl"]), 495.50)

    async def test_cme_futures_mnq(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "MNQZ4", "product_type": "future", "side": "long", "quantity": 2, "entry_price": 20000.0, "exit_price": 20050.0, "total_charges": 2.50, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 200.0)
        self.assertEqual(float(row["net_pnl"]), 197.50)

    async def test_cme_futures_cl(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "CLX4", "product_type": "future", "side": "short", "quantity": 1, "entry_price": 72.50, "exit_price": 71.00, "total_charges": 5.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 1500.0)
        self.assertEqual(float(row["net_pnl"]), 1495.0)

    async def test_cfd_gold_xauusd(self):
        trade = {"user_id": self.user_id, "broker_connection_id": self.connection_id, "symbol": "XAUUSD", "product_type": "cfd", "side": "long", "quantity": 1, "entry_price": 2600.0, "exit_price": 2610.0, "total_charges": 8.0, "entry_timestamp": self.now_str, "exit_timestamp": self.now_str}
        row = await insert_trade(self.pool, trade)
        self.assertEqual(float(row["gross_pnl"]), 1000.0)
        self.assertEqual(float(row["net_pnl"]), 992.0)

    def test_stats_scratch_trade_impact(self):
        trades = [{"pnl": 100.0, "date": "2026-09-20"}, {"pnl": -50.0, "date": "2026-09-20"}, {"pnl": 0.0, "date": "2026-09-21"}]
        stats = compute_stats(trades)
        self.assertEqual(stats["totalTrades"], 3)
        self.assertEqual(stats["winningTrades"], 1)
        self.assertEqual(stats["losingTrades"], 1)
        self.assertEqual(stats["winRate"], 33.33)
        self.assertEqual(stats["totalPnL"], 50.0)

    def test_stats_zero_loss_profit_factor(self):
        trades = [{"pnl": 250.0, "date": "2026-09-20"}, {"pnl": 150.0, "date": "2026-09-20"}]
        stats = compute_stats(trades)
        self.assertEqual(stats["grossProfit"], 400.0)
        self.assertEqual(stats["grossLoss"], 0.0)
        self.assertEqual(stats["profitFactor"], 400.0)
        self.assertEqual(stats["winRate"], 100.0)

    def test_stats_expectancy_and_drawdown(self):
        trades = [{"pnl": 200.0}, {"pnl": 100.0}, {"pnl": -150.0}, {"pnl": -50.0}]
        stats = compute_stats(trades)
        self.assertEqual(stats["totalTrades"], 4)
        self.assertEqual(stats["winningTrades"], 2)
        self.assertEqual(stats["losingTrades"], 2)
        self.assertEqual(stats["avgWin"], 150.0)
        self.assertEqual(stats["avgLoss"], 100.0)
        self.assertEqual(stats["winLossRatio"], 1.5)
        self.assertEqual(stats["expectancy"], 25.0)
        self.assertEqual(stats["maxDrawdown"], 200.0)

    def test_stats_empty_trades(self):
        stats = compute_stats([])
        self.assertEqual(stats["totalTrades"], 0)
        self.assertEqual(stats["winRate"], 0.0)
        self.assertEqual(stats["totalPnL"], 0.0)
        self.assertEqual(stats["profitFactor"], 0.0)
        self.assertEqual(stats["expectancy"], 0.0)
        self.assertEqual(stats["maxDrawdown"], 0.0)

    def test_radar_calculations(self):
        trades = [{"pnl": 100.0}, {"pnl": 200.0}, {"pnl": -150.0}, {"pnl": 50.0}]
        radar = compute_radar(trades)
        self.assertEqual(radar["win"], 75)
        self.assertTrue(0 <= radar["overallScore"] <= 100)
        self.assertTrue(0 <= radar["profit"] <= 100)
        self.assertTrue(0 <= radar["drawdown"] <= 100)

    def test_performance_cumulative_curve(self):
        day_map = {"2026-09-19": 100.0, "2026-09-20": -30.0, "2026-09-21": 50.0}
        perf, act = build_performance_and_activity(day_map)
        self.assertEqual(len(perf), 3)
        self.assertEqual(perf[0]["cumulativePnL"], 100.0)
        self.assertEqual(perf[1]["cumulativePnL"], 70.0)
        self.assertEqual(perf[2]["cumulativePnL"], 120.0)

    def test_calendar_grouping(self):
        cal_rows = [
            {"trade_date": "2026-09-20", "pnl": 150.0, "has_badge": True, "is_breakeven": False},
            {"trade_date": "2026-09-20", "pnl": -50.0, "has_badge": False, "is_breakeven": False},
            {"trade_date": "2026-09-21", "pnl": 200.0, "has_badge": True, "is_breakeven": True},
        ]
        cal = build_calendar_breakdown(cal_rows)
        self.assertEqual(len(cal), 2)
        d1 = next(item for item in cal if item["dateKey"] == "2026-09-20")
        self.assertEqual(d1["pnl"], 100.0)
        self.assertEqual(d1["trades"], 2)
        self.assertEqual(d1["wins"], 1)
        self.assertEqual(d1["winRate"], 50.0)
        self.assertTrue(d1["hasBadge"])

    def test_currency_usc_cents_conversion(self):
        usd_val = convert_trade_pnl(15000.0, "USC", "USD", 1.0)
        self.assertEqual(usd_val, 150.0)

    def test_currency_fx_rate_conversion(self):
        converted = convert_trade_pnl(100.0, "EUR", "USD", 1.085)
        self.assertEqual(converted, 108.5)

    def test_formulas_risk_and_rmultiple(self):
        cost = calculate_adjusted_cost(2, 50.0, 100.0)
        self.assertEqual(cost, 10000.0)
        proceeds = calculate_adjusted_proceeds(2, 60.0, 100.0)
        self.assertEqual(proceeds, 12000.0)
        roi = calculate_net_roi(1900.0, cost)
        self.assertEqual(roi, 19.0)
        risk = calculate_trade_risk(50.0, 45.0, 2, 100.0)
        self.assertEqual(risk, 1000.0)
        target = calculate_initial_target(50.0, 65.0, 2, 100.0)
        self.assertEqual(target, 3000.0)
        planned_r = calculate_planned_r_multiple(risk, target)
        self.assertEqual(planned_r, 3.0)
        realized_r = calculate_realized_r_multiple(1900.0, risk)
        self.assertEqual(realized_r, 1.9)
        be = calculate_breakeven_price(50.0, 20.0, 2, "long", 100.0)
        self.assertEqual(be, 50.1)

    def test_mcx_gold_mini_20_trades_benchmark(self):
        raw_csv = (
            "T001,2026-09-01,GOLDM05OCT26FUT,SHORT,3,112660,112835,-5250,628.5,-5878.5,-5878.5\n"
            "T002,2026-09-01,GOLDM05OCT26FUT,LONG,1,112907,112784,-1230,241.15,-1471.15,-7349.65\n"
            "T003,2026-09-02,GOLDM05OCT26FUT,LONG,3,112918,113021,3090,629.98,2460.02,-4889.63\n"
            "T004,2026-09-02,GOLDM05OCT26FUT,SHORT,2,112622,112445,3540,434.28,3105.72,-1783.9\n"
            "T005,2026-09-03,GOLDM05OCT26FUT,LONG,2,112401,112609,4160,434.2,3725.8,1941.89\n"
            "T006,2026-09-03,GOLDM05OCT26FUT,LONG,1,112220,112483,2630,240.46,2389.54,4331.43\n"
            "T007,2026-09-04,GOLDM05OCT26FUT,SHORT,1,111992,111723,2690,239.61,2450.39,6781.82\n"
            "T008,2026-09-07,GOLDM05OCT26FUT,LONG,1,111723,111638,-850,239.17,-1089.17,5692.65\n"
            "T009,2026-09-08,GOLDM05OCT26FUT,LONG,3,111501,111432,-2070,622.02,-2692.02,3000.64\n"
            "T010,2026-09-09,GOLDM05OCT26FUT,LONG,1,111742,111697,-450,239.25,-689.25,2311.39\n"
            "T011,2026-09-09,GOLDM05OCT26FUT,LONG,1,111530,111594,640,239.02,400.98,2712.36\n"
            "T012,2026-09-10,GOLDM05OCT26FUT,SHORT,1,111240,111056,1840,238.36,1601.64,4314.0\n"
            "T013,2026-09-11,GOLDM05OCT26FUT,SHORT,2,111359,111522,-3260,430.25,-3690.25,623.76\n"
            "T014,2026-09-11,GOLDM05OCT26FUT,LONG,3,111189,110993,-5880,619.93,-6499.93,-5876.17\n"
            "T015,2026-09-14,GOLDM05OCT26FUT,LONG,3,111514,111772,7740,623.32,7116.68,1240.51\n"
            "T016,2026-09-15,GOLDM05OCT26FUT,SHORT,1,111213,111023,1900,238.31,1661.69,2902.2\n"
            "T017,2026-09-15,GOLDM05OCT26FUT,SHORT,2,111522,111373,2980,430.52,2549.48,5451.68\n"
            "T018,2026-09-16,GOLDM05OCT26FUT,SHORT,2,111857,111968,-2220,431.91,-2651.91,2799.77\n"
            "T019,2026-09-17,GOLDM05OCT26FUT,LONG,1,111756,111846,900,239.44,660.56,3460.32\n"
            "T020,2026-09-18,GOLDM05OCT26FUT,SHORT,2,111955,111825,2600,432.03,2167.97,5628.3"
        )
        trades = []
        running_cum = 0.0
        for row in raw_csv.strip().split("\n"):
            tid, dt, sym, side, lots, ent_p, ext_p, exp_gross, charges, exp_net, exp_cum = row.split(",")
            lots, ent_p, ext_p = float(lots), float(ent_p), float(ext_p)
            exp_gross, charges, exp_net, exp_cum = float(exp_gross), float(charges), float(exp_net), float(exp_cum)
            gross = calculate_gross_pnl(ent_p, ext_p, lots, side.lower(), multiplier=10.0)
            net = calculate_net_pnl(gross, charges)
            self.assertEqual(gross, exp_gross)
            self.assertAlmostEqual(net, exp_net, delta=0.02)
            running_cum = round(running_cum + net, 2)
            self.assertAlmostEqual(running_cum, exp_cum, delta=0.02)
            trades.append({"pnl": net, "date": dt})
        stats = compute_stats(trades)
        self.assertEqual(stats["totalTrades"], 20)
        self.assertEqual(stats["winningTrades"], 12)
        self.assertEqual(stats["losingTrades"], 8)
        self.assertEqual(stats["winRate"], 60.0)
        self.assertAlmostEqual(stats["totalPnL"], 5628.29, delta=0.02)
        self.assertEqual(stats["profitFactor"], 1.23)
        self.assertEqual(stats["maxDrawdown"], 12658.0)

    def test_options_expired_pnl(self):
        gross, net, pct = calculate_trade_pnl(
            entry_p=5.0, exit_p=None, qty=2.0, mult=100.0, side="long",
            charges=10.0, category="option", status="expired"
        )
        self.assertEqual(gross, -1000.0)
        self.assertEqual(net, -1010.0)
        self.assertEqual(pct, -100.0)

    def test_partial_close_qty_pnl(self):
        gross, net, pct = calculate_trade_pnl(
            entry_p=100.0, exit_p=110.0, qty=2.0, mult=1.0, side="long",
            charges=5.0, category="equity"
        )
        self.assertEqual(gross, 20.0)
        self.assertEqual(net, 15.0)
        self.assertEqual(pct, 10.0)

    async def test_fx_rate_unavailable_app_error(self):
        with self.assertRaises(AppError) as ctx:
            await get_fx_rate(self.pool, "XYZNONEXISTENT", "USD")
        self.assertEqual(ctx.exception.code, "FX_RATE_UNAVAILABLE")
        self.assertEqual(ctx.exception.status_code, 400)

if __name__ == "__main__":
    unittest.main()
