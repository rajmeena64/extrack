import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Chart } from "@/features/markets";
import PerformanceChart from "@/features/analytics/components/Widgets/PerformanceChart";
import SymbolWithIcon from "@/components/Common/SymbolWithIcon/SymbolWithIcon";
import MainContentWrapper from "@/components/Layout/MainContentWrapper";
import PageHeader from "@/components/Layout/PageHeader";
import { Card, RichTextNotes, ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { getDurationTimeframe } from "@/features/markets/components/TradingChart/utils/chartHelpers";
import { formatDisplayDate } from "@/utils/trading/tradeTime";
import tradeApi from "@/utils/api/tradeApi";

import TradeBasicsCard from "./components/TradeBasics/TradeBasicsCard";
import TradeStrategySection from "./components/TradeStrategy/TradeStrategySection";
import TradeAttachmentsSection from "./components/TradeAttachments/TradeAttachmentsSection";
import TradeReviewPanel from "./components/TradeReviewPanel/TradeReviewPanel";
import TradeAiReviewCard from "./components/TradeAiReview/TradeAiReviewCard";

const toSeconds = (val) => {
  if (!val) return null;
  const num = Number(val);
  if (Number.isFinite(num) && num > 0) return num > 1e11 ? Math.floor(num / 1000) : Math.floor(num);
  const ms = new Date(val).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};

const buildRunningPnl = (candles = [], t, through = null) => {
  const enT = toSeconds(t?.entryAt);
  const exT = toSeconds(t?.exitAt);
  const enP = Number(t?.entryPrice);
  const exP = Number(t?.exitPrice);
  const pnl = Number(t?.pnl) || 0;
  const dir = t?.side === "short" ? -1 : 1;
  if (!Number.isFinite(enT) || !Number.isFinite(enP)) return [];
  const list = Array.isArray(candles) ? candles : [];
  const latestTime = list.length ? list[list.length - 1].time : enT;
  const targetEnd = Number.isFinite(exT) ? exT : latestTime;
  if (Number.isFinite(through) && through < enT) return [];
  const endT = Number.isFinite(through) ? Math.min(targetEnd, through) : targetEnd;
  const pts = [
    { time: enT, price: enP },
    ...list.filter((c) => c.time >= enT && c.time <= endT).map((c) => ({ time: c.time, price: Number(c.close) })),
    ...(Number.isFinite(exP) && Number.isFinite(exT) && endT >= exT ? [{ time: exT, price: exP }] : []),
  ].filter((p) => Number.isFinite(p.price)).sort((a, b) => a.time - b.time);

  const raw = Number.isFinite(exP) ? dir * (exP - enP) : (pts.length > 1 ? dir * (pts[pts.length - 1].price - enP) : 0);
  const mult = Math.abs(raw) > Number.EPSILON ? pnl / raw : Number(t?.quantity) || 1;
  let prev = 0;
  return pts.filter((p, i) => i === 0 || p.time !== pts[i - 1].time).map((p, i) => {
    const val = dir * (p.price - enP) * mult;
    const itemPnl = i === 0 ? 0 : val - prev;
    prev = val;
    return { id: `running-pnl-${p.time}`, pnl: itemPnl, entryAt: new Date(p.time * 1000).toISOString() };
  });
};

export default function ThatTrade({ trades = [], currencyCode }) {
  const isLg = useBreakpoint("lg");
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [fetchedTrade, setFetchedTrade] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialTrade = location.state?.tradeData?.unique_id === uniqueId ? location.state.tradeData : (trades?.find((t) => t?.unique_id === uniqueId) || null);
  const trade = fetchedTrade || initialTrade;
  const targetId = uniqueId || trade?.unique_id;

  const [chartCandles, setChartCandles] = useState([]);
  const [replayCandle, setReplayCandle] = useState(null);
  const draftTimerRef = useRef(null);

  useEffect(() => {
    if (!targetId) return setIsLoading(false);
    tradeApi.getById(targetId, currencyCode ? { currency: currencyCode } : undefined).then((res) => {
      if (res?.success && res?.trade) setFetchedTrade(res.trade);
    }).finally(() => setIsLoading(false));
  }, [targetId, currencyCode]);

  const saveLocalDraft = useCallback((updates) => {
    if (!targetId) return;
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(async () => {
      try { await tradeApi.update(targetId, { ...updates, unique_id: targetId }); } catch {}
    }, 3000);
  }, [targetId]);

  const chartTrades = useMemo(() => {
    const enT = toSeconds(trade?.entryAt);
    const exT = toSeconds(trade?.exitAt);
    if (!enT && !exT) return [];
    return [{
      entryTime: enT,
      exitTime: exT,
      entryPrice: trade?.entryPrice,
      exitPrice: trade?.exitPrice,
      tradeType: trade?.side === "short" ? "short" : "long",
    }];
  }, [trade?.entryAt, trade?.exitAt, trade?.entryPrice, trade?.exitPrice, trade?.side]);

  const anchorTime = useMemo(() => toSeconds(trade?.entryAt) || undefined, [trade?.entryAt]);
  const formattedDate = useMemo(() => (trade?.entryAt ? formatDisplayDate(trade.entryAt) : ""), [trade?.entryAt]);

  const runningPnlTrades = useMemo(() => buildRunningPnl(chartCandles, trade, replayCandle?.time), [chartCandles, trade, replayCandle?.time]);
  const replayPnl = useMemo(() => runningPnlTrades.reduce((t, p) => t + (Number(p.pnl) || 0), 0), [runningPnlTrades]);
  const displayedPnl = replayCandle ? replayPnl : Number(trade?.pnl || 0);

  const runningStats = useMemo(() => {
    let favorable = 0, adverse = 0, sum = 0;
    runningPnlTrades.forEach((p) => {
      sum += Number(p.pnl) || 0;
      favorable = Math.max(favorable, sum);
      adverse = Math.min(adverse, sum);
    });
    return { favorable, adverse, capture: favorable > 0 ? Math.min(100, Math.max(0, ((Number(trade?.pnl) || 0) / favorable) * 100)) : 0 };
  }, [runningPnlTrades, trade?.pnl]);

  const handleCandleData = useCallback((candles) => {
    setChartCandles((prev) => {
      if (prev === candles) return prev;
      if (Array.isArray(prev) && Array.isArray(candles) && prev.length === candles.length && prev[0]?.time === candles[0]?.time && prev[prev.length - 1]?.time === candles[candles.length - 1]?.time) return prev;
      return candles;
    });
  }, []);

  const handleReplayChange = useCallback(({ active, candle }) => setReplayCandle(active ? candle : null), []);

  if (isLoading && !trade) {
    return (
      <MainContentWrapper>
        <PageHeader title="Trade Detail" onBack={() => navigate(-1)} />
        <div className="py-15 px-5 text-center text-[var(--text-secondary)]">Loading trade details...</div>
      </MainContentWrapper>
    );
  }

  if (!trade) {
    return (
      <MainContentWrapper>
        <PageHeader title="Trade Detail" onBack={() => navigate(-1)} />
        <div className="py-15 px-5 text-center text-[var(--text-secondary)]">Trade not found.</div>
      </MainContentWrapper>
    );
  }

  const basicsPane = (
    <Card variant="default" padding="sm" className="overflow-x-hidden overflow-y-auto h-full shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:h-auto max-lg:overflow-visible">
      <div className="mb-3">
        <h3 className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)] m-0 mb-3">
          <div className="flex items-center gap-1.5">
            <SymbolWithIcon symbol={trade.symbol} size="lg" showLabel={false} />
            <span>{trade.symbol}</span>
          </div>
          {formattedDate && <span className="text-[var(--text-secondary)] font-normal text-xs"> · {formattedDate}</span>}
        </h3>
      </div>
      <TradeBasicsCard trade={trade} displayedPnl={displayedPnl} pnlCurrency={trade?.pnlCurrency} isProfit={displayedPnl >= 0} onTradeUpdated={setFetchedTrade} />
      <TradeStrategySection trade={trade} onSaveDraft={saveLocalDraft} />
      <TradeAttachmentsSection trade={trade} />
    </Card>
  );

  const chartPane = (
    <Card variant="default" padding="none" className="flex flex-col min-h-[380px] h-[520px] lg:h-full w-full min-w-0 overflow-hidden shadow-sm">
      <Chart
        symbol={trade.symbol} uniqueId={trade.unique_id} timeframe={getDurationTimeframe(chartTrades)}
        live={false} priceDigits={trade.instrumentDigits} anchorTime={anchorTime}
        trades={chartTrades} onCandleData={handleCandleData} onReplayChange={handleReplayChange}
      />
    </Card>
  );

  const reviewPane = (
    <TradeReviewPanel trade={trade} runningStats={runningStats} onSaveDraft={saveLocalDraft} />
  );

  return (
    <MainContentWrapper>
      <PageHeader
        title="Trade Detail" onBack={() => navigate(-1)}
        actions={(
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
            <SymbolWithIcon symbol={trade.symbol} size="md" showLabel={false} />
            <span>{trade.symbol}</span>
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        )}
      />

      {isLg ? (
        <ResizablePanelGroup direction="horizontal" id="that-trade-layout" className="mt-3 h-[calc(100dvh-var(--app-shell-header-height)-28px)] max-h-[calc(100dvh-var(--app-shell-header-height)-28px)] min-h-0 items-stretch bg-transparent">
          <ResizablePanel defaultSize="22%" minSize="15%" maxSize="35%" collapsible={true} className="min-w-0 overflow-hidden" id="basics">{basicsPane}</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="50%" minSize="30%" className="min-w-0" id="chart">{chartPane}</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="28%" minSize="18%" maxSize="45%" collapsible={true} className="min-w-0 overflow-hidden" id="review">{reviewPane}</ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="grid grid-cols-1 gap-[var(--component-gap)] mt-[var(--component-gap)]">
          {basicsPane}{chartPane}{reviewPane}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--component-gap)] mt-[var(--component-gap)] pb-6">
        <div className="lg:col-span-4 min-h-[300px] h-[300px] max-lg:h-auto">
          <PerformanceChart trades={runningPnlTrades} currencyCode={trade?.pnlCurrency} title="Running P&L" groupBy="trade" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-8 gap-[var(--component-gap)] h-auto lg:h-[300px]">
          <RichTextNotes uniqueId={trade.unique_id} selectedDate={trade?.entryAt ? trade.entryAt.slice(0, 10) : undefined} />
          <TradeAiReviewCard trade={trade} pnlCurrency={trade?.pnlCurrency} onSaveDraft={saveLocalDraft} />
        </div>
      </div>
    </MainContentWrapper>
  );
}
