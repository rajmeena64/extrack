const express = require("express");
const zlib = require("zlib");
const router = express.Router();
const { fetchCtraderKlines } = require("./ctrader");
const { normalizeStoredSymbol } = require("../utils/symbols");

const FUTURES_BASE_URL = "https://fapi.binance.com";
const SPOT_DATA_BASE_URL = "https://data-api.binance.vision";
const VISION_BASE_URL = "https://data.binance.vision/data";
const FOREX_SYMBOL_RE = /^[A-Z]{6}$/;
const METAL_SYMBOL_RE = /^X(AU|AG)USD$/;
const FOREX_CURRENCIES = new Set(["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"]);
const BINANCE_QUOTES = ["USDT", "USDC", "BUSD"];
const VALID_INTERVALS = new Set([
  "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w", "1M",
]);
const INTERVAL_MS = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1M": 31 * 24 * 60 * 60 * 1000,
};

const clampLimit = (value) => {
  const limit = Number.parseInt(value, 10);

  if (Number.isNaN(limit)) return 1000;
  return Math.min(Math.max(limit, 1), 1000);
};

const isForexPair = (symbol) => (
  FOREX_SYMBOL_RE.test(symbol) &&
  FOREX_CURRENCIES.has(symbol.slice(0, 3)) &&
  FOREX_CURRENCIES.has(symbol.slice(3, 6))
);

const normalizeKlineSymbol = (symbol) => normalizeStoredSymbol(symbol) || "BTCUSDT";

const toBinanceSymbol = (symbol) => {
  const normalized = normalizeKlineSymbol(symbol);
  const forexCandidate = normalized.slice(0, 6);
  const metalCandidate = normalized.slice(0, 6);

  if (!normalized) return "BTCUSDT";
  if (isForexPair(forexCandidate)) return forexCandidate;
  if (METAL_SYMBOL_RE.test(metalCandidate)) return metalCandidate;
  if (normalized === "GOLD" || normalized === "XAU") return "XAUUSD";
  if (normalized === "SILVER" || normalized === "XAG") return "XAGUSD";
  if (BINANCE_QUOTES.some((quote) => normalized.endsWith(quote))) return normalized;
  if (
    normalized.endsWith("USD") &&
    !METAL_SYMBOL_RE.test(normalized) &&
    !isForexPair(normalized)
  ) {
    return `${normalized.slice(0, -3)}USDT`;
  }

  return normalized;
};

const shouldUseBinance = (symbol) => {
  if (METAL_SYMBOL_RE.test(symbol) || isForexPair(symbol)) {
    return false;
  }

  if (BINANCE_QUOTES.some((quote) => symbol.endsWith(quote))) {
    return true;
  }

  return symbol.endsWith("USD");
};

const formatUtcDate = (timestamp) => {
  return new Date(timestamp).toISOString().slice(0, 10);
};

const responseToBuffer = async (response) => {
  if (typeof response.buffer === "function") return response.buffer();
  return Buffer.from(await response.arrayBuffer());
};

const unzipFirstFile = (zipBuffer) => {
  const centralDirectorySignature = 0x02014b50;
  let centralDirectoryOffset = -1;

  for (let i = zipBuffer.length - 46; i >= 0; i -= 1) {
    if (zipBuffer.readUInt32LE(i) === centralDirectorySignature) {
      centralDirectoryOffset = i;
      break;
    }
  }

  if (centralDirectoryOffset === -1) {
    throw new Error("Invalid Binance Vision zip file");
  }

  const method = zipBuffer.readUInt16LE(centralDirectoryOffset + 10);
  const compressedSize = zipBuffer.readUInt32LE(centralDirectoryOffset + 20);
  const localHeaderOffset = zipBuffer.readUInt32LE(centralDirectoryOffset + 42);

  if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error("Invalid Binance Vision local zip header");
  }

  const fileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
  const extraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = zipBuffer.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return compressed.toString("utf8");
  if (method === 8) return zlib.inflateRawSync(compressed).toString("utf8");

  throw new Error(`Unsupported Binance Vision zip compression method: ${method}`);
};

