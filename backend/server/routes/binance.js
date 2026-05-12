const express = require("express");
const router = express.Router();

const FUTURES_BASE_URL = "https://fapi.binance.com";
const VALID_INTERVALS = new Set([
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w", "1M",
]);

const clampLimit = (value) => {
  const limit = Number.parseInt(value, 10);

  if (Number.isNaN(limit)) return 1000;
  return Math.min(Math.max(limit, 1), 1000);
};

// ======================
// KLINES ROUTE
// ======================
router.get("/klines", async (req, res) => {
  try {
    const { symbol, interval, startTime, endTime, limit } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({
        error: "Missing parameters",
        required: ["symbol", "interval"],
      });
    }

    if (!VALID_INTERVALS.has(interval)) {
      return res.status(400).json({
        error: "Invalid interval",
        interval,
      });
    }

    const params = new URLSearchParams({
      symbol: String(symbol).toUpperCase(),
      interval,
      limit: String(clampLimit(limit)),
    });

    if (startTime) {
      params.set("startTime", String(startTime));
    }

    if (endTime) {
      params.set("endTime", String(endTime));
    }

    const url = `${FUTURES_BASE_URL}/fapi/v1/klines?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();

      try {
        return res.status(response.status).json(JSON.parse(text));
      } catch {
        return res.status(response.status).json({
          error: "Binance API error",
          status: response.status,
          details: text.substring(0, 200),
        });
      }
    }

    const data = await response.json();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// SYMBOLS ROUTE
// ======================
router.get("/symbols", async (req, res) => {
  try {
    const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/exchangeInfo`);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const symbols = data.symbols
      .filter((s) => s.status === "TRADING")
      .map((s) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        contractType: s.contractType,
      }));

    res.json({
      success: true,
      count: symbols.length,
      symbols,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// VALIDATE SYMBOL
// ======================
router.get("/validate/:symbol", async (req, res) => {
  try {
    const symbolUpper = req.params.symbol.toUpperCase();

    const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/exchangeInfo`);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const symbolInfo = data.symbols.find(
      (s) => s.symbol === symbolUpper
    );

    res.json({
      success: true,
      symbol: symbolUpper,
      isValid: !!symbolInfo,
      info: symbolInfo || null,
      message: symbolInfo
        ? "Valid futures symbol"
        : "Invalid symbol for USD-M Futures. Try BTCUSDT, ETHUSDT, etc.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
