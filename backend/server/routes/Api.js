const express = require("express");
const axios = require("axios");

const router = express.Router();

// GET /api/forex-ohlc?symbol=EURUSD&period=5m
router.get("/forex-ohlc", async (req, res) => {
  try {
    let { symbol = "EURUSD", period = "5m", from, to, limit = 300 } = req.query;

    const API_KEY = process.env.FCS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "FCS API key missing in .env",
      });
    }

    // ✅ IMPORTANT: FCS Forex API expects symbols WITHOUT slash
    // EUR/USD → EURUSD (remove slash if present)
    let formattedSymbol = symbol.replace("/", "");
    
    console.log("Original symbol:", symbol);
    console.log("Formatted symbol:", formattedSymbol);

    // ✅ ALLOWED TIMEFRAMES
    const allowedPeriods = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];
    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period (use: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)",
      });
    }

    // ✅ CORRECT: Use /forex/history with symbol without slash
    const url = `https://api-v4.fcsapi.com/forex/history`;
    
    const params = {
      access_key: API_KEY,
      symbol: formattedSymbol, // EURUSD, GBPUSD, etc.
      period: period,
      length: limit
    };
    
    // Optional date range
    if (from) params.from = from;
    if (to) params.to = to;

    console.log("Request URL:", url);
    console.log("Params:", params);

    const response = await axios.get(url, { params });
    const data = response.data;

    // ✅ Error handling
    if (!data || data.status === false) {
      console.error("FCS API Error:", data);
      return res.status(400).json({
        success: false,
        message: data?.msg || "FCS API error",
        code: data?.code,
        debug: data?.info?.debug
      });
    }

    // Check if we have data
    if (!data.response || Object.keys(data.response).length === 0) {
      return res.status(404).json({
        success: false,
        message: "No OHLC data found for this symbol",
      });
    }

    // ✅ Normalize candles
    const candles = Object.keys(data.response).map(timestamp => {
      const candle = data.response[timestamp];
      return {
        time: parseInt(timestamp),
        datetime: candle.tm || new Date(parseInt(timestamp) * 1000).toISOString(),
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
        volume: candle.v ? parseFloat(candle.v) : 0
      };
    }).sort((a, b) => a.time - b.time);

    res.json({
      success: true,
      symbol: symbol,
      period: period,
      count: candles.length,
      data: candles,
    });

  } catch (error) {
    console.error("❌ FCS ERROR FULL:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    
    const errorMessage = error.response?.data?.msg || 
                        error.response?.data?.message || 
                        error.message;
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Failed to fetch OHLC data",
      error: errorMessage,
      details: error.response?.data
    });
  }
});

module.exports = router;  