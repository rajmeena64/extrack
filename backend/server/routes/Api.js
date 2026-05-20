const express = require("express");
const axios = require("axios");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const marketDataRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.MARKET_DATA_RATE_LIMIT_MAX || 120),
  keyGenerator: (req) => req.ip,
  message: "Too many market data requests. Please try again shortly.",
});

// GET /api/forex-ohlc?symbol=EURUSD&period=5m
router.get("/forex-ohlc", marketDataRateLimiter, async (req, res) => {
  try {
    let { symbol = "EURUSD", period = "5m", from, to, limit = 300 } = req.query;

    const API_KEY = process.env.FCS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "FCS API key missing in .env",
      });
    }

    // FCS Forex API expects symbols without a slash.
    // Example: EUR/USD becomes EURUSD.
    const formattedSymbol = symbol.replace("/", "");

    // Allowed timeframes.
    const allowedPeriods = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];
    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period (use: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)",
      });
    }

    // Use /forex/history with the normalized symbol value.
    const url = "https://api-v4.fcsapi.com/forex/history";

    const params = {
      access_key: API_KEY,
      symbol: formattedSymbol,
      period,
      length: limit,
    };

    if (from) params.from = from;
    if (to) params.to = to;

    const response = await axios.get(url, { params });
    const data = response.data;

    if (!data || data.status === false) {
      return res.status(400).json({
        success: false,
        message: data?.msg || "FCS API error",
        code: data?.code,
      });
    }

    if (!data.response || Object.keys(data.response).length === 0) {
      return res.status(404).json({
        success: false,
        message: "No OHLC data found for this symbol",
      });
    }

    // Normalize candles into a consistent shape.
    const candles = Object.keys(data.response)
      .map((timestamp) => {
        const candle = data.response[timestamp];
        return {
          time: parseInt(timestamp, 10),
          datetime: candle.tm || new Date(parseInt(timestamp, 10) * 1000).toISOString(),
          open: parseFloat(candle.o),
          high: parseFloat(candle.h),
          low: parseFloat(candle.l),
          close: parseFloat(candle.c),
          volume: candle.v ? parseFloat(candle.v) : 0,
        };
      })
      .sort((a, b) => a.time - b.time);

    res.json({
      success: true,
      symbol,
      period,
      count: candles.length,
      data: candles,
    });
  } catch (error) {
    const errorMessage =
      error.response?.data?.msg ||
      error.response?.data?.message ||
      error.message;

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch OHLC data",
      error: errorMessage,
    });
  }
});

module.exports = router;
