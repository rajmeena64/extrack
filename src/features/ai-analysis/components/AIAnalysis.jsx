import React, { useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  CircleDollarSign,
  Search,
  Sigma,
  TrendingDown,
  TrendingUp,
} from "@/icons/lucideIcons";
import api from "@/utils/common/serve";
import { formatCurrency } from "@/utils/user/Currency";
import { getTradeDisplayTime, toTradeDateKey } from "@/utils/trading/tradeTime";

const getTradePnl = (trade) => (Number.isFinite(Number(trade?.pnl)) ? Number(trade?.pnl) : 0);

const getSymbol = (trade) => String(trade?.symbol || "Unknown").toUpperCase();

const formatDateKey = (dateKey) => {
  if (!dateKey) return "Unknown date";
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const summarizeTrades = (tradeList, currencyCode) => {
  const list = Array.isArray(tradeList) ? tradeList : [];
  const pnl = list.reduce((sum, trade) => sum + getTradePnl(trade), 0);
  const wins = list.filter((trade) => getTradePnl(trade) > 0).length;
  const losses = list.filter((trade) => getTradePnl(trade) < 0).length;
  const flats = list.length - wins - losses;
  const bestTrade = list.reduce(
    (best, trade) => (!best || getTradePnl(trade) > getTradePnl(best) ? trade : best),
    null
  );
  const worstTrade = list.reduce(
    (worst, trade) => (!worst || getTradePnl(trade) < getTradePnl(worst) ? trade : worst),
    null
  );

  return {
    pnl,
    wins,
    losses,
    flats,
    bestTrade,
    worstTrade,
    total: list.length,
    winRate: list.length ? (wins / list.length) * 100 : 0,
    formattedPnl: formatCurrency(pnl, currencyCode),
  };
};

const buildGroupedStats = (trades, currencyCode) => {
  const dayMap = new Map();
  const symbolMap = new Map();

  trades.forEach((trade) => {
    const dateKey = toTradeDateKey(trade) || "unknown";
    const symbol = getSymbol(trade);

    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey).push(trade);

    if (!symbolMap.has(symbol)) symbolMap.set(symbol, []);
    symbolMap.get(symbol).push(trade);
  });

  const days = [...dayMap.entries()]
    .map(([dateKey, dayTrades]) => ({
      dateKey,
      label: formatDateKey(dateKey),
      trades: dayTrades.sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
      ...summarizeTrades(dayTrades, currencyCode),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));

  const symbols = [...symbolMap.entries()]
    .map(([symbol, symbolTrades]) => ({
      symbol,
      trades: symbolTrades,
      ...summarizeTrades(symbolTrades, currencyCode),
    }))
    .sort((left, right) => Math.abs(right.pnl) - Math.abs(left.pnl));

  return {
    overall: summarizeTrades(trades, currencyCode),
    days,
    symbols,
    bestDay: days.reduce((best, day) => (!best || day.pnl > best.pnl ? day : best), null),
    worstDay: days.reduce((worst, day) => (!worst || day.pnl < worst.pnl ? day : worst), null),
    bestSymbol: symbols.reduce((best, symbol) => (!best || symbol.pnl > best.pnl ? symbol : best), null),
    worstSymbol: symbols.reduce((worst, symbol) => (!worst || symbol.pnl < worst.pnl ? symbol : worst), null),
  };
};

const suggestionPrompts = [
  "What was my worst day?",
  "Show my best day and profit",
  "What is my overall win rate?",
  "Best and worst symbol",
  "How many trades on 01/07/2026?",
];

const cleanAssistantText = (value) => String(value || "")
  .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
  .replace(/\*{2,}/g, "")
  .replace(/^\s*[-*]\s+/gm, "- ")
  .trim();

function AIAnalysis({ trades = [], currencyCode = "USD" }) {
  const normalizedTrades = useMemo(
    () => (Array.isArray(trades) ? trades : []).slice().sort((left, right) => getTradeDisplayTime(left) - getTradeDisplayTime(right)),
    [trades]
  );
  const stats = useMemo(() => buildGroupedStats(normalizedTrades, currencyCode), [currencyCode, normalizedTrades]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageIdRef = useRef(0);
  const hasConversation = messages.length > 0;

  const startNewChat = () => {
    setMessages([]);
    setInput("");
  };

  const askAssistant = async (prompt) => {
    const question = prompt.trim();
    if (!question || isLoading) return;

    const currentMessages = messages;
    messageIdRef.current += 1;
    const messageId = messageIdRef.current;
    const userMessage = { id: `user-${messageId}`, role: "user", content: question };
    const loadingMessage = {
      id: `assistant-${messageId}`,
      role: "assistant",
      content: "Entrack AI is analyzing your trades...",
    };
    const pendingMessages = [...currentMessages, userMessage, loadingMessage];

    setMessages(pendingMessages);
    setInput("");
    setIsLoading(true);

    try {
      const history = currentMessages.map(({ role, content }) => ({ role, content }));
      const { data } = await api.post("/ai-trade-chat", {
        question,
        messages: history,
        currencyCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!data?.success) {
        throw new Error(data?.error || "AI chat failed.");
      }

      setMessages((current) => current.map((message) => (
        message.id === loadingMessage.id
          ? { ...message, content: cleanAssistantText(data.reply || "Entrack AI returned an empty reply.") }
          : message
      )));
    } catch (error) {
      const userError = error?.response?.data?.error || error?.message || "AI chat failed.";
      setMessages((current) => current.map((message) => (
        message.id === loadingMessage.id
          ? { ...message, content: userError }
          : message
      )));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    askAssistant(input);
  };

  return (
    <section className="ai-assistant grid grid-cols-[minmax(0,1fr)] gap-0 min-h-full flex-1 p-0 border border-[var(--border-light)] rounded-none overflow-hidden bg-[radial-gradient(circle_at_50%_42%,rgba(88,212,126,0.08),transparent_48%),linear-gradient(135deg,rgba(88,212,126,0.045),transparent_44%),var(--bg-card)] dark:bg-[radial-gradient(circle_at_50%_42%,rgba(88,212,126,0.08),transparent_48%),linear-gradient(135deg,rgba(88,212,126,0.045),transparent_44%),#050505]">
      <div className="ai-assistant__main min-w-0 min-h-0 grid grid-rows-[auto_minmax(0,1fr)]">
        <div className="ai-assistant__topbar min-h-[56px] flex items-center justify-between gap-3.5 px-[22px] py-3 border-b border-[var(--border-light)] backdrop-blur-[12px] bg-[linear-gradient(135deg,rgba(88,212,126,0.035),transparent_48%),color-mix(in_srgb,var(--bg-card)_86%,transparent)] dark:bg-[radial-gradient(circle_at_top,rgba(88,212,126,0.08),transparent_48%),#070707]">
          <button type="button" className="ai-assistant__new-chat h-[34px] inline-flex items-center justify-center gap-2 px-3 border border-[color-mix(in_srgb,var(--accent-success-strong)_22%,var(--border-light))] rounded-[10px] bg-[linear-gradient(135deg,rgba(88,212,126,0.08),transparent_44%),var(--bg-card)] text-[var(--heading)] text-sm font-bold cursor-pointer transition-[background-color,border-color] duration-[180ms] ease-out hover:bg-[var(--bg-hover)] hover:border-[var(--border-light)] dark:hover:bg-[#171717]" onClick={startNewChat}>
            New Chat
          </button>
          <div className="ai-assistant__context min-w-0 flex items-center justify-end gap-2 flex-wrap" aria-label="Assistant trade context">
            <span className={`h-[28px] inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-full bg-[color-mix(in_srgb,var(--bg-card)_90%,var(--surface-subtle)_10%)] dark:bg-[#111111] text-xs font-bold ${stats.overall.pnl >= 0 ? "ai-profit text-[#047857] dark:text-[#5ad79a]" : "ai-loss text-[#dc2626] dark:text-[#ff2f2f]"}`}>
              <CircleDollarSign size={14} />
              {formatCurrency(stats.overall.pnl, currencyCode)}
            </span>
            <span className="h-[28px] inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-full bg-[color-mix(in_srgb,var(--bg-card)_90%,var(--surface-subtle)_10%)] dark:bg-[#111111] text-[var(--text-secondary)] text-xs font-bold">
              <Sigma size={14} />
              {stats.overall.total} trades
            </span>
            <span className="h-[28px] inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-full bg-[color-mix(in_srgb,var(--bg-card)_90%,var(--surface-subtle)_10%)] dark:bg-[#111111] text-[var(--text-secondary)] text-xs font-bold">
              <TrendingUp size={14} />
              {stats.bestDay ? formatCurrency(stats.bestDay.pnl, currencyCode) : "-"}
            </span>
            <span className="h-[28px] inline-flex items-center gap-1.5 px-2.5 border border-[var(--border-light)] rounded-full bg-[color-mix(in_srgb,var(--bg-card)_90%,var(--surface-subtle)_10%)] dark:bg-[#111111] text-[var(--text-secondary)] text-xs font-bold">
              <TrendingDown size={14} />
              {stats.worstDay ? formatCurrency(stats.worstDay.pnl, currencyCode) : "-"}
            </span>
          </div>
        </div>

        <div className={`ai-assistant__chat ${hasConversation ? "is-active" : "is-empty"} flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_auto] bg-transparent overflow-hidden`}>
          <div className={`ai-assistant__messages min-h-0 flex flex-col gap-2.5 pt-6 px-[clamp(18px,5vw,72px)] pb-4 overflow-auto scroll-smooth ${hasConversation ? "w-[min(980px,100%)] mx-auto" : ""}`} aria-live="polite">
            {!hasConversation && (
              <div className="ai-assistant__empty w-[min(680px,100%)] m-auto flex flex-col items-center text-center pt-[18px] pb-[44px] px-0">
                <div className="ai-assistant__spark relative w-9 h-9 mb-3.5 before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:w-6 before:h-6 before:rounded-[8px_2px] before:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-success-strong)_72%,var(--primary)_28%),color-mix(in_srgb,#71e098_76%,#ffffff_24%))] before:shadow-[0_12px_22px_-14px_color-mix(in_srgb,var(--accent-success-strong)_65%,transparent)] after:content-[''] after:absolute after:top-[70%] after:left-[22%] after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:w-3.5 after:h-3.5 after:rounded-[8px_2px] after:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-success-strong)_72%,var(--primary)_28%),color-mix(in_srgb,#71e098_76%,#ffffff_24%))] after:shadow-[0_12px_22px_-14px_color-mix(in_srgb,var(--accent-success-strong)_65%,transparent)] after:opacity-[0.78]" aria-hidden="true" />
                <h2 className="m-0 text-[var(--heading)] text-[clamp(24px,3vw,34px)] font-[620] leading-[1.15] tracking-normal">Ask Entrack AI Anything</h2>
                <p className="max-w-[520px] mt-2.5 mb-[26px] mx-0 text-[var(--text-secondary)] text-sm font-medium leading-[1.5]">Chat with your private trade journal to find days, P&L, symbols, win rate, risk patterns, best setups, and worst mistakes.</p>

                <div className="ai-assistant__suggestions w-[min(600px,100%)] grid grid-cols-3 gap-2.5 mb-[22px]" aria-label="Suggestions">
                  {suggestionPrompts.map((prompt) => (
                    <button key={prompt} type="button" className="min-h-[76px] flex items-start justify-between gap-3.5 p-3.5 border border-[var(--border-light)] rounded-[14px] bg-[radial-gradient(circle_at_top,rgba(88,212,126,0.08),transparent_48%),var(--bg-card)] dark:bg-[#111111] text-[var(--text-primary)] text-left text-[13px] font-[620] leading-[1.35] cursor-pointer transition-[background-color,border-color,transform] duration-[180ms] ease-out hover:bg-[var(--bg-hover)] dark:hover:bg-[#171717] hover:border-[color-mix(in_srgb,var(--accent-ink)_18%,var(--border-light))] hover:-translate-y-px" onClick={() => askAssistant(prompt)}>
                      <span>{prompt}</span>
                      <ArrowUpRight size={15} className="shrink-0 text-[var(--text-secondary)]" />
                    </button>
                  ))}
                </div>

                <button type="button" className="ai-assistant__library h-9 inline-flex items-center gap-2 px-3 border border-transparent rounded-full bg-transparent text-[var(--text-primary)] text-[13px] font-semibold cursor-pointer hover:bg-[var(--bg-hover)] hover:border-[var(--border-light)] dark:hover:bg-[#171717]" onClick={() => askAssistant("Give me a complete trading journal summary.")}>
                  <BookOpenCheck size={15} />
                  Trade journal summary
                </button>
              </div>
            )}

            {hasConversation && messages.map((message) => (
              <div key={message.id} className={`ai-assistant-message ai-assistant-message--${message.role} w-[min(780px,100%)] flex items-start gap-3 ${message.role === "user" ? "self-end w-fit max-w-[min(560px,78%)]" : ""}`}>
                {message.role === "assistant" && <div className="ai-assistant-message__mark relative shrink-0 w-[22px] h-[22px] mt-[7px] before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:w-[15px] before:h-[15px] before:rounded-[8px_2px] before:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-success-strong)_72%,var(--primary)_28%),color-mix(in_srgb,#71e098_76%,#ffffff_24%))] before:shadow-[0_12px_22px_-14px_color-mix(in_srgb,var(--accent-success-strong)_65%,transparent)]" aria-hidden="true" />}
                <div className={`ai-assistant-message__body min-w-0 ${message.role === "user" ? "px-[15px] py-[11px] border border-[color-mix(in_srgb,var(--accent-success-strong)_16%,var(--border-light))] rounded-2xl bg-[linear-gradient(135deg,rgba(88,212,126,0.08),transparent_44%),var(--bg-card)] dark:bg-[#111111] text-[var(--heading)]" : "p-0 text-[var(--text-primary)]"}`}>
                  <span className="ai-assistant-message__label block mb-[5px] text-[var(--text-secondary)] text-[11px] font-[750] uppercase tracking-[0.06em]">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  <p className="m-0 text-inherit text-sm font-medium leading-[1.52] whitespace-pre-line">{message.role === "assistant" ? cleanAssistantText(message.content) : message.content}</p>
                </div>
              </div>
            ))}
          </div>

          <form className="ai-assistant__composer w-[min(680px,calc(100%-32px))] min-h-[74px] grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 mx-auto mb-[18px] mt-0 p-2.5 border border-[var(--border-light)] rounded-[18px] bg-[radial-gradient(circle_at_top,rgba(88,212,126,0.08),transparent_48%),var(--bg-card)] dark:bg-[radial-gradient(circle_at_top,rgba(88,212,126,0.08),transparent_48%),#070707] shadow-[0_22px_58px_-38px_color-mix(in_srgb,var(--accent-success-strong)_38%,rgba(15,23,42,0.35))]" onSubmit={handleSubmit}>
            <div className="ai-assistant__input-wrap min-w-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 items-start pt-[7px] pb-[7px] pl-2 pr-1 border-0 bg-transparent text-[var(--text-secondary)]">
              <Search size={16} aria-hidden="true" />
              <textarea
                className="w-full min-h-[42px] max-h-[130px] resize-y border-0 outline-none bg-transparent text-[var(--text-primary)] font-inherit text-sm font-medium leading-[1.45] placeholder:text-[var(--text-muted)]"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask: What was my profit on 01/07/2026, worst day, XAUUSD result..."
                rows={2}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askAssistant(input);
                  }
                }}
              />
            </div>
            <button type="submit" className="w-[34px] h-[34px] inline-flex items-center justify-center border-0 rounded-full bg-[color-mix(in_srgb,var(--button-bg)_86%,var(--bg-card)_14%)] text-[var(--button-text)] cursor-pointer transition-[opacity,transform] duration-[180ms] ease-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50" aria-label="Ask Entrack AI" disabled={!input.trim() || isLoading}>
              <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default AIAnalysis;
