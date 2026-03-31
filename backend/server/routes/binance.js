const express = require("express");
const router = express.Router();

const FUTURES_BASE_URL = "https://fapi.binance.com";

// ======================
// KLINES ROUTE
// ======================
router.get("/klines", async (req, res) => {
  try {
    const { symbol, interval, endTime } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({
        error: "Missing parameters",
        required: ["symbol", "interval"],
      });
    }

    let url = `${FUTURES_BASE_URL}/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1000`;

    if (endTime) {
      url += `&endTime=${endTime}`;
    }

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