import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { legalDocuments } from './legalDocuments';
import { documentationSections } from './documentationSections';
import { analyticsGuideSections } from './analyticsGuideSections';
import LandingHome from './LandingHome';

const analyticsFeatureVisuals = {
  overview: {
    image: '/assets/landing/stats-cards.png',
    imageAlt: 'Trading analytics dashboard with performance charts',
    definition: 'Entrack Analytics is the full review layer of the product. It collects your trading records, turns them into performance signals, and helps you decide what to improve next.',
    bestFor: 'Use this when you want a complete view of your trading behavior instead of checking one isolated stat.',
    input: 'Trades, P&L, dates, symbols, sessions, notes and account context.',
    output: 'A clear map of strengths, leaks, review pages and practice areas.',
    signals: ['Whether your review system has enough data', 'Which analytics page should be opened first', 'Which part of trading needs the next decision'],
    mistakes: ['Jumping between tools without a review order', 'Reacting to one trade instead of reading the full record', 'Ignoring missing notes or incomplete trade data'],
    routine: ['Start with the overview', 'Choose the weakest visible area', 'Open that dedicated analytics page', 'Write one action for the next session']
  },
  dashboard: {
    image: null,
    imageAlt: 'Performance dashboard on a trading workspace',
    definition: 'Dashboard is the quick health check of your trading account. It tells you whether the current period is stable, risky, improving or drifting.',
    bestFor: 'Use it at the start of review before opening deeper tools.',
    input: 'Filtered trades, account currency, date range and trade source.',
    output: 'P&L, win rate, trade activity, account overview and links to deeper review.',
    signals: ['Account direction for the selected period', 'Whether trade volume is normal or excessive', 'Whether recent P&L matches the quality of decisions'],
    mistakes: ['Judging the week from one large winner', 'Missing a drop in account health', 'Comparing periods without the same date or currency filters'],
    routine: ['Set the date range', 'Check P&L and win rate together', 'Look for unusual trade count', 'Open the tool that explains the weakest number']
  },
  radar: {
    image: '/assets/landing/radar-score.png',
    imageAlt: 'Analyst reviewing score charts and performance metrics',
    definition: 'Radar Score compresses multiple performance qualities into one shape. It shows if your trading is balanced or if one weak metric is damaging the whole system.',
    bestFor: 'Use it when results feel confusing and you need to know which metric needs attention first.',
    input: 'Closed trades, wins, losses, gross profit, gross loss and equity movement.',
    output: 'A 0-100 score across win rate, profit factor, average win/loss, recovery, drawdown and consistency.',
    signals: ['Whether the strategy is balanced or one-sided', 'If exits are weaker than entries', 'If drawdown control is damaging an otherwise good system'],
    mistakes: ['Only watching win rate', 'Ignoring average loss size', 'Thinking profit factor is good while recovery is poor'],
    routine: ['Read the lowest radar spoke', 'Compare it with the overall score', 'Open trades connected to that weakness', 'Adjust one rule before the next live session']
  },
  'progress-tracker': {
    image: '/assets/landing/progress-tracker.png',
    imageAlt: 'Weekly planning wall showing consistent activity',
    definition: 'Progress Tracker is a consistency map. It shows whether you are building enough clean trading data to actually learn from your journal.',
    bestFor: 'Use it to catch overtrading clusters, missing review days and inconsistent journaling.',
    input: 'Trade timestamps grouped by day and week.',
    output: 'A weekly activity heatmap showing trading rhythm and data consistency.',
    signals: ['Days with unusually heavy activity', 'Weeks where journaling stopped', 'Whether trading is consistent enough to measure'],
    mistakes: ['Trading intensely after losses', 'Skipping records on difficult days', 'Believing a strategy changed when only activity changed'],
    routine: ['Scan the densest blocks', 'Mark missing review days', 'Compare activity with P&L calendar', 'Set a weekly journaling target']
  },
  calendar: {
    image: '/assets/landing/pnl-calendar.png',
    imageAlt: 'Calendar planning board for daily trading review',
    definition: 'P&L Calendar turns every trading day into a visible result block. It makes daily performance patterns easy to scan.',
    bestFor: 'Use it to find red-day patterns, weekly behavior and days that need a deeper Day Review.',
    input: 'Daily trades, P&L, win count, notes and breakeven marking.',
    output: 'Daily P&L cells, weekly totals, trading-day count and direct day-review access.',
    signals: ['Repeated red weekdays', 'Weeks saved by one day or damaged by one day', 'Breakeven days where risk control mattered'],
    mistakes: ['Repeating the same bad weekday behavior', 'Ignoring small daily losses that stack up', 'Treating every red day as the same problem'],
    routine: ['Open the current month', 'Find the strongest and weakest day cells', 'Open Day Review for the worst day', 'Set a rule for that weekday or session']
  },
  'day-review': {
    image: '/assets/landing/trade-detail-loss.png',
    imageAlt: 'Desk setup for reviewing a trading day with notes',
    definition: 'Day Review is the post-session breakdown. It explains what happened on one specific date and turns it into one practical lesson.',
    bestFor: 'Use it after every active session, especially after emotional wins or losses.',
    input: 'All trades from one date, session time, symbols, P&L and notes.',
    output: 'Net P&L, intraday curve, largest winner, largest loser, checklist, session and symbol breakdown.',
    signals: ['Where the session turned', 'Which trade controlled the day', 'Whether the day was a strategy issue or behavior issue'],
    mistakes: ['Carrying emotion into the next session', 'Ignoring the largest loser', 'Calling a profitable day good when execution was poor'],
    routine: ['Open the exact date', 'Read the intraday curve', 'Compare largest winner and loser', 'Write the next-session lesson']
  },
  'specific-day-chart': {
    image: '/assets/landing/trade-detail-strategy.png',
    imageAlt: 'Candlestick chart for trade timing analysis',
    definition: 'Specific Day Chart brings candle context into trade review. It shows where entries and exits happened on the actual market move.',
    bestFor: 'Use it when you need to review execution quality, entry timing and exit discipline.',
    input: 'Symbol, trade date, timeframe, entry price, exit price and timestamps.',
    output: 'A candle chart with trade markers and full-day context.',
    signals: ['Entry timing against market structure', 'Exit quality after the trade', 'Whether the trade followed the setup or chased price'],
    mistakes: ['Entering after the move is already extended', 'Exiting before the planned target without evidence', 'Reviewing trades without chart context'],
    routine: ['Select the trade date', 'Check the entry marker', 'Switch timeframes', 'Compare exit marker with the move that followed']
  },
  'charting-analytics': {
    image: null,
    imageAlt: 'Financial chart analytics displayed on screens',
    definition: 'Charting Analytics shows the shape of performance. It helps you see whether your account is climbing steadily or surviving through random spikes.',
    bestFor: 'Use it to understand equity curve quality, drawdown periods and recovery behavior.',
    input: 'Trade-by-trade or day-by-day P&L sequence.',
    output: 'Cumulative P&L curve, drawdown visibility and trend quality.',
    signals: ['Smooth growth versus spike-based growth', 'Where drawdown starts and ends', 'Whether recovery is strong or fragile'],
    mistakes: ['Increasing size during unstable curves', 'Ignoring a flattening equity line', 'Treating one profit spike as a stable edge'],
    routine: ['Read the curve direction', 'Mark the largest drawdown zone', 'Inspect trades inside that zone', 'Reduce or refine risk if the curve is unstable']
  },
  heatmap: {
    image: null,
    imageAlt: 'Data heatmap and analytics screen',
    definition: 'Heatmap makes repeated behavior visible. Instead of reading tables, you scan blocks and instantly see where profit or damage clusters.',
    bestFor: 'Use it when you want to identify weak sessions, symbols, weekdays or behavior zones quickly.',
    input: 'Grouped trade results across time, symbols, sessions or categories.',
    output: 'Visual clusters of strong and weak performance areas.',
    signals: ['Profit clusters worth repeating', 'Loss clusters that need rules', 'Categories that look fine in tables but weak visually'],
    mistakes: ['Missing patterns hidden in rows', 'Trading a weak symbol because a few trades looked good', 'Ignoring repeated low-quality sessions'],
    routine: ['Pick the heatmap grouping', 'Find the darkest weak cluster', 'Open trades from that cluster', 'Create an avoid-or-reduce rule']
  },
  'ai-analysis': {
    image: '/assets/landing/ai-analysis.png',
    imageAlt: 'AI analytics interface for structured review',
    definition: 'AI Analysis converts trade data into plain-language feedback. It acts like a review assistant that summarizes repeated patterns.',
    bestFor: 'Use it when you want a fast review draft after a busy session or week.',
    input: 'Trades, notes, strategy labels, P&L, dates and selected currency context.',
    output: 'Strengths, weaknesses, repeated mistakes and next-action prompts.',
    signals: ['Repeated mistakes across many trades', 'Missing context in notes', 'Behavior themes that are hard to spot manually'],
    mistakes: ['Using AI output without checking the trades', 'Expecting predictions instead of review', 'Feeding incomplete notes and trusting the summary blindly'],
    routine: ['Select the trade period', 'Generate the analysis', 'Verify the claim against actual trades', 'Keep only one action item']
  },
  'replay-backtesting': {
    image: null,
    imageAlt: 'Trader practicing with historical chart replay',
    definition: 'Replay and Backtesting let you practice your rule before using live money. It converts lessons into reps.',
    bestFor: 'Use it after analytics identifies a mistake you need to train out.',
    input: 'Historical candles, strategy rules, virtual orders and risk settings.',
    output: 'Practice trades, replay stats and confidence in execution rules.',
    signals: ['Whether a rule works before live execution', 'How often you break the plan under replay', 'Where entries or exits fail repeatedly'],
    mistakes: ['Changing live strategy without practice', 'Trusting memory instead of replay evidence', 'Skipping execution reps after finding a weakness'],
    routine: ['Choose the weakness from analytics', 'Replay similar market conditions', 'Place virtual trades by rule', 'Compare replay behavior with live journal behavior']
  },
  'broker-session-insights': {
    image: '/assets/landing/trade-filter.png',
    imageAlt: 'Trading workstation comparing market sources and sessions',
    definition: 'Broker and Session Insights show where performance actually comes from: account, broker, market, symbol or time window.',
    bestFor: 'Use it when one broker, session or source feels different but you need proof from data.',
    input: 'Broker/account source, trade mode, symbol category, session timing and P&L.',
    output: 'Source comparison, session quality and where your edge performs best.',
    signals: ['Which account source performs best', 'Which session creates the cleanest trades', 'Whether manual and imported trades behave differently'],
    mistakes: ['Blaming the market when one source is the issue', 'Mixing broker data without context', 'Trading the same size in weak sessions'],
    routine: ['Separate results by source', 'Compare session performance', 'Check symbols inside weak sources', 'Move focus toward the cleanest source-session pair']
  }
};

