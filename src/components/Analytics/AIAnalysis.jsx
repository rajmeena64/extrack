import React, { useMemo, useState } from "react";
import { Calendar, ChartBar } from "../../icons/lucideIcons";
import api from "../../utils/serve";
import CustomSelect from "../Common/CustomSelect";
import { formatCurrency } from "../../utils/Currency";
import { getTradeDisplayTime, toTradeDateKey } from "../../utils/tradeTime";

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const getTodayKey = () => toDateKey(new Date());

const buildLocalStats = (trades) => {
  const stats = trades.reduce(
    (acc, trade) => {
      const pnl = Number(trade?.pnl) || 0;
      acc.pnl += pnl;
      if (pnl > 0) acc.wins += 1;
      if (pnl < 0) acc.losses += 1;
      if (!acc.best || pnl > Number(acc.best.pnl || 0)) acc.best = trade;
      if (!acc.worst || pnl < Number(acc.worst.pnl || 0)) acc.worst = trade;
      return acc;
    },
    { pnl: 0, wins: 0, losses: 0, best: null, worst: null }
  );

  stats.total = trades.length;
  stats.winRate = stats.total ? (stats.wins / stats.total) * 100 : 0;
  return stats;
};

function AIAnalysis({ trades = [], currencyCode = "USD" }) {
  const [analysisScope, setAnalysisScope] = useState("day");
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [marketContext, setMarketContext] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [grounding, setGrounding] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const dayTrades = useMemo(
    () =>
      (Array.isArray(trades) ? trades : [])
        .filter((trade) => toTradeDateKey(trade) === selectedDate)
        .sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
    [selectedDate, trades]
  );

  const dashboardTrades = useMemo(
    () => (Array.isArray(trades) ? trades : []).sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
    [trades]
  );
  const activeTrades = analysisScope === "dashboard" ? dashboardTrades : dayTrades;
  const activeStats = useMemo(() => buildLocalStats(activeTrades), [activeTrades]);

  const handleGenerate = async () => {
    setError("");
    setAnalysis("");
    setGrounding(null);

    if (activeTrades.length === 0) {
      setError(
        analysisScope === "dashboard"
          ? "No trades found in the dashboard yet."
          : "No trades found for this date. Change the date or add/import trades."
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post("/ai-trade-analysis", {
        date: selectedDate,
        trades: activeTrades,
        currencyCode,
        marketContext,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        analysisMode: analysisScope === "dashboard" ? "dashboard" : "date",
      });

      if (!data?.success) {
        throw new Error(data?.error || "AI analysis could not be generated.");
      }

      setAnalysis(data.analysis);
      setGrounding(data.grounding || null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.message ||
          "AI analysis could not be generated."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="ai-analysis">
      <div className="ai-analysis-toolbar">
        <div className="ai-analysis-field">
          <label htmlFor="ai-analysis-scope">
            <ChartBar size={14} />
            Scope
          </label>
          <CustomSelect
            id="ai-analysis-scope"
            value={analysisScope}
            onChange={(event) => setAnalysisScope(event.target.value)}
            options={[
              { value: 'day', label: 'Selected day' },
              { value: 'dashboard', label: 'Full dashboard' },
            ]}
          />
        </div>

        <div className="ai-analysis-field">
          <label htmlFor="ai-analysis-date">
            <Calendar size={14} />
            Trading day
          </label>
          <input
            id="ai-analysis-date"
            type="date"
            value={selectedDate}
            disabled={analysisScope === "dashboard"}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>

        <button
          className="ai-analysis-generate"
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || activeTrades.length === 0}
        >
          <ChartBar size={15} />
          {isLoading ? "Analyzing..." : analysisScope === "dashboard" ? "Analyze Dashboard" : "Analyze Day"}
        </button>
      </div>

      <div className="ai-analysis-summary">
        <article>
          <span>Net P&L</span>
          <strong className={activeStats.pnl >= 0 ? "ai-profit" : "ai-loss"}>
            {formatCurrency(activeStats.pnl, currencyCode)}
          </strong>
        </article>
        <article>
          <span>Trades</span>
          <strong>{activeStats.total}</strong>
        </article>
        <article>
          <span>Win rate</span>
          <strong>{activeStats.winRate.toFixed(1)}%</strong>
        </article>
        <article>
          <span>Wins / Losses</span>
          <strong>
            {activeStats.wins} / {activeStats.losses}
          </strong>
        </article>
      </div>

      <label className="ai-analysis-notes" htmlFor="ai-market-context">
        <span>Extra context</span>
        <textarea
          id="ai-market-context"
          value={marketContext}
          onChange={(event) => setMarketContext(event.target.value)}
          placeholder="Optional: add rules, account risk, strategy names, or any specific market context. AI will focus on mistakes and improvement, not obvious trade fields."
        />
      </label>

      {error && <div className="ai-analysis-error">{error}</div>}

      <div className="ai-analysis-output">
        {analysis ? (
          <>
            <pre>{analysis}</pre>
            {grounding?.sources?.length > 0 && (
              <div className="ai-analysis-sources">
                <strong>Sources checked</strong>
                {grounding.sources.slice(0, 8).map((source) => (
                  <a key={source.uri} href={source.uri} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="ai-analysis-empty">
            <strong>AI performance review ready when you are.</strong>
            <span>
              Analyze one day or the full dashboard. AI will review the trade JSON, metrics,
              mistake patterns, news exposure, and what needs to improve.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

export default AIAnalysis;