const csvToKlines = (csvText) => {
  return csvText
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(","))
    .filter((columns) => Number.isFinite(Number(columns[0])))
    .map((columns) => ([
      Number(columns[0]),
      String(columns[1]),
      String(columns[2]),
      String(columns[3]),
      String(columns[4]),
      String(columns[5] || "0"),
      Number(columns[6] || 0),
      String(columns[7] || "0"),
      Number(columns[8] || 0),
      String(columns[9] || "0"),
      String(columns[10] || "0"),
      String(columns[11] || "0"),
    ]));
};

const fetchJsonKlines = async (baseUrl, path, params) => {
  const url = `${baseUrl}${path}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: "Binance API error",
        status: response.status,
        details: text.substring(0, 300),
      };
    }

    const error = new Error(payload?.msg || payload?.error || payload?.details || `Binance API error (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchVisionDailyKlines = async ({ market, symbol, interval, endTime, startTime, limit }) => {
  const intervalMs = INTERVAL_MS[interval] || 60 * 1000;
  const lookbackDays = Math.min(Math.max(Math.ceil((limit * intervalMs) / 86400000) + 4, 7), 45);
  const candles = [];
  const baseTime = Number.isFinite(endTime) ? endTime : Date.now();

  for (let dayOffset = 0; dayOffset < lookbackDays && candles.length < limit * 2; dayOffset += 1) {
    const dayStart = Date.UTC(
      new Date(baseTime).getUTCFullYear(),
      new Date(baseTime).getUTCMonth(),
      new Date(baseTime).getUTCDate() - dayOffset
    );
    const date = formatUtcDate(dayStart);
    const path = market === "futures"
      ? `futures/um/daily/klines/${symbol}/${interval}/${symbol}-${interval}-${date}.zip`
      : `spot/daily/klines/${symbol}/${interval}/${symbol}-${interval}-${date}.zip`;
    const url = `${VISION_BASE_URL}/${path}`;

    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const zipBuffer = await responseToBuffer(response);
      candles.push(...csvToKlines(unzipFirstFile(zipBuffer)));
    } catch {
      // Some symbols/days do not have public files yet; keep walking backward.
    }
  }

  return candles
    .filter((candle) => {
      const openTime = Number(candle[0]);
      if (!Number.isFinite(openTime)) return false;
      if (Number.isFinite(startTime) && openTime < startTime) return false;
      if (Number.isFinite(endTime) && openTime > endTime) return false;
      return true;
    })
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .slice(-limit);
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

    const storedSymbol = normalizeKlineSymbol(symbol);
    const binanceSymbol = toBinanceSymbol(storedSymbol);
    const normalizedLimit = clampLimit(limit);
    const numericStartTime = startTime ? Number(startTime) : undefined;
    const numericEndTime = endTime ? Number(endTime) : undefined;

    const params = new URLSearchParams({
      symbol: binanceSymbol,
      interval,
      limit: String(normalizedLimit),
    });

    if (startTime) {
      params.set("startTime", String(startTime));
    }

    if (endTime) {
      params.set("endTime", String(endTime));
    }

    const errors = [];

    const useBinanceSource = shouldUseBinance(binanceSymbol);

    if (useBinanceSource) {
      try {
        const spotData = await fetchJsonKlines(SPOT_DATA_BASE_URL, "/api/v3/klines", params);
        if (spotData.length) return res.json(spotData);
      } catch (error) {
        errors.push(error);
      }

      try {
        const futuresData = await fetchJsonKlines(FUTURES_BASE_URL, "/fapi/v1/klines", params);
        if (futuresData.length) return res.json(futuresData);
      } catch (error) {
        errors.push(error);
      }

      const visionMarkets = ["futures", "spot"];
      for (const market of visionMarkets) {
        const visionData = await fetchVisionDailyKlines({
          market,
          symbol: binanceSymbol,
          interval,
          startTime: numericStartTime,
          endTime: numericEndTime,
          limit: normalizedLimit,
        });

        if (visionData.length) {
          return res.json(visionData);
        }
      }
    }

    try {
      const ctraderData = await fetchCtraderKlines({
        symbol: storedSymbol,
        interval,
        startTime: numericStartTime,
        endTime: numericEndTime,
        limit: normalizedLimit,
      });

      if (ctraderData.length) {
        return res.json(ctraderData);
      }
    } catch (error) {
      errors.push(error);
    }

    const lastError = errors[errors.length - 1];
    return res.status(lastError?.status || 404).json(lastError?.payload || {
      error: "No kline data found",
      symbol: storedSymbol,
      binanceSymbol,
      interval,
    });
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
