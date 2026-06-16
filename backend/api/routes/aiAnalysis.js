const express = require('express');
const axios = require('axios');
const { authCheck } = require('../../domains/auth/controller');
const { createRateLimiter } = require('../../core/rateLimiter/index');

const router = express.Router();
const aiAnalysisRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_ANALYSIS_RATE_LIMIT_MAX || 10),
  keyGenerator: (req) => req.userId || req.ip,
  message: 'Too many AI analysis requests. Please try again shortly.',
});

const MAX_TRADES = 80;
const MAX_IMAGE_PARTS = 4;

const parseScreenshots = (screenshots) => {
  if (!screenshots) return [];
  if (Array.isArray(screenshots)) return screenshots.filter(Boolean);

  try {
    const parsed = JSON.parse(screenshots);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [screenshots].filter(Boolean);
  }
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const compactTrade = (trade) => ({
  id: trade?.unique_id || trade?.id || trade?.ticket || null,
  symbol: trade?.symbol || 'Unknown',
  side: trade?.trade_type || trade?.side || '-',
  pnl: toNumber(trade?.pnl),
  quantity: trade?.quantity ?? trade?.volume ?? trade?.lots ?? null,
  entry: trade?.price ?? trade?.entry_price ?? null,
  exit: trade?.exit_price ?? null,
  openedAt: trade?.open_timestamp || trade?.timestamp || null,
  closedAt: trade?.close_timestamp || trade?.exit_timestamp || null,
  strategy: trade?.strategy || '',
  notes: trade?.notes || trade?.note || '',
  screenshots: parseScreenshots(trade?.screenshots).slice(0, 2),
});

const buildStats = (trades) => {
  const stats = {
    totalTrades: trades.length,
    totalPnl: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    grossProfit: 0,
    grossLoss: 0,
    bestTrade: null,
    worstTrade: null,
  };

  trades.forEach((trade) => {
    const pnl = toNumber(trade.pnl);
    stats.totalPnl += pnl;

    if (pnl > 0) {
      stats.wins += 1;
      stats.grossProfit += pnl;
    } else if (pnl < 0) {
      stats.losses += 1;
      stats.grossLoss += Math.abs(pnl);
    } else {
      stats.breakeven += 1;
    }

    if (!stats.bestTrade || pnl > toNumber(stats.bestTrade.pnl)) {
      stats.bestTrade = trade;
    }

    if (!stats.worstTrade || pnl < toNumber(stats.worstTrade.pnl)) {
      stats.worstTrade = trade;
    }
  });

  stats.winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
  stats.avgPnl = stats.totalTrades > 0 ? stats.totalPnl / stats.totalTrades : 0;
  stats.profitFactor = stats.grossLoss > 0
    ? stats.grossProfit / stats.grossLoss
    : stats.grossProfit > 0
      ? stats.grossProfit
      : 0;

  return stats;
};

const buildPrompt = ({ date, currencyCode, marketContext, timezone, trades, stats, analysisMode }) => `
You are a market-aware trading performance analyst and chart reviewer.

If search is available, use it to find important market events for the selected date.
Search for economic calendar, central-bank events, inflation/jobs data, PMI, GDP, earnings/mega-cap news, crypto news, commodity news, and major geopolitical headlines that could affect the symbols in the trades.
Prioritize high-impact scheduled events and major unscheduled news. Use reliable sources such as official calendars, investing/economic-calendar pages, exchange/news sources, central-bank pages, and major financial news.

Then relate those events to the trader's actual trades. If chart screenshots are attached, read the visible price action from the image and include it in the analysis.

Return the report in clear, direct English with short markdown headings.
Do not waste space repeating obvious trade fields like entry price, exit price, quantity, or raw P&L unless they explain a mistake or behavioral pattern.
Do not give trade calls or financial advice. Focus on useful coaching: behavior, timing, event risk, discipline, volatility, risk control, process improvement, and what the trader should change.
If you cannot verify an event from search results, say it was not confirmed. Do not invent news.
Be concrete like a trade journal reviewer, not generic.

Date: ${date || 'Selected period'}
Currency: ${currencyCode || 'USD'}
Trader timezone: ${timezone || 'Asia/Calcutta'}
Analysis mode: ${analysisMode || 'date'}

Performance summary:
${JSON.stringify(stats, null, 2)}

Market/event notes from user:
${marketContext || 'No market notes provided.'}

Trades:
${JSON.stringify(trades, null, 2)}

If Analysis mode is "single-trade", use this output:
1. **Useful Read**
   - Explain what actually matters in this trade: timing, context, execution quality, exit quality, risk/reward quality, and whether the profit/loss was meaningful or just noise.
2. **Chart / Price Action**
   - If screenshot exists, read visible price action: structure, trend, range, breakout/pullback, volatility, candle behavior.
   - Do not describe obvious entry/exit numbers.
3. **News/Event Context**
   - Find relevant events for that date and symbol. Relate the trade timing to before/during/after event volatility.
4. **Mistake or Good Behavior**
   - Call out the likely mistake or good decision. Be specific: early exit, late entry, chasing, tiny scalp, poor reward/risk, trading near news, or clean execution.
5. **Actionable Fix**
   - Give 3-5 precise rules the trader should apply next time.

If Analysis mode is "dashboard", "date", or anything else, use this output:
1. **Performance Diagnosis**
   - Interpret win rate, profit factor, average P&L, best/worst trades, and distribution. Explain what these metrics imply.
2. **Mistake Patterns**
   - Identify repeated mistakes across trades: overtrading, low-quality setups, poor exits, losses clustered near news, taking too many tiny wins, holding losers, revenge trading, symbol/session weakness.
3. **Trade Quality Review**
   - Segment by symbol, side, session/time, winners vs losers, and strategy/notes if available.
4. **News/Event Impact**
   - Find important events for the period/date and explain whether trades were exposed to event volatility.
5. **What To Improve**
   - Give a prioritized improvement plan, not generic tips.
6. **Next Dashboard Rules**
   - Give 5 concrete tracking rules the trader should follow in the dashboard.
`;

const getScreenshotParts = async (trades) => {
  const urls = trades
    .flatMap((trade) => trade.screenshots || [])
    .filter((url) => /^https?:\/\//i.test(String(url)))
    .slice(0, MAX_IMAGE_PARTS);

  const parts = [];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024,
      });
      const mimeType = String(response.headers?.['content-type'] || 'image/jpeg').split(';')[0];
      if (!mimeType.startsWith('image/')) continue;

      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: Buffer.from(response.data).toString('base64'),
        },
      });
    } catch {
      // Screenshot analysis is best-effort; text analysis still works.
    }
  }

  return parts;
};