function PageShell({ title = "Entrack", homeHref = "/", navLinks = [], children, ariaLabel = "Entrack home" }) {
  return (
    <div className="min-h-screen bg-[#010204] text-[#f8fafc] relative font-sans">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(101,99,240,0.14),transparent_60%),radial-gradient(circle_at_85%_65%,rgba(231,61,138,0.07),transparent_50%),linear-gradient(180deg,rgba(3,3,5,0.1),#030305_90%)]" aria-hidden="true" />
      <header className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 min-h-[86px] flex items-center justify-between border-b border-white/[0.08] relative z-10">
        <a href={homeHref} className="flex items-center gap-3 text-white font-bold text-lg hover:opacity-90 transition-opacity" aria-label={ariaLabel}>
          <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center p-1.5" aria-hidden="true">
            <img className="w-full h-full object-contain" src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>{title}</span>
        </a>
        <nav className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-400 [&_a:hover]:text-white transition-colors">
          {navLinks.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
      </header>
      {children}
    </div>
  );
}

function DocumentationPage() {
  const requestedSlug = window.location.pathname.split('/').filter(Boolean)[1] || 'journal';
  const found = documentationSections.find((s) => s.slug === requestedSlug);
  const activeSection = found ? found : documentationSections[0];

  return (
    <PageShell navLinks={[['/', 'Landing'], [`/documentation/${activeSection.slug}`, 'Documentation']]} ariaLabel="Documentation navigation">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-10 items-start relative z-10">
        <aside className="sticky top-6 p-4 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-[#2E90FA] mb-2 px-2">Documentation</div>
          {documentationSections.map((section) => (
            <a key={section.id} className={`px-3.5 py-2.5 rounded-2xl text-sm font-bold flex flex-col gap-0.5 transition-colors ${section.slug === activeSection.slug ? 'bg-[#2E90FA]/15 text-white border border-[#2E90FA]/30 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`} href={`/documentation/${section.slug}`}>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">{section.eyebrow}</span>
              {section.label}
            </a>
          ))}
        </aside>
        <article className="min-w-0">
          <div className="pb-10 border-b border-white/10">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-2">Entrack Docs</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{activeSection.label} documentation.</h1>
            <p className="mt-4 text-base text-slate-400 max-w-2xl leading-relaxed">Each sidebar item opens its own documentation page, so the content stays focused on the workflow you selected.</p>
          </div>
          <section className="py-10 border-b border-white/10" id={activeSection.id}>
            <div className="text-xs font-bold uppercase tracking-widest text-[#2E90FA] mb-3">{activeSection.eyebrow}</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">{activeSection.title}</h2>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-3xl">{activeSection.intro}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.04]">
                <h3 className="text-lg font-bold text-white mb-3">What to track</h3>
                <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
                  {activeSection.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.04]">
                <h3 className="text-lg font-bold text-white mb-3">How to use it</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{activeSection.workflow}</p>
              </div>
            </div>
            <div className="mt-6 p-6 rounded-2xl border border-white/10 bg-white/[0.03]">
              <h3 className="text-lg font-bold text-white mb-4">Detailed explanation</h3>
              <ol className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-5 list-decimal text-slate-300 text-sm">
                {activeSection.deepDive.map((line) => <li key={line}>{line}</li>)}
              </ol>
            </div>
            <div className="mt-6 p-5 rounded-2xl border border-[#2E90FA]/20 bg-[#2E90FA]/[0.06]">
              <strong className="block text-sm font-bold text-white mb-2">Privacy and sensitive data</strong>
              <p className="text-sm text-slate-300 leading-relaxed">{activeSection.privacy}</p>
            </div>
          </section>
        </article>
      </main>
    </PageShell>
  );
}

