/**
 * Tinybird Definitions - Candlestick (OHLCV) Market Data
 */

import {
  defineDatasource,
  defineEndpoint,
  Tinybird,
  node,
  t,
  p,
  engine,
  type InferRow,
  type InferParams,
  type InferOutputRow,
} from "@tinybirdco/sdk";

// ============================================================================
// Datasources
// ============================================================================

/**
 * Candlestick (OHLCV) market data
 */
export const candles = defineDatasource("candles", {
  description: "Financial market candlestick (OHLCV) data",
  schema: {
    symbol: t.string().lowCardinality(),
    timestamp: t.int64(),
    open: t.float64(),
    high: t.float64(),
    low: t.float64(),
    close: t.float64(),
    volume: t.float64(),
  },
  engine: engine.mergeTree({
    sortingKey: ["symbol", "timestamp"],
  }),
});

export type CandleRow = InferRow<typeof candles>;

// ============================================================================
// Endpoints
// ============================================================================

/**
 * Get candles for a symbol within a date/time range
 */
export const getCandles = defineEndpoint("get_candles", {
  description: "Fetch candlestick data for a symbol within a timestamp range",
  params: {
    symbol: p.string(),
    date_from: p.int64().optional(),
    date_to: p.int64().optional(),
    limit: p.int32().optional(1000),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          symbol,
          timestamp,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = {{String(symbol, required=True)}}
          {% if defined(date_from) %}
            AND timestamp >= {{Int64(date_from)}}
          {% end %}
          {% if defined(date_to) %}
            AND timestamp <= {{Int64(date_to)}}
          {% end %}
        ORDER BY timestamp ASC
        LIMIT {{Int32(limit, 1000)}}
      `,
    }),
  ],
  output: {
    symbol: t.string(),
    timestamp: t.int64(),
    open: t.float64(),
    high: t.float64(),
    low: t.float64(),
    close: t.float64(),
    volume: t.float64(),
  },
});

export type GetCandlesParams = InferParams<typeof getCandles>;
export type GetCandlesOutput = InferOutputRow<typeof getCandles>;

/**
 * Get latest candle for a symbol
 */
export const latestCandle = defineEndpoint("latest_candle", {
  description: "Fetch the most recent candlestick for a symbol",
  params: {
    symbol: p.string(),
  },
  nodes: [
    node({
      name: "endpoint",
      sql: `
        SELECT
          symbol,
          timestamp,
          open,
          high,
          low,
          close,
          volume
        FROM candles
        WHERE symbol = {{String(symbol, required=True)}}
        ORDER BY timestamp DESC
        LIMIT 1
      `,
    }),
  ],
  output: {
    symbol: t.string(),
    timestamp: t.int64(),
    open: t.float64(),
    high: t.float64(),
    low: t.float64(),
    close: t.float64(),
    volume: t.float64(),
  },
});

export type LatestCandleParams = InferParams<typeof latestCandle>;
export type LatestCandleOutput = InferOutputRow<typeof latestCandle>;

// ============================================================================
// Client
// ============================================================================

export const tinybird = new Tinybird({
  datasources: { candles },
  pipes: { getCandles, latestCandle },
});