const extractGrounding = (candidate) => {
  const metadata = candidate?.groundingMetadata || {};
  const sources = (metadata.groundingChunks || [])
    .map((chunk) => chunk?.web)
    .filter((web) => web?.uri)
    .map((web) => ({
      title: web.title || web.uri,
      uri: web.uri,
    }));

  return {
    sources,
    searchQueries: metadata.webSearchQueries || [],
    searchEntryPoint: metadata.searchEntryPoint?.renderedContent || '',
  };
};

const getGeminiModels = () => {
  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();
  return [...new Set([configuredModel, 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(Boolean))];
};

const shouldUseSearchFirst = (analysisMode) => {
  return analysisMode === 'single-trade' || analysisMode === 'date';
};

const buildGeminiPayload = ({ prompt, imageParts, useSearch }) => ({
  contents: [
    {
      role: 'user',
      parts: [{ text: prompt }, ...imageParts],
    },
  ],
  ...(useSearch
    ? {
        tools: [
          {
            google_search: {},
          },
        ],
      }
    : {}),
  generationConfig: {
    temperature: 0.25,
    maxOutputTokens: 2600,
  },
});

router.post('/ai-trade-analysis', authCheck, aiAnalysisRateLimiter, async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const models = getGeminiModels();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: 'Gemini API key is not configured on the server.',
    });
  }

  const rawTrades = Array.isArray(req.body?.trades) ? req.body.trades : [];
  const trades = rawTrades.slice(0, MAX_TRADES).map(compactTrade);

  if (trades.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No trades were provided for analysis.',
    });
  }

  const stats = buildStats(trades);
  const prompt = buildPrompt({
    date: req.body?.date,
    currencyCode: req.body?.currencyCode,
    timezone: req.body?.timezone,
    marketContext: String(req.body?.marketContext || '').slice(0, 1500),
    trades,
    stats,
    analysisMode: req.body?.analysisMode,
  });
  const imageParts = await getScreenshotParts(trades);
  const analysisMode = String(req.body?.analysisMode || 'date');
  const searchModes = shouldUseSearchFirst(analysisMode) ? [true, false] : [false, true];

  let lastError = null;

  for (const useSearch of searchModes) {
    for (const model of models) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          buildGeminiPayload({ prompt, imageParts, useSearch }),
          {
            headers: {
              'x-goog-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 45000,
          }
        );

        const candidate = response.data?.candidates?.[0];
        const text = candidate?.content?.parts
          ?.map((part) => part.text || '')
          .join('\n')
          .trim();

        if (!text) {
          lastError = new Error('Gemini returned an empty analysis.');
          continue;
        }

        return res.json({
          success: true,
          analysis: text,
          stats,
          model,
          trade_count: trades.length,
          grounding: useSearch ? extractGrounding(candidate) : { sources: [], searchQueries: [] },
          used_search: useSearch,
        });
      } catch (error) {
        lastError = error;

        const status = Number(error.response?.status || 0);
        const message = String(error.response?.data?.error?.message || error.message || '');
        const canTryNextModel =
          status === 404 ||
          status === 400 ||
          status === 429 ||
          message.toLowerCase().includes('not found') ||
          message.toLowerCase().includes('not supported') ||
          message.toLowerCase().includes('search') ||
          message.toLowerCase().includes('tool') ||
          message.toLowerCase().includes('ground');

        if (!canTryNextModel) {
          break;
        }
      }
    }
  }

  const message = lastError?.response?.data?.error?.message || lastError?.message || 'AI analysis failed.';
  return res.status(502).json({
    success: false,
    error: message,
  });
});

module.exports = router;