function AnalyticsGuidePage() {
  const requestedSlug = window.location.pathname.split('/').filter(Boolean)[1] || 'overview';
  const found = analyticsGuideSections.find((s) => s.slug === requestedSlug);
  const activeSection = found ? found : analyticsGuideSections[0];
  const activeIndex = Math.max(0, analyticsGuideSections.findIndex((s) => s.slug === activeSection.slug));
  const visual = analyticsFeatureVisuals[activeSection.slug] ? analyticsFeatureVisuals[activeSection.slug] : analyticsFeatureVisuals.overview;

  return (
    <PageShell navLinks={[['/', 'Home'], ['/demo', 'Demo'], ['/documentation/analytics', 'Reference']]} ariaLabel="Analytics navigation">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-10 items-start relative z-10">
        <aside className="sticky top-6 p-4 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex flex-col gap-2" aria-label="Analytics feature list">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#2E90FA] mb-2 px-2">
            <span>Analytics Menu</span>
            <strong>{String(activeIndex + 1).padStart(2, '0')}</strong>
          </div>
          {analyticsGuideSections.map((s) => (
            <a key={s.slug} className={`px-3.5 py-2.5 rounded-2xl text-sm font-bold flex flex-col gap-0.5 transition-colors ${s.slug === activeSection.slug ? 'bg-[#2E90FA]/15 text-white border border-[#2E90FA]/30 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`} href={`/analytics/${s.slug}`}>
              <small className="text-[10px] uppercase tracking-wider text-slate-400">{s.eyebrow}</small>
              <span>{s.label}</span>
            </a>
          ))}
        </aside>
        <article className="min-w-0 flex flex-col gap-10">
          <section className="pb-8 border-b border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2E90FA]">Trading analytics system</span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mt-2">{activeSection.title}</h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-3xl">{activeSection.intro}</p>
            <div className="flex flex-wrap gap-2 mt-6" aria-label="Selected analytics features">
              {activeSection.features.map((f) => <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10" key={f}>{f}</span>)}
            </div>
          </section>
          {visual.image ? (
            <figure className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-2xl">
              <img className="w-full h-auto object-cover" src={visual.image} alt={visual.imageAlt} />
              <figcaption className="p-4 bg-[#09090b] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>{activeSection.eyebrow}</span>
                <strong className="text-white">{activeSection.label}</strong>
              </figcaption>
            </figure>
          ) : null}
          <section className="p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.03]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2E90FA]">Feature definition</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">What is {activeSection.label}?</h2>
            <p className="mt-3 text-base text-slate-300 leading-relaxed">{visual.definition}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <article className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Best used for</span>
                <p className="text-sm text-slate-200">{visual.bestFor}</p>
              </article>
              <article className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Input data</span>
                <p className="text-sm text-slate-200">{visual.input}</p>
              </article>
              <article className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Output insight</span>
                <p className="text-sm text-slate-200">{visual.output}</p>
              </article>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E90FA]">Feature mechanics</span>
              <h2 className="text-xl font-bold text-white mt-2 mb-4">How {activeSection.label} works</h2>
              <ul className="space-y-2.5 text-sm text-slate-300 list-disc pl-5">
                {activeSection.works.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e73d8a]">Trading improvement</span>
              <h2 className="text-xl font-bold text-white mt-2 mb-4">Why {activeSection.label} matters</h2>
              <ul className="space-y-2.5 text-sm text-slate-300 list-disc pl-5">
                {activeSection.improves.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">Signals to watch</span>
              <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                {visual.signals.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block mb-3">Mistakes this catches</span>
              <ul className="space-y-2 text-xs text-slate-300 list-disc pl-4">
                {visual.mistakes.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-3">Review routine</span>
              <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4">
                {visual.routine.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          </section>
        </article>
      </main>
    </PageShell>
  );
}

function LegalPage({ document }) {
  return (
    <PageShell navLinks={[['/', 'Landing'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]} ariaLabel="Legal navigation">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-10 items-start relative z-10">
        <aside className="sticky top-6 p-4 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-[#2E90FA] mb-2 px-2">Legal</div>
          <a className={`px-3.5 py-2.5 rounded-2xl text-sm font-bold flex flex-col gap-0.5 transition-colors ${document.slug === 'privacy' ? 'bg-[#2E90FA]/15 text-white border border-[#2E90FA]/30 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`} href="/privacy">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Privacy</span>Privacy Policy
          </a>
          <a className={`px-3.5 py-2.5 rounded-2xl text-sm font-bold flex flex-col gap-0.5 transition-colors ${document.slug === 'terms' ? 'bg-[#2E90FA]/15 text-white border border-[#2E90FA]/30 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'}`} href="/terms">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Terms</span>Terms of Service
          </a>
          <a className="px-3.5 py-2.5 rounded-2xl text-sm font-bold flex flex-col gap-0.5 text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors" href="mailto:support@entrack.in">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Support</span>support@entrack.in
          </a>
        </aside>
        <article className="min-w-0">
          <section className="pb-10 border-b border-white/10">
            <div className="text-xs font-bold uppercase tracking-widest text-[#2E90FA] mb-3">{document.eyebrow}</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{document.title}</h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-3xl">{document.intro}</p>
            <div className="inline-flex mt-6 px-3.5 py-1.5 rounded-full border border-[#2E90FA]/20 bg-[#2E90FA]/10 text-xs font-semibold text-slate-300">
              Last Updated: {document.updated}
            </div>
          </section>
          <div className="flex flex-col divide-y divide-white/10">
            {document.sections.map((section, index) => (
              <section className="grid grid-cols-1 sm:grid-cols-[58px_minmax(0,1fr)] gap-6 py-10" key={section.title}>
                <div className="text-xs font-black tracking-widest text-[#2E90FA] pt-1">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">{section.title}</h2>
                  <div className="space-y-3.5 text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl">
                    {section.body.map((p) => <p key={p}>{p}</p>)}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
    </PageShell>
  );
}

const demoSections = [
  {
    slug: 'news',
    title: 'Market news',
    eyebrow: 'News',
    image: null,
    description: 'Track market headlines as trading context without letting news noise take over the review.',
    features: ['Headline context', 'Market awareness', 'Trade review notes'],
    details: [
      'News gives traders market context before and after key decisions.',
      'It helps explain volatility around important sessions and symbols.',
      'The goal is awareness, not emotional reaction.'
    ]
  },
  {
    slug: 'economic-calendar',
    title: 'Economic calendar',
    eyebrow: 'Calendar',
    image: '/assets/landing/economic-calendar.png',
    description: 'Plan trading sessions around scheduled events, high-impact releases and session risk.',
    features: ['Event planning', 'Impact awareness', 'Session preparation'],
    details: [
      'The calendar helps traders avoid surprise volatility around scheduled events.',
      'Events can be reviewed alongside trades to understand timing and risk.',
      'It supports preparation before the trading day starts.'
    ]
  },
  {
    slug: 'ai-analysis',
    title: 'AI analysis',
    eyebrow: 'AI Review',
    image: '/assets/landing/ai-analysis.png',
    description: 'Use AI to summarize trading behavior, repeated mistakes and improvement ideas from your records.',
    features: ['Behavior summary', 'Mistake patterns', 'Review prompts'],
    details: [
      'AI analysis turns trade data into a readable review draft.',
      'It can highlight repeated mistakes, strengths and questions for the next session.',
      'The trader stays in control and uses AI as a review assistant.'
    ]
  }
];

const demoShowcaseSections = [
  {
    slug: 'dashboard',
    title: 'Dashboard overview',
    eyebrow: 'Performance',
    image: '/assets/landing/stats-cards.png',
    description: 'Account health, daily PnL, win rate and trade quality stay in one calm overview.',
    features: ['Fast performance scan', 'Currency aware stats', 'Review-ready layout'],
    details: [
      'The dashboard gives traders a fast first read on account health and recent performance.',
      'Stats, calendar context and trade lists stay close together so review does not feel scattered.',
      'This page is the starting point before opening deeper journal, analytics or replay screens.'
    ]
  },
  {
    slug: 'add-trade',
    title: 'Add trade',
    eyebrow: 'Trade Entry',
    image: '/assets/landing/entrack-add-trade-feature.png',
    description: 'Create clean trade records manually with entry, exit, risk, screenshots and notes.',
    features: ['Manual entry', 'Risk fields', 'Screenshot notes'],
    details: [
      'Add Trade is where a trader turns one decision into structured data.',
      'Manual entry keeps the record complete even when a broker import is not connected.',
      'This page feeds the dashboard, journal and analytics pages.'
    ]
  },
  {
    slug: 'csv-import',
    title: 'CSV import',
    eyebrow: 'Import',
    image: '/assets/landing/csv-upload.png',
    description: 'Bring trade history from files and map old records into the Entrack review workflow.',
    features: ['Bulk import', 'Broker file support', 'Mapped history'],
    details: [
      'CSV import helps traders move existing records into one workspace.',
      'Imported history becomes usable for dashboard stats and analytics.',
      'It is useful when starting with Entrack after months of previous trades.'
    ]
  }
];

const featureSections = [
  {
    slug: 'journal',
    eyebrow: 'Journal',
    title: 'Track every trade with context.',
    image: '/assets/landing/trades-list.png',
    description: 'Journal keeps entries, exits, screenshots, notes and lessons attached to each trade.',
    points: ['Trade notes and screenshots', 'Setup quality review', 'Mistake and lesson tracking']
  },
  {
    slug: 'brokers',
    eyebrow: 'Brokers',
    title: 'Broker coverage without switching tabs.',
    image: null,
    description: 'Broker pages organize trading sources, supported accounts and coverage notes in one clean view.',
    points: ['Supported broker list', 'Account source context', 'Market coverage preview']
  },
  {
    slug: 'analytics',
    eyebrow: 'Analytics',
    title: 'Find the patterns behind performance.',
    image: '/assets/landing/stats-cards.png',
    description: 'Analytics turns trade history into readable stats, weaknesses and repeatable performance patterns.',
    points: ['Win rate and RR breakdown', 'Session and symbol behavior', 'Weakness detection']
  },
  {
    slug: 'replay',
    eyebrow: 'Replay',
    title: 'Practice markets before risking capital.',
    image: null,
    description: 'Replay helps traders test entries, exits and risk rules against historical market movement.',
    points: ['Historical candle replay', 'Virtual execution practice', 'Strategy confidence building']
  }
];

const brokerGalleryItems = [
  { slug: 'exness', name: 'Exness', type: 'Forex broker', coverage: 'Trade import ready', image: '/assets/broker/exness%20image.svg', mark: 'EX', description: 'Track Exness account activity with journal context, screenshots and broker-specific review notes.' },
  { slug: 'vantage', name: 'Vantage', type: 'CFD broker', coverage: 'Account coverage', image: '/assets/broker/vantage.svg', mark: 'VA', description: 'Keep Vantage trades grouped with performance stats so broker behavior is easier to compare.' },
  { slug: 'xm', name: 'XM', type: 'Forex broker', coverage: 'Broker directory', image: '/assets/broker/xm.svg', mark: 'XM', description: 'Add XM into the broker workspace and review markets, accounts and execution patterns cleanly.' },
  { slug: 'binance', name: 'Binance', type: 'Crypto exchange', coverage: 'Crypto journal', mark: 'BN', description: 'Keep crypto trades beside forex and CFD activity without losing the source of each decision.' },
  { slug: 'bybit', name: 'Bybit', type: 'Crypto exchange', coverage: 'Crypto journal', mark: 'BY', description: 'Review Bybit trades with symbol, session and risk context attached to each crypto decision.' },
  { slug: 'bitget', name: 'Bitget', type: 'Crypto exchange', coverage: 'Exchange coverage', mark: 'BG', description: 'Keep Bitget activity organized beside other exchanges and compare execution habits cleanly.' },
  { slug: 'coinbase', name: 'Coinbase', type: 'Crypto exchange', coverage: 'Spot tracking', mark: 'CB', description: 'Track Coinbase spot activity and connect longer-term crypto decisions with journal notes.' },
  { slug: 'okx', name: 'OKX', type: 'Crypto exchange', coverage: 'Exchange coverage', mark: 'OK', description: 'Bring OKX trades into the same review workspace for crypto performance and behavior checks.' },
  { slug: 'zerodha', name: 'Zerodha', type: 'India broker', coverage: 'Equity workflow', mark: 'ZR', description: 'Organize Zerodha trades with market context, account notes and clean review categories.' },
  { slug: 'angel-one', name: 'Angel One', type: 'India broker', coverage: 'Equity workflow', mark: 'AO', description: 'Review Angel One trading activity alongside other accounts without breaking your workflow.' },
  { slug: 'dhan', name: 'Dhan', type: 'India broker', coverage: 'Equity workflow', mark: 'DN', description: 'Keep Dhan trades visible in broker coverage for account-by-account comparison.' },
  { slug: 'upstox', name: 'Upstox', type: 'India broker', coverage: 'Equity workflow', mark: 'UP', description: 'Use Upstox as another source in the trading review loop with notes and performance context.' },
  { slug: 'ic-markets', name: 'IC Markets', type: 'Forex broker', coverage: 'Forex coverage', mark: 'IC', description: 'Compare IC Markets trading behavior with other forex accounts and session performance.' },
  { slug: 'pepperstone', name: 'Pepperstone', type: 'CFD broker', coverage: 'CFD coverage', mark: 'PP', description: 'Keep Pepperstone trades grouped by broker so execution quality is easier to review.' },
  { slug: 'interactive-brokers', name: 'Interactive Brokers', type: 'Global broker', coverage: 'Multi-asset', mark: 'IB', description: 'Track multi-asset activity from Interactive Brokers with a consistent review structure.' }
];

const getFeatureSectionFromPath = () => {
  const [first, second] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'features' || !second) return null;
  const match = featureSections.find((s) => s.slug === second);
  return match ? match : null;
};

const getDemoSectionFromPath = () => {
  const [first, second] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'demo' || !second) return null;
  const match = [...demoShowcaseSections, ...demoSections].find((s) => s.slug === second);
  return match ? match : null;
};

const getBrokerSectionFromPath = () => {
  const [first, second, third] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'demo' || second !== 'brokers' || !third) return null;
  const match = brokerGalleryItems.find((b) => b.slug === third);
  return match ? match : null;
};

function BrokerDetailPage({ broker }) {
  const brokerFeatures = [broker.coverage, broker.type, 'Broker comparison', 'Journal + analytics context'];

  return (
    <PageShell title="Broker Demo" homeHref="/demo" navLinks={[['/demo', 'Demo'], ['/features/brokers', 'Broker feature']]} ariaLabel="Back to demo">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 flex flex-col gap-10 relative z-10">
        <section className="flex flex-col md:flex-row justify-between items-start gap-8 pb-10 border-b border-white/10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-2">{broker.type}</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{broker.name}</h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed max-w-2xl">{broker.description}</p>
          </div>
          <div className="w-32 h-32 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center p-6 flex-shrink-0">
            {broker.image ? (
              <img className="max-w-full max-h-full object-contain" src={broker.image} alt={`${broker.name} logo`} />
            ) : (
              <strong className="text-2xl font-bold text-white">{broker.mark}</strong>
            )}
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">Broker coverage</h2>
            <div className="flex flex-wrap gap-2">
              {brokerFeatures.map((f) => <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10" key={f}>{f}</span>)}
            </div>
          </article>
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">How it fits in Entrack</h2>
            <ul className="space-y-3 text-sm text-slate-300 list-disc pl-5 leading-relaxed">
              <li>Broker identity stays attached to every trade and review flow.</li>
              <li>Traders can compare behavior across accounts, symbols and markets.</li>
              <li>This page can later hold broker screenshots, connection notes and import steps.</li>
            </ul>
          </article>
        </section>
      </main>
    </PageShell>
  );
}

function DemoDetailPage({ section }) {
  return (
    <PageShell title="Entrack Demo" homeHref="/demo" navLinks={[['/demo', 'Demo'], ['/', 'Landing']]} ariaLabel="Back to demo">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 flex flex-col gap-10 relative z-10">
        <section className="flex flex-col lg:flex-row justify-between items-start gap-8 pb-10 border-b border-white/10">
          <div className="max-w-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-2">{section.eyebrow}</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{section.title}</h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">{section.description}</p>
          </div>
          {section.image ? (
            <div className="w-full lg:max-w-xl rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-2xl">
              <img className="w-full h-auto object-cover" src={section.image} alt={`${section.title} detail preview`} />
            </div>
          ) : null}
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">Feature highlights</h2>
            <div className="flex flex-wrap gap-2">
              {section.features.map((f) => <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10" key={f}>{f}</span>)}
            </div>
          </article>
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">How this page helps</h2>
            <ul className="space-y-3 text-sm text-slate-300 list-disc pl-5 leading-relaxed">
              {section.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </article>
        </section>
      </main>
    </PageShell>
  );
}

function FeatureDetailPage({ section }) {
  return (
    <PageShell navLinks={[['/', 'Landing'], ['/demo', 'Demo']]}>
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 flex flex-col gap-10 relative z-10">
        <section className="flex flex-col lg:flex-row justify-between items-start gap-8 pb-10 border-b border-white/10">
          <div className="max-w-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-2">{section.eyebrow}</div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">{section.title}</h1>
            <p className="mt-4 text-base text-slate-300 leading-relaxed">{section.description}</p>
          </div>
          {section.image ? (
            <div className="w-full lg:max-w-xl rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-2xl">
              <img className="w-full h-auto object-cover" src={section.image} alt={`${section.eyebrow} feature preview`} />
            </div>
          ) : null}
        </section>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">What it includes</h2>
            <div className="flex flex-wrap gap-2">
              {section.points.map((p) => <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10" key={p}>{p}</span>)}
            </div>
          </article>
          <article className="p-6 rounded-3xl border border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-bold text-white mb-4">Why traders use it</h2>
            <ul className="space-y-3 text-sm text-slate-300 list-disc pl-5 leading-relaxed">
              <li>Keep the review process focused on evidence instead of memory.</li>
              <li>Move from raw activity to clean decisions and repeatable habits.</li>
              <li>Connect this feature with the rest of the Entrack workflow.</li>
            </ul>
          </article>
        </section>
      </main>
    </PageShell>
  );
}

function DemoPage() {
  const navigate = useNavigate();
  const detailSection = getDemoSectionFromPath();
  const brokerSection = getBrokerSectionFromPath();
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [activeBrokerIndex, setActiveBrokerIndex] = useState(0);
  const hoverShellRef = useRef(null);
  const hoverCardRefs = useRef([]);
  const [hoverBg, setHoverBg] = useState({ visible: false, x: 0, y: 0, width: 0, height: 0 });
  const activeDemo = demoSections[activeDemoIndex];
  const goToDemo = (index) => setActiveDemoIndex((index + demoSections.length) % demoSections.length);
  const goToBroker = (index) => setActiveBrokerIndex((index + brokerGalleryItems.length) % brokerGalleryItems.length);

  const moveHoverBg = useCallback((index) => {
    const shell = hoverShellRef.current;
    const card = hoverCardRefs.current[index];
    if (!shell || !card) return;
    const shellRect = shell.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    setHoverBg({
      visible: true,
      x: cardRect.left - shellRect.left,
      y: cardRect.top - shellRect.top,
      width: cardRect.width,
      height: cardRect.height
    });
  }, []);

  useEffect(() => {
    const handleResize = () => moveHoverBg(activeDemoIndex);
    window.addEventListener('resize', handleResize);
    const frameId = window.requestAnimationFrame(() => moveHoverBg(activeDemoIndex));
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeDemoIndex, moveHoverBg]);

  if (detailSection) return <DemoDetailPage section={detailSection} />;
  if (brokerSection) return <BrokerDetailPage broker={brokerSection} />;

  return (
    <PageShell navLinks={[['/', 'Landing'], ['/documentation/journal', 'Documentation']]} ariaLabel="Demo navigation">
      <main className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 flex flex-col gap-12 relative z-10">
        <section className="max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-2">Product demo</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">See how Entrack pages fit together.</h1>
        </section>
        <section className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin" aria-label="Demo screenshots">
          {demoShowcaseSections.map((s) => (
            <article className="flex-none w-[340px] sm:w-[420px] rounded-2xl border border-white/10 bg-[#09090b] overflow-hidden flex flex-col shadow-xl hover:border-white/20 transition-all" key={s.title}>
              <a className="flex flex-col h-full" href={`/demo/${s.slug}`}>
                <div className="w-full h-52 overflow-hidden bg-[#04060b]">
                  {s.image ? <img className="w-full h-full object-cover object-top" src={s.image} alt={`${s.title} preview`} loading="lazy" /> : null}
                </div>
                <div className="p-6 flex flex-col gap-2 flex-grow">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2E90FA]">{s.eyebrow}</span>
                  <h2 className="text-xl font-bold text-white tracking-tight">{s.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">{s.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {s.features.map((f) => <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300" key={f}>{f}</div>)}
                  </div>
                </div>
              </a>
            </article>
          ))}
        </section>
        <section className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 overflow-hidden" ref={hoverShellRef} aria-label="Interactive demo screenshots">
          <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
            {activeDemo.image ? <img className="w-full h-full object-cover" src={activeDemo.image} alt="" /> : null}
          </div>
          <div className={`absolute pointer-events-none rounded-2xl border border-[#2E90FA]/40 bg-[#2E90FA]/10 transition-all duration-300 ${hoverBg.visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" style={{ width: `${hoverBg.width}px`, height: `${hoverBg.height}px`, transform: `translate3d(${hoverBg.x}px, ${hoverBg.y}px, 0)` }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {demoSections.map((s, index) => (
              <button
                className={`p-5 rounded-2xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${index === activeDemoIndex ? 'border-[#2E90FA]/50 bg-white/[0.08]' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                type="button"
                key={s.title}
                ref={(el) => { hoverCardRefs.current[index] = el; }}
                onClick={() => navigate(`/demo/${s.slug}`)}
                onMouseEnter={() => { goToDemo(index); moveHoverBg(index); }}
                onFocus={() => { goToDemo(index); moveHoverBg(index); }}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <small className="uppercase tracking-wider text-[#2E90FA]">{s.eyebrow}</small>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{s.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{s.description}</p>
                <div className="w-full h-28 rounded-xl overflow-hidden bg-black/40 mt-2 border border-white/10">
                  {s.image ? <img className="w-full h-full object-cover" src={s.image} alt={`${s.title} preview`} loading="lazy" /> : null}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.features.slice(0, 2).map((f) => <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300" key={f}>{f}</span>)}
                </div>
              </button>
            ))}
          </div>
        </section>
        <section
          className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] flex flex-col md:flex-row justify-between items-start gap-8"
          aria-label="Broker gallery demo"
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (Math.abs(event.deltaY) < 16) return;
            goToBroker(activeBrokerIndex + (event.deltaY > 0 ? 1 : -1));
          }}
        >
          <div className="max-w-md">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2E90FA] block mb-2">{String(activeBrokerIndex + 1).padStart(2, '0')} / Broker coverage</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">{brokerGalleryItems[activeBrokerIndex].name}</h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">{brokerGalleryItems[activeBrokerIndex].description}</p>
            <div className="grid grid-cols-2 gap-3 mt-6 p-4 rounded-2xl border border-white/10 bg-white/[0.03] text-xs">
              <span className="text-slate-400">Type</span>
              <strong className="text-white text-right">{brokerGalleryItems[activeBrokerIndex].type}</strong>
              <span className="text-slate-400">Status</span>
              <strong className="text-emerald-400 text-right">{brokerGalleryItems[activeBrokerIndex].coverage}</strong>
              <span className="text-slate-400">Workspace</span>
              <strong className="text-white text-right">Journal + analytics</strong>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 max-w-xl" aria-label="Broker cards">
            {brokerGalleryItems.map((b, index) => (
              <button
                type="button"
                className={`px-4 py-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${index === activeBrokerIndex ? 'border-[#2E90FA] bg-[#2E90FA]/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}
                key={b.name}
                onClick={() => navigate(`/demo/brokers/${b.slug}`)}
                onMouseEnter={() => goToBroker(index)}
                onFocus={() => goToBroker(index)}
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center p-1">
                  {b.image ? <img className="max-w-full max-h-full object-contain" src={b.image} alt={`${b.name} preview`} /> : <strong className="text-xs">{b.mark}</strong>}
                </div>
                <span className="text-sm font-semibold">{b.name}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isDocumentationPage = normalizedPath.startsWith('/documentation');
  const isAnalyticsGuidePage = normalizedPath === '/analytics' || normalizedPath.startsWith('/analytics/');
  const legalDocument = normalizedPath === '/privacy' ? legalDocuments.privacy : normalizedPath === '/terms' ? legalDocuments.terms : null;
  const isDemoPage = normalizedPath === '/demo' || normalizedPath.startsWith('/demo/');
  const featureSection = getFeatureSectionFromPath();

  const handleViewDemo = () => navigate('/demo');

  const handleInternalNavigation = useCallback((event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (anchor.target && anchor.target !== '_self') return;
    const href = anchor.getAttribute('href');
    if (!href?.startsWith('/')) return;
    const destination = new URL(anchor.href, window.location.origin);
    if (destination.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(`${destination.pathname}${destination.search}${destination.hash}`);
  }, [navigate]);

  return (
    <div className="w-full min-h-screen" onClick={handleInternalNavigation}>
      {featureSection ? (
        <FeatureDetailPage section={featureSection} />
      ) : isAnalyticsGuidePage ? (
        <AnalyticsGuidePage />
      ) : isDemoPage ? (
        <DemoPage />
      ) : isDocumentationPage ? (
        <DocumentationPage />
      ) : legalDocument ? (
        <LegalPage document={legalDocument} />
      ) : (
        <LandingHome
          onLogin={() => navigate('/login')}
          onSignUp={() => navigate('/signup')}
          onStartTracking={() => navigate('/login')}
          onGetStarted={() => navigate('/login')}
          onViewDemo={handleViewDemo}
        />
      )}
    </div>
  );
}

export default LandingPage;
