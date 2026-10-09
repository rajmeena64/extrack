import csv
import sys
import unittest
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from core.calculations.stats import compute_stats, compute_radar

CSV_PATH = r"C:\Users\raj19\Downloads\01_01_2007-27_09_2026.csv"

class TestRealCsvBenchmark(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            raw_rows = list(csv.DictReader(f))
        cls.trades = []
        for r in raw_rows:
            net = float(r["profit"])
            comm = abs(float(r["commission"])) if r["commission"] else 0.0
            sw = abs(float(r["swap"])) if r["swap"] else 0.0
            charges = comm + sw
            gross = round(net + charges, 2)
            cls.trades.append({
                "ticket": r["ticket"],
                "symbol": r["symbol"],
                "side": r["type"],
                "lots": float(r["lots"]),
                "entry_price": float(r["opening_price"]),
                "exit_price": float(r["closing_price"]),
                "pnl": net,
                "gross_pnl": gross,
                "total_charges": charges,
                "date": r["closing_time_utc"].split("T")[0],
                "datetime": datetime.fromisoformat(r["closing_time_utc"])
            })

    def test_csv_total_counts_and_win_rate(self):
        stats = compute_stats(self.trades)
        self.assertEqual(stats["totalTrades"], 364)
        self.assertEqual(stats["winningTrades"], 174)
        self.assertEqual(stats["losingTrades"], 190)
        self.assertEqual(stats["winRate"], 47.8)

    def test_csv_financial_totals(self):
        stats = compute_stats(self.trades)
        self.assertEqual(stats["totalPnL"], 437.62)
        self.assertEqual(stats["grossProfit"], 8421.36)
        self.assertEqual(stats["grossLoss"], 7983.74)
        self.assertEqual(stats["profitFactor"], 1.05)

    def test_csv_trade_averages_and_ratios(self):
        stats = compute_stats(self.trades)
        self.assertEqual(stats["avgWin"], 48.4)
        self.assertEqual(stats["avgLoss"], 42.02)
        self.assertEqual(stats["winLossRatio"], 1.15)
        self.assertEqual(stats["expectancy"], 1.2)

    def test_csv_calendar_and_daily_performance(self):
        stats = compute_stats(self.trades)
        self.assertEqual(stats["totalTradingDays"], 127)
        self.assertEqual(stats["winningDays"], 62)
        self.assertEqual(stats["losingDays"], 65)
        self.assertEqual(stats["dayWinRate"], 48.82)

    def test_csv_max_drawdown_chronological(self):
        stats = compute_stats(self.trades)
        self.assertEqual(stats["maxDrawdown"], 1358.6)

    def test_csv_radar_scores(self):
        radar = compute_radar(self.trades)
        self.assertEqual(radar["win"], 48)
        self.assertEqual(radar["profit"], 35)
        self.assertEqual(radar["avg"], 58)
        self.assertEqual(radar["recovery"], 11)
        self.assertEqual(radar["drawdown"], 23)
        self.assertEqual(radar["consistency"], 49)
        self.assertEqual(radar["overallScore"], 37)

if __name__ == "__main__":
    unittest.main()
