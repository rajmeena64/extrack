import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { legalDocuments } from './legalDocuments';
import LandingHome from './LandingHome';
import './LandingPage.css';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));

const documentationSections = [
  ['dashboard', 'Dashboard', 'Overview', 'See account health and trading performance at a glance.'],
  ['add-trade', 'Add Trade', 'Trade Entry', 'Create clean trade records manually, from files, or from supported import flows.'],
  ['journal', 'Trade Journal', 'Journal', 'Document every trade with context, screenshots, notes and review tags.'],
  ['trade-detail', 'Trade Detail', 'Trade View', 'Open one trade deeply and inspect the full decision from entry to exit.'],
  ['day-review', 'Day Review', 'Daily Review', 'Turn a trading day into one clear lesson before the next session.'],
  ['analytics', 'Performance Analytics', 'Analytics', 'Turn trading history into patterns, weaknesses and improvement decisions.'],
  ['replay', 'Replay And Backtest', 'Replay', 'Practice historical market decisions before risking live capital.'],
  ['broker-connection', 'Broker Connection', 'Connections', 'Understand supported sync and import flows without exposing private secrets.'],
  ['brokers', 'Broker Coverage', 'Brokers', 'Compare brokers, accounts, exchanges and markets cleanly.'],
  ['economic-calendar', 'Economic Calendar', 'Calendar', 'Plan around scheduled market-moving events and session risk.'],
  ['news', 'Market News', 'News', 'Use market headlines as trading context, not emotional noise.'],
  ['settings-profile', 'Settings And Profile', 'Account', 'Manage preferences, profile details and display choices safely.'],
  ['privacy-security', 'Privacy And Security', 'Safety', 'Keep sensitive trading and account information protected across the workflow.'],
].map(([slug, label, eyebrow, title]) => ({
  id: `docs-${slug}`,
  slug,
  label,
  eyebrow,
  title,
  intro: `${label} documentation explains what the feature is for, when a trader should use it, and how it connects with the rest of the Entrack review workflow.`,
  points: [
    `Use ${label} to keep the trading workflow organized and repeatable.`,
    'Review only the information needed for decisions and learning.',
    'Connect this module with journal notes, analytics and daily review where relevant.',
    'Keep the interface focused so the trader can scan quickly and act deliberately.',
  ],
  workflow: `${label} should be used as part of a calm review process: open the page, check the relevant records, write or inspect context, then move to the next action with a clear reason.`,
  deepDive: [
    `${label} is part of the larger trading review system rather than a standalone decorative page.`,
    `The purpose of this page is to make ${eyebrow.toLowerCase()} easier to understand during real trading routines.`,
    'A trader should be able to open it and know what action is expected next.',
    'The page should support review, preparation, correction and repeatable decision-making.',
    'Important information should be structured in sections instead of being scattered across the app.',
    'The design should stay calm because traders often review performance after stressful sessions.',
    'The content should help users understand what the feature does without exposing private account data.',
    'The feature should connect back to trade records whenever the user needs evidence.',
    'It should also connect to analytics when the user wants to move from one example to a broader pattern.',
    'If the user is reviewing mistakes, the page should help name the mistake clearly.',
    'If the user is reviewing strengths, the page should help identify what should be repeated.',
    'Good documentation should explain the purpose, the inputs, the outputs and the review habit.',
    'Inputs are the records, filters, notes or labels the user provides.',
    'Outputs are the insights, summaries or next actions the user gets back.',
    'The review habit is the repeatable routine that makes the feature valuable over time.',
    'The module should avoid unnecessary complexity and keep the main workflow obvious.',
    'A new user should understand the page without needing private support messages.',
    'An experienced user should be able to scan the page and move quickly.',
    'The documentation should make clear that Entrack helps review trading behavior, not guarantee profits.',
    'Past performance should be treated as learning material rather than a promise of future results.',
    'The page should never ask users to paste passwords, recovery codes, API secrets or private keys into normal notes.',
    'Sensitive connection details should be handled only by secure product flows, not by documentation examples.',
    'User-facing examples should use generic sample data and avoid real personal information.',
    'When a module depends on imported data, users should still verify that records are mapped correctly.',
    'When a module depends on manual notes, users should write concise, honest and consistent context.',
    'The strongest workflow is simple: capture data, review behavior, find the pattern and decide one improvement.',
    'This page should make that workflow easier to repeat.',
    'It should also help users understand how the module supports dashboard summaries and deeper review pages.',
    'If something looks wrong, the user should know which module to inspect next.',
    'If something looks useful, the user should know how to save that lesson for the next session.',
  ],
  privacy: 'Privacy note: keep passwords, API keys, access tokens, recovery phrases, broker secrets and personal identity documents out of notes, examples and visible documentation.',
}));

const analyticsGuideSections = [
  {
    slug: 'overview',
    label: 'Analytics Overview',
    eyebrow: 'Start Here',
    title: 'All trading analytics in one improvement system.',
    intro: 'The Analytics page explains what each Entrack analytics tool does, how it reads your trading data, and how a trader can use the result to improve decisions without guessing.',
    works: [
      'It connects dashboard stats, radar scores, calendar behavior, day review, charts, heatmaps, AI review and replay into one learning flow.',
      'Each tool starts from your own trades, notes, timestamps, symbols, P&L and review habits.',
      'The goal is not to promise profit. The goal is to make repeated behavior visible so you can fix one thing at a time.',
    ],
    improves: [
      'See where your edge is strong before increasing size.',
      'Find weak sessions, symbols, weekdays, exits or risk habits before they become expensive.',
      'Turn scattered trades into a clear review routine: capture, measure, inspect, decide, practice.',
    ],
    features: ['Feature sidebar', 'Deep tool pages', 'Trader-focused explanations', 'Improvement workflow'],
  },
  {
    slug: 'dashboard',
    label: 'Dashboard',
    eyebrow: 'Performance Base',
    title: 'Dashboard shows account health before deep analysis.',
    intro: 'Dashboard is the first analytics layer. It gives you a clean view of P&L, win rate, trading activity, currency-adjusted performance and recent account movement.',
    works: [
      'It reads your filtered trade history and converts it into summary cards, lists and visual panels.',
      'Date range and currency filters help you compare periods without mixing old and new behavior.',
      'Dashboard is the place to notice what needs deeper review, then jump into calendar, radar, day review or analytics.',
    ],
    improves: [
      'You stop judging performance from one emotional trade.',
      'You can compare periods and ask better questions, such as whether the month is profitable because of quality or just one oversized winner.',
      'You quickly see if risk, activity or consistency is drifting.',
    ],
    features: ['P&L summary', 'Win rate scan', 'Currency-aware stats', 'Date filtering', 'Trade mode filtering'],
  },
  {
    slug: 'radar',
    label: 'Radar Score',
    eyebrow: 'Quality Score',
    title: 'Radar turns trading quality into one readable score.',
    intro: 'Radar scores your trading across win rate, profit factor, average win/loss, recovery, drawdown control and consistency.',
    works: [
      'It uses closed trades and normalizes each metric from 0 to 100.',
      'The radar shape shows whether your results are balanced or dependent on one strong area.',
      'The overall grade helps you understand if the account is excellent, good, average or needs work.',
    ],
    improves: [
      'You can see the exact weak side of your trading instead of saying "I am inconsistent" vaguely.',
      'If win rate is fine but average win/loss is weak, you know exits need work.',
      'If drawdown score is poor, you know risk control needs attention before strategy changes.',
    ],
    features: ['Overall score', 'Profit factor', 'Average win/loss', 'Recovery factor', 'Drawdown control', 'Consistency'],
  },
  {
    slug: 'progress-tracker',
    label: 'Progress Tracker',
    eyebrow: 'Consistency',
    title: 'Progress Tracker shows how regularly you are building data.',
    intro: 'Progress Tracker is a weekly activity heatmap. It shows when you traded and how consistently records are coming into the journal.',
    works: [
      'It groups trades by weekday and week, then shades the grid by trading activity.',
      'Month markers help you understand how activity changes over time.',
      'It is useful even before advanced statistics become meaningful because consistency starts with data capture.',
    ],
    improves: [
      'You can detect overtrading clusters and missing review days.',
      'You can confirm whether improvement came from a repeatable process or just random activity.',
      'It encourages a steady review habit instead of a burst of journaling after losses.',
    ],
    features: ['Weekly heatmap', 'Weekday rows', 'Month markers', 'Activity intensity', 'Consistency signal'],
  },
  {
    slug: 'calendar',
    label: 'P&L Calendar',
    eyebrow: 'Daily Pattern',
    title: 'P&L Calendar makes every trading day visible.',
    intro: 'The calendar shows daily P&L, trade count, win rate, breakeven days and weekly summaries, so daily behavior is easy to inspect.',
    works: [
      'Each day cell summarizes trades from that calendar date.',
      'Positive, negative, flat and breakeven days use separate visual states.',
      'Clicking a trading day opens the specific Day Review for that date.',
    ],
    improves: [
      'You can find which weekdays repeatedly hurt performance.',
      'You can spot streaks, revenge-trading days or breakeven survival days.',
      'You can plan future sessions around days that historically deserve more caution.',
    ],
    features: ['Daily P&L', 'Trade count', 'Win rate', 'Breakeven marking', 'Weekly cards', 'Calendar image export'],
  },
  {
    slug: 'day-review',
    label: 'Day Review',
    eyebrow: 'Daily Lesson',
    title: 'Day Review turns one session into a clear lesson.',
    intro: 'Day Review explains a single trading day with stats, intraday P&L curve, largest winner, largest loser, checklist, symbol breakdown and session breakdown.',
    works: [
      'It filters trades to one date and calculates net P&L, win rate, profit factor, drawdown and streaks.',
      'It highlights the best and worst trades so review starts with the decisions that mattered most.',
      'It separates symbol and session results to show where the day was won or lost.',
    ],
    improves: [
      'You finish the day with one lesson instead of a vague feeling.',
      'You can identify if the damage came from a symbol, session, streak or payout problem.',
      'You can build a next-session focus before repeating the same mistake.',
    ],
    features: ['Intraday curve', 'Largest winner', 'Largest loser', 'Daily checklist', 'Symbol breakdown', 'Session breakdown'],
  },
  {
    slug: 'ai-analysis',
    label: 'AI Analysis',
    eyebrow: 'Review Assistant',
    title: 'AI Analysis summarizes behavior into review prompts.',
    intro: 'AI Analysis uses your trade history and selected currency context to produce a readable review of strengths, weaknesses and next actions.',
    works: [
      'It receives structured trade data and turns it into plain-language feedback.',
      'It is strongest when trade records include notes, strategy labels and clean timestamps.',
      'It should be treated as a review assistant, not as financial advice.',
    ],
    improves: [
      'You get a faster draft of what to review after a busy session.',
      'You can catch repeated mistakes that are hard to notice manually.',
      'You can turn the AI output into one practical rule for the next trading day.',
    ],
    features: ['Behavior summary', 'Mistake detection', 'Improvement prompts', 'Currency context', 'Human review required'],
  },
  {
    slug: 'specific-day-chart',
    label: 'Specific Day Chart',
    eyebrow: 'Trade Context',
    title: 'Specific Day Chart shows what happened around a trade.',
    intro: 'The charting view loads historical candles for the selected symbol and date, then marks entries and exits so the trade can be reviewed visually.',
    works: [
      'It fetches market candles for the symbol, timeframe and selected date.',
      'It places entry and exit markers on the candle chart when trade timing is available.',
      'It supports multiple timeframes so you can review execution context at different levels.',
    ],
    improves: [
      'You can see if the entry was late, early or against market structure.',
      'You can compare exits against the move that followed instead of relying on memory.',
      'You can turn screenshots and chart evidence into better rules.',
    ],
    features: ['Candlestick chart', 'Entry markers', 'Exit markers', '1m/5m/15m/1h views', 'Full-day context'],
  },
  {
    slug: 'charting-analytics',
    label: 'Charting Analytics',
    eyebrow: 'Equity Curve',
    title: 'Charting Analytics reveals the shape of performance.',
    intro: 'Charting analytics covers performance curves and visual breakdowns that show how P&L changes across trades, days or selected periods.',
    works: [
      'It converts trade results into cumulative movement so trend, chop and drawdown are easier to see.',
      'It helps compare whether gains are smooth, lumpy, fragile or recovering after losses.',
      'It supports the Day Review and dashboard by turning raw numbers into a visible path.',
    ],
    improves: [
      'You can identify whether the account is growing steadily or relying on rare spikes.',
      'You can see when a losing streak begins instead of noticing too late.',
      'You can adjust risk when the curve shows instability.',
    ],
    features: ['Cumulative P&L', 'Intraday curve', 'Period comparison', 'Drawdown visibility', 'Performance trend'],
  },
  {
    slug: 'heatmap',
    label: 'Heatmap',
    eyebrow: 'Behavior Map',
    title: 'Heatmap helps find repeated performance patterns.',
    intro: 'The heatmap analytics view is for spotting where results cluster across time, sessions, symbols or trading behavior.',
    works: [
      'It groups trading outcomes into visual blocks so heavy profit and loss areas stand out quickly.',
      'It is useful when table rows are too slow to scan.',
      'It turns repeated behavior into something visible enough to act on.',
    ],
    improves: [
      'You can stop trading low-quality time windows that repeatedly produce losses.',
      'You can focus practice on setups or sessions where your edge is actually visible.',
      'You can compare behavior before and after a rule change.',
    ],
    features: ['Pattern scanning', 'Loss clusters', 'Profit clusters', 'Session review', 'Symbol behavior'],
  },
  {
    slug: 'replay-backtesting',
    label: 'Replay & Backtesting',
    eyebrow: 'Practice',
    title: 'Replay lets you practice the lesson before live trading.',
    intro: 'Replay and backtesting help traders test entries, exits and risk rules on historical candles without risking live capital.',
    works: [
      'It replays candle movement and lets the trader make decisions as the market unfolds.',
      'Virtual execution turns rules into practice instead of theory.',
      'Backtest stats can be compared with journal analytics to see whether live behavior matches the plan.',
    ],
    improves: [
      'You can practice the exact mistake found in Day Review or Radar.',
      'You can build confidence in a rule before increasing live risk.',
      'You can separate strategy weakness from execution weakness.',
    ],
    features: ['Historical candles', 'Virtual orders', 'Playback controls', 'Risk calculator', 'Practice loop'],
  },
  {
    slug: 'broker-session-insights',
    label: 'Broker & Session Insights',
    eyebrow: 'Source Quality',
    title: 'Broker and session insights show where performance comes from.',
    intro: 'Broker and session analytics help compare trading results across accounts, platforms, markets and trading sessions.',
    works: [
      'Broker identity, symbol category and session timing stay attached to each trade where available.',
      'Breakdowns reveal whether performance changes by source, market or time window.',
      'This helps the trader review environment quality, not just individual decisions.',
    ],
    improves: [
      'You can focus capital and attention where execution is cleaner.',
      'You can reduce activity in sessions that repeatedly create poor decisions.',
      'You can compare manual and imported trades without losing context.',
    ],
    features: ['Broker context', 'Session breakdown', 'Symbol categories', 'Manual/API trade separation', 'Source comparison'],
  },
];

const analyticsFeatureVisuals = {
  overview: {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=85',
    imageAlt: 'Trading analytics dashboard with performance charts',
    definition: 'Entrack Analytics is the full review layer of the product. It collects your trading records, turns them into performance signals, and helps you decide what to improve next.',
    bestFor: 'Use this when you want a complete view of your trading behavior instead of checking one isolated stat.',
    input: 'Trades, P&L, dates, symbols, sessions, notes and account context.',
    output: 'A clear map of strengths, leaks, review pages and practice areas.',
    signals: ['Whether your review system has enough data', 'Which analytics page should be opened first', 'Which part of trading needs the next decision'],
    mistakes: ['Jumping between tools without a review order', 'Reacting to one trade instead of reading the full record', 'Ignoring missing notes or incomplete trade data'],
    routine: ['Start with the overview', 'Choose the weakest visible area', 'Open that dedicated analytics page', 'Write one action for the next session'],
  },
  dashboard: {
    image: 'https://images.unsplash.com/photo-1642790551116-18e150f248e8?w=1400&q=85',
    imageAlt: 'Performance dashboard on a trading workspace',
    definition: 'Dashboard is the quick health check of your trading account. It tells you whether the current period is stable, risky, improving or drifting.',
    bestFor: 'Use it at the start of review before opening deeper tools.',
    input: 'Filtered trades, account currency, date range and trade source.',
    output: 'P&L, win rate, trade activity, account overview and links to deeper review.',
    signals: ['Account direction for the selected period', 'Whether trade volume is normal or excessive', 'Whether recent P&L matches the quality of decisions'],
    mistakes: ['Judging the week from one large winner', 'Missing a drop in account health', 'Comparing periods without the same date or currency filters'],
    routine: ['Set the date range', 'Check P&L and win rate together', 'Look for unusual trade count', 'Open the tool that explains the weakest number'],
  },
  radar: {
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&q=85',
    imageAlt: 'Analyst reviewing score charts and performance metrics',
    definition: 'Radar Score compresses multiple performance qualities into one shape. It shows if your trading is balanced or if one weak metric is damaging the whole system.',
    bestFor: 'Use it when results feel confusing and you need to know which metric needs attention first.',
    input: 'Closed trades, wins, losses, gross profit, gross loss and equity movement.',
    output: 'A 0-100 score across win rate, profit factor, average win/loss, recovery, drawdown and consistency.',
    signals: ['Whether the strategy is balanced or one-sided', 'If exits are weaker than entries', 'If drawdown control is damaging an otherwise good system'],
    mistakes: ['Only watching win rate', 'Ignoring average loss size', 'Thinking profit factor is good while recovery is poor'],
    routine: ['Read the lowest radar spoke', 'Compare it with the overall score', 'Open trades connected to that weakness', 'Adjust one rule before the next live session'],
  },
  'progress-tracker': {
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1400&q=85',
    imageAlt: 'Weekly planning wall showing consistent activity',
    definition: 'Progress Tracker is a consistency map. It shows whether you are building enough clean trading data to actually learn from your journal.',
    bestFor: 'Use it to catch overtrading clusters, missing review days and inconsistent journaling.',
    input: 'Trade timestamps grouped by day and week.',
    output: 'A weekly activity heatmap showing trading rhythm and data consistency.',
    signals: ['Days with unusually heavy activity', 'Weeks where journaling stopped', 'Whether trading is consistent enough to measure'],
    mistakes: ['Trading intensely after losses', 'Skipping records on difficult days', 'Believing a strategy changed when only activity changed'],
    routine: ['Scan the densest blocks', 'Mark missing review days', 'Compare activity with P&L calendar', 'Set a weekly journaling target'],
  },
  calendar: {
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1400&q=85',
    imageAlt: 'Calendar planning board for daily trading review',
    definition: 'P&L Calendar turns every trading day into a visible result block. It makes daily performance patterns easy to scan.',
    bestFor: 'Use it to find red-day patterns, weekly behavior and days that need a deeper Day Review.',
    input: 'Daily trades, P&L, win count, notes and breakeven marking.',
    output: 'Daily P&L cells, weekly totals, trading-day count and direct day-review access.',
    signals: ['Repeated red weekdays', 'Weeks saved by one day or damaged by one day', 'Breakeven days where risk control mattered'],
    mistakes: ['Repeating the same bad weekday behavior', 'Ignoring small daily losses that stack up', 'Treating every red day as the same problem'],
    routine: ['Open the current month', 'Find the strongest and weakest day cells', 'Open Day Review for the worst day', 'Set a rule for that weekday or session'],
  },
  'day-review': {
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1400&q=85',
    imageAlt: 'Desk setup for reviewing a trading day with notes',
    definition: 'Day Review is the post-session breakdown. It explains what happened on one specific date and turns it into one practical lesson.',
    bestFor: 'Use it after every active session, especially after emotional wins or losses.',
    input: 'All trades from one date, session time, symbols, P&L and notes.',
    output: 'Net P&L, intraday curve, largest winner, largest loser, checklist, session and symbol breakdown.',
    signals: ['Where the session turned', 'Which trade controlled the day', 'Whether the day was a strategy issue or behavior issue'],
    mistakes: ['Carrying emotion into the next session', 'Ignoring the largest loser', 'Calling a profitable day good when execution was poor'],
    routine: ['Open the exact date', 'Read the intraday curve', 'Compare largest winner and loser', 'Write the next-session lesson'],
  },
  'specific-day-chart': {
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&q=85',
    imageAlt: 'Candlestick chart for trade timing analysis',
    definition: 'Specific Day Chart brings candle context into trade review. It shows where entries and exits happened on the actual market move.',
    bestFor: 'Use it when you need to review execution quality, entry timing and exit discipline.',
    input: 'Symbol, trade date, timeframe, entry price, exit price and timestamps.',
    output: 'A candle chart with trade markers and full-day context.',
    signals: ['Entry timing against market structure', 'Exit quality after the trade', 'Whether the trade followed the setup or chased price'],
    mistakes: ['Entering after the move is already extended', 'Exiting before the planned target without evidence', 'Reviewing trades without chart context'],
    routine: ['Select the trade date', 'Check the entry marker', 'Switch timeframes', 'Compare exit marker with the move that followed'],
  },
  'charting-analytics': {
    image: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1400&q=85',
    imageAlt: 'Financial chart analytics displayed on screens',
    definition: 'Charting Analytics shows the shape of performance. It helps you see whether your account is climbing steadily or surviving through random spikes.',
    bestFor: 'Use it to understand equity curve quality, drawdown periods and recovery behavior.',
    input: 'Trade-by-trade or day-by-day P&L sequence.',
    output: 'Cumulative P&L curve, drawdown visibility and trend quality.',
    signals: ['Smooth growth versus spike-based growth', 'Where drawdown starts and ends', 'Whether recovery is strong or fragile'],
    mistakes: ['Increasing size during unstable curves', 'Ignoring a flattening equity line', 'Treating one profit spike as a stable edge'],
    routine: ['Read the curve direction', 'Mark the largest drawdown zone', 'Inspect trades inside that zone', 'Reduce or refine risk if the curve is unstable'],
  },
  heatmap: {
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=85',
    imageAlt: 'Data heatmap and analytics screen',
    definition: 'Heatmap makes repeated behavior visible. Instead of reading tables, you scan blocks and instantly see where profit or damage clusters.',
    bestFor: 'Use it when you want to identify weak sessions, symbols, weekdays or behavior zones quickly.',
    input: 'Grouped trade results across time, symbols, sessions or categories.',
    output: 'Visual clusters of strong and weak performance areas.',
    signals: ['Profit clusters worth repeating', 'Loss clusters that need rules', 'Categories that look fine in tables but weak visually'],
    mistakes: ['Missing patterns hidden in rows', 'Trading a weak symbol because a few trades looked good', 'Ignoring repeated low-quality sessions'],
    routine: ['Pick the heatmap grouping', 'Find the darkest weak cluster', 'Open trades from that cluster', 'Create an avoid-or-reduce rule'],
  },
  'ai-analysis': {
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&q=85',
    imageAlt: 'AI analytics interface for structured review',
    definition: 'AI Analysis converts trade data into plain-language feedback. It acts like a review assistant that summarizes repeated patterns.',
    bestFor: 'Use it when you want a fast review draft after a busy session or week.',
    input: 'Trades, notes, strategy labels, P&L, dates and selected currency context.',
    output: 'Strengths, weaknesses, repeated mistakes and next-action prompts.',
    signals: ['Repeated mistakes across many trades', 'Missing context in notes', 'Behavior themes that are hard to spot manually'],
    mistakes: ['Using AI output without checking the trades', 'Expecting predictions instead of review', 'Feeding incomplete notes and trusting the summary blindly'],
    routine: ['Select the trade period', 'Generate the analysis', 'Verify the claim against actual trades', 'Keep only one action item'],
  },
  'replay-backtesting': {
    image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1400&q=85',
    imageAlt: 'Trader practicing with historical chart replay',
    definition: 'Replay and Backtesting let you practice your rule before using live money. It converts lessons into reps.',
    bestFor: 'Use it after analytics identifies a mistake you need to train out.',
    input: 'Historical candles, strategy rules, virtual orders and risk settings.',
    output: 'Practice trades, replay stats and confidence in execution rules.',
    signals: ['Whether a rule works before live execution', 'How often you break the plan under replay', 'Where entries or exits fail repeatedly'],
    mistakes: ['Changing live strategy without practice', 'Trusting memory instead of replay evidence', 'Skipping execution reps after finding a weakness'],
    routine: ['Choose the weakness from analytics', 'Replay similar market conditions', 'Place virtual trades by rule', 'Compare replay behavior with live journal behavior'],
  },
  'broker-session-insights': {
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1400&q=85',
    imageAlt: 'Trading workstation comparing market sources and sessions',
    definition: 'Broker and Session Insights show where performance actually comes from: account, broker, market, symbol or time window.',
    bestFor: 'Use it when one broker, session or source feels different but you need proof from data.',
    input: 'Broker/account source, trade mode, symbol category, session timing and P&L.',
    output: 'Source comparison, session quality and where your edge performs best.',
    signals: ['Which account source performs best', 'Which session creates the cleanest trades', 'Whether manual and imported trades behave differently'],
    mistakes: ['Blaming the market when one source is the issue', 'Mixing broker data without context', 'Trading the same size in weak sessions'],
    routine: ['Separate results by source', 'Compare session performance', 'Check symbols inside weak sources', 'Move focus toward the cleanest source-session pair'],
  },
};

function DocumentationPage() {
  const requestedSlug = window.location.pathname.split('/').filter(Boolean)[1] || 'journal';
  const activeSection = documentationSections.find((section) => section.slug === requestedSlug) || documentationSections[0];

  return (
    <div className="entrack-landing docs-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack</span>
        </a>
        <nav className="docs-header-links" aria-label="Documentation navigation">
          <a href="/">Landing</a>
          <a href={`/documentation/${activeSection.slug}`}>Documentation</a>
        </nav>
      </header>

      <main className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-title">Documentation</div>
          {documentationSections.map((section) => (
            <a
              key={section.id}
              className={section.slug === activeSection.slug ? 'is-active' : ''}
              href={`/documentation/${section.slug}`}
            >
              <span>{section.eyebrow}</span>
              {section.label}
            </a>
          ))}
        </aside>

        <article className="docs-content">
          <div className="docs-hero">
            <div className="section-kicker">Entrack Docs</div>
            <h1>{activeSection.label} documentation.</h1>
            <p>
              Each sidebar item opens its own documentation page, so the content stays focused
              on the workflow you selected.
            </p>
          </div>

          <section className="docs-detail-section" id={activeSection.id}>
            <div className="docs-section-eyebrow">{activeSection.eyebrow}</div>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.intro}</p>
            <div className="docs-detail-grid">
              <div>
                <h3>What to track</h3>
                <ul>
                  {activeSection.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>How to use it</h3>
                <p>{activeSection.workflow}</p>
              </div>
            </div>
            <div className="docs-deep-dive">
              <h3>Detailed explanation</h3>
              <ol>
                {activeSection.deepDive.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
            <div className="docs-privacy-note">
              <strong>Privacy and sensitive data</strong>
              <p>{activeSection.privacy}</p>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function AnalyticsGuidePage() {
  const requestedSlug = window.location.pathname.split('/').filter(Boolean)[1] || 'overview';
  const activeSection = analyticsGuideSections.find((section) => section.slug === requestedSlug) || analyticsGuideSections[0];
  const activeIndex = Math.max(0, analyticsGuideSections.findIndex((section) => section.slug === activeSection.slug));
  const visual = analyticsFeatureVisuals[activeSection.slug] || analyticsFeatureVisuals.overview;

  return (
    <div className="entrack-landing analytics-guide-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="analytics-guide-topbar">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack</span>
        </a>
        <nav className="analytics-guide-toplinks" aria-label="Analytics navigation">
          <a href="/">Home</a>
          <a href="/demo">Demo</a>
          <a href="/documentation/analytics">Reference</a>
        </nav>
      </header>

      <main className="analytics-guide-shell">
        <aside className="analytics-tool-rail" aria-label="Analytics feature list">
          <div className="analytics-tool-rail__title">
            <span>Analytics Menu</span>
            <strong>{String(activeIndex + 1).padStart(2, '0')}</strong>
          </div>
          {analyticsGuideSections.map((section) => (
            <a
              key={section.slug}
              className={`analytics-tool-link ${section.slug === activeSection.slug ? 'is-active' : ''}`}
              href={`/analytics/${section.slug}`}
            >
              <small>{section.eyebrow}</small>
              <span>{section.label}</span>
            </a>
          ))}
        </aside>

        <article className="analytics-guide-workspace">
          <section className="analytics-product-hero">
            <div className="analytics-product-copy">
              <span className="analytics-product-kicker">Trading analytics system</span>
              <h1>{activeSection.title}</h1>
              <p>{activeSection.intro}</p>
              <div className="analytics-feature-strip" aria-label="Selected analytics features">
                {activeSection.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="analytics-image-band">
            <figure className="analytics-feature-visual">
              <img src={visual.image} alt={visual.imageAlt} />
              <figcaption>
                <span>{activeSection.eyebrow}</span>
                <strong>{activeSection.label}</strong>
              </figcaption>
            </figure>
          </section>

          <section className="analytics-definition-section">
            <div className="analytics-definition-copy">
              <span>Feature definition</span>
              <h2>What is {activeSection.label}?</h2>
              <p>{visual.definition}</p>
            </div>

            <div className="analytics-definition-cards">
              <article>
                <span>Best used for</span>
                <p>{visual.bestFor}</p>
              </article>
              <article>
                <span>Input data</span>
                <p>{visual.input}</p>
              </article>
              <article>
                <span>Output insight</span>
                <p>{visual.output}</p>
              </article>
            </div>
          </section>

          <section className="analytics-explain-grid">
            <div className="analytics-explain-panel">
              <span>Feature mechanics</span>
              <h2>How {activeSection.label} works</h2>
              <ul>
                {activeSection.works.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="analytics-explain-panel analytics-explain-panel--improve">
              <span>Trading improvement</span>
              <h2>Why {activeSection.label} matters</h2>
              <ul>
                {activeSection.improves.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="analytics-specific-grid">
            <div className="analytics-specific-panel">
              <span>Signals to watch</span>
              <ul>
                {visual.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>

            <div className="analytics-specific-panel">
              <span>Mistakes this catches</span>
              <ul>
                {visual.mistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>

            <div className="analytics-specific-panel analytics-specific-panel--routine">
              <span>Review routine for this page</span>
              <ol>
                {visual.routine.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function LegalPage({ document }) {
  return (
    <div className="entrack-landing docs-page legal-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack</span>
        </a>
        <nav className="docs-header-links" aria-label="Legal navigation">
          <a href="/">Landing</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </header>

      <main className="docs-layout legal-layout">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-title">Legal</div>
          <a className={document.slug === 'privacy' ? 'is-active' : ''} href="/privacy">
            <span>Privacy</span>
            Privacy Policy
          </a>
          <a className={document.slug === 'terms' ? 'is-active' : ''} href="/terms">
            <span>Terms</span>
            Terms of Service
          </a>
          <a href="mailto:support@entrack.in">
            <span>Support</span>
            support@entrack.in
          </a>
        </aside>

        <article className="docs-content legal-content">
          <section className="docs-hero legal-hero">
            <div className="docs-section-eyebrow">{document.eyebrow}</div>
            <h1>{document.title}</h1>
            <p>{document.intro}</p>
            <div className="legal-updated">Last Updated: {document.updated}</div>
          </section>

          <div className="legal-sections">
            {document.sections.map((section, index) => (
              <section className="legal-section" key={section.title}>
                <div className="legal-section-index">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h2>{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}

const demoSections = [
  {
    slug: 'news',
    title: 'Market news',
    eyebrow: 'News',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1400&q=80',
    description: 'Track market headlines as trading context without letting news noise take over the review.',
    features: ['Headline context', 'Market awareness', 'Trade review notes'],
    details: [
      'News gives traders market context before and after key decisions.',
      'It helps explain volatility around important sessions and symbols.',
      'The goal is awareness, not emotional reaction.',
    ],
  },
  {
    slug: 'economic-calendar',
    title: 'Economic calendar',
    eyebrow: 'Calendar',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1400&q=80',
    description: 'Plan trading sessions around scheduled events, high-impact releases and session risk.',
    features: ['Event planning', 'Impact awareness', 'Session preparation'],
    details: [
      'The calendar helps traders avoid surprise volatility around scheduled events.',
      'Events can be reviewed alongside trades to understand timing and risk.',
      'It supports preparation before the trading day starts.',
    ],
  },
  {
    slug: 'ai-analysis',
    title: 'AI analysis',
    eyebrow: 'AI Review',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1400&q=80',
    description: 'Use AI to summarize trading behavior, repeated mistakes and improvement ideas from your records.',
    features: ['Behavior summary', 'Mistake patterns', 'Review prompts'],
    details: [
      'AI analysis turns trade data into a readable review draft.',
      'It can highlight repeated mistakes, strengths and questions for the next session.',
      'The trader stays in control and uses AI as a review assistant.',
    ],
  },
];

const demoShowcaseSections = [
  {
    slug: 'dashboard',
    title: 'Dashboard overview',
    eyebrow: 'Performance',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80',
    description: 'Account health, daily PnL, win rate and trade quality stay in one calm overview.',
    features: ['Fast performance scan', 'Currency aware stats', 'Review-ready layout'],
    details: [
      'The dashboard gives traders a fast first read on account health and recent performance.',
      'Stats, calendar context and trade lists stay close together so review does not feel scattered.',
      'This page is the starting point before opening deeper journal, analytics or replay screens.',
    ],
  },
  {
    slug: 'add-trade',
    title: 'Add trade',
    eyebrow: 'Trade Entry',
    image: 'https://images.unsplash.com/photo-1642790551116-18e150f248e8?w=1400&q=80',
    description: 'Create clean trade records manually with entry, exit, risk, screenshots and notes.',
    features: ['Manual entry', 'Risk fields', 'Screenshot notes'],
    details: [
      'Add Trade is where a trader turns one decision into structured data.',
      'Manual entry keeps the record complete even when a broker import is not connected.',
      'This page feeds the dashboard, journal and analytics pages.',
    ],
  },
  {
    slug: 'csv-import',
    title: 'CSV import',
    eyebrow: 'Import',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&q=80',
    description: 'Bring trade history from files and map old records into the Entrack review workflow.',
    features: ['Bulk import', 'Broker file support', 'Mapped history'],
    details: [
      'CSV import helps traders move existing records into one workspace.',
      'Imported history becomes usable for dashboard stats and analytics.',
      'It is useful when starting with Entrack after months of previous trades.',
    ],
  },
];

const featureSections = [
  {
    slug: 'journal',
    eyebrow: 'Journal',
    title: 'Track every trade with context.',
    image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1400&q=80',
    description: 'Journal keeps entries, exits, screenshots, notes and lessons attached to each trade.',
    points: ['Trade notes and screenshots', 'Setup quality review', 'Mistake and lesson tracking'],
  },
  {
    slug: 'brokers',
    eyebrow: 'Brokers',
    title: 'Broker coverage without switching tabs.',
    image: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1400&q=80',
    description: 'Broker pages organize trading sources, supported accounts and coverage notes in one clean view.',
    points: ['Supported broker list', 'Account source context', 'Market coverage preview'],
  },
  {
    slug: 'analytics',
    eyebrow: 'Analytics',
    title: 'Find the patterns behind performance.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80',
    description: 'Analytics turns trade history into readable stats, weaknesses and repeatable performance patterns.',
    points: ['Win rate and RR breakdown', 'Session and symbol behavior', 'Weakness detection'],
  },
  {
    slug: 'replay',
    eyebrow: 'Replay',
    title: 'Practice markets before risking capital.',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1400&q=80',
    description: 'Replay helps traders test entries, exits and risk rules against historical market movement.',
    points: ['Historical candle replay', 'Virtual execution practice', 'Strategy confidence building'],
  },
];

const brokerGalleryItems = [
  {
    slug: 'exness',
    name: 'Exness',
    type: 'Forex broker',
    coverage: 'MT5 sync ready',
    image: '/assets/broker/exness%20image.svg',
    mark: 'EX',
    description: 'Track Exness account activity with journal context, screenshots and broker-specific review notes.',
  },
  {
    slug: 'vantage',
    name: 'Vantage',
    type: 'CFD broker',
    coverage: 'Account coverage',
    image: '/assets/broker/vantage.svg',
    mark: 'VA',
    description: 'Keep Vantage trades grouped with performance stats so broker behavior is easier to compare.',
  },
  {
    slug: 'xm',
    name: 'XM',
    type: 'Forex broker',
    coverage: 'Broker directory',
    image: '/assets/broker/xm.svg',
    mark: 'XM',
    description: 'Add XM into the broker workspace and review markets, accounts and execution patterns cleanly.',
  },
  {
    slug: 'binance',
    name: 'Binance',
    type: 'Crypto exchange',
    coverage: 'Crypto journal',
    mark: 'BN',
    description: 'Keep crypto trades beside forex and CFD activity without losing the source of each decision.',
  },
  {
    slug: 'bybit',
    name: 'Bybit',
    type: 'Crypto exchange',
    coverage: 'Crypto journal',
    mark: 'BY',
    description: 'Review Bybit trades with symbol, session and risk context attached to each crypto decision.',
  },
  {
    slug: 'bitget',
    name: 'Bitget',
    type: 'Crypto exchange',
    coverage: 'Exchange coverage',
    mark: 'BG',
    description: 'Keep Bitget activity organized beside other exchanges and compare execution habits cleanly.',
  },
  {
    slug: 'coinbase',
    name: 'Coinbase',
    type: 'Crypto exchange',
    coverage: 'Spot tracking',
    mark: 'CB',
    description: 'Track Coinbase spot activity and connect longer-term crypto decisions with journal notes.',
  },
  {
    slug: 'okx',
    name: 'OKX',
    type: 'Crypto exchange',
    coverage: 'Exchange coverage',
    mark: 'OK',
    description: 'Bring OKX trades into the same review workspace for crypto performance and behavior checks.',
  },
  {
    slug: 'zerodha',
    name: 'Zerodha',
    type: 'India broker',
    coverage: 'Equity workflow',
    mark: 'ZR',
    description: 'Organize Zerodha trades with market context, account notes and clean review categories.',
  },
  {
    slug: 'angel-one',
    name: 'Angel One',
    type: 'India broker',
    coverage: 'Equity workflow',
    mark: 'AO',
    description: 'Review Angel One trading activity alongside other accounts without breaking your workflow.',
  },
  {
    slug: 'dhan',
    name: 'Dhan',
    type: 'India broker',
    coverage: 'Equity workflow',
    mark: 'DN',
    description: 'Keep Dhan trades visible in broker coverage for account-by-account comparison.',
  },
  {
    slug: 'upstox',
    name: 'Upstox',
    type: 'India broker',
    coverage: 'Equity workflow',
    mark: 'UP',
    description: 'Use Upstox as another source in the trading review loop with notes and performance context.',
  },
  {
    slug: 'ic-markets',
    name: 'IC Markets',
    type: 'Forex broker',
    coverage: 'Forex coverage',
    mark: 'IC',
    description: 'Compare IC Markets trading behavior with other forex accounts and session performance.',
  },
  {
    slug: 'pepperstone',
    name: 'Pepperstone',
    type: 'CFD broker',
    coverage: 'CFD coverage',
    mark: 'PP',
    description: 'Keep Pepperstone trades grouped by broker so execution quality is easier to review.',
  },
  {
    slug: 'interactive-brokers',
    name: 'Interactive Brokers',
    type: 'Global broker',
    coverage: 'Multi-asset',
    mark: 'IB',
    description: 'Track multi-asset activity from Interactive Brokers with a consistent review structure.',
  },
];

const getFeatureSectionFromPath = () => {
  const [first, second] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'features' || !second) return null;
  return featureSections.find((section) => section.slug === second) || null;
};

const getDemoSectionFromPath = () => {
  const [first, second] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'demo' || !second) return null;
  return [...demoShowcaseSections, ...demoSections].find((section) => section.slug === second) || null;
};

const getBrokerSectionFromPath = () => {
  const [first, second, third] = window.location.pathname.split('/').filter(Boolean);
  if (first !== 'demo' || second !== 'brokers' || !third) return null;
  return brokerGalleryItems.find((broker) => broker.slug === third) || null;
};

function BrokerDetailPage({ broker }) {
  const brokerFeatures = [
    broker.coverage,
    broker.type,
    'Broker comparison',
    'Journal + analytics context',
  ];

  return (
    <div className="entrack-landing demo-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header demo-header">
        <a href="/demo" className="brand" aria-label="Back to demo">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Broker Demo</span>
        </a>
        <nav className="docs-header-links" aria-label="Broker detail navigation">
          <a href="/demo">Demo</a>
          <a href="/features/brokers">Broker feature</a>
        </nav>
      </header>

      <main className="demo-detail-main">
        <section className="demo-detail-hero">
          <div>
            <div className="section-kicker">{broker.type}</div>
            <h1>{broker.name}</h1>
            <p>{broker.description}</p>
          </div>
          <div className="demo-detail-image demo-detail-image--broker">
            {broker.image ? (
              <img src={broker.image} alt={`${broker.name} logo`} />
            ) : (
              <strong>{broker.mark}</strong>
            )}
          </div>
        </section>

        <section className="demo-detail-grid">
          <article>
            <h2>Broker coverage</h2>
            <div className="demo-feature-list">
              {brokerFeatures.map((feature) => (
                <span className="demo-feature-pill" key={feature}>{feature}</span>
              ))}
            </div>
          </article>
          <article>
            <h2>How it fits in Entrack</h2>
            <ul>
              <li>Broker identity stays attached to every trade and review flow.</li>
              <li>Traders can compare behavior across accounts, symbols and markets.</li>
              <li>This page can later hold broker screenshots, connection notes and import steps.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

function DemoDetailPage({ section }) {
  return (
    <div className="entrack-landing demo-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header demo-header">
        <a href="/demo" className="brand" aria-label="Back to demo">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack Demo</span>
        </a>
        <nav className="docs-header-links" aria-label="Demo detail navigation">
          <a href="/demo">Demo</a>
          <a href="/">Landing</a>
        </nav>
      </header>

      <main className="demo-detail-main">
        <section className="demo-detail-hero">
          <div>
            <div className="section-kicker">{section.eyebrow}</div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
          <div className="demo-detail-image">
            <img src={section.image} alt={`${section.title} detail preview`} />
          </div>
        </section>

        <section className="demo-detail-grid">
          <article>
            <h2>Feature highlights</h2>
            <div className="demo-feature-list">
              {section.features.map((feature) => (
                <span className="demo-feature-pill" key={feature}>{feature}</span>
              ))}
            </div>
          </article>
          <article>
            <h2>How this page helps</h2>
            <ul>
              {section.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

function FeatureDetailPage({ section }) {
  return (
    <div className="entrack-landing demo-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header demo-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack</span>
        </a>
        <nav className="docs-header-links" aria-label="Feature navigation">
          <a href="/">Landing</a>
          <a href="/demo">Demo</a>
        </nav>
      </header>

      <main className="demo-detail-main">
        <section className="demo-detail-hero">
          <div>
            <div className="section-kicker">{section.eyebrow}</div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
          <div className="demo-detail-image">
            <img src={section.image} alt={`${section.eyebrow} feature preview`} />
          </div>
        </section>

        <section className="demo-detail-grid">
          <article>
            <h2>What it includes</h2>
            <div className="demo-feature-list">
              {section.points.map((point) => (
                <span className="demo-feature-pill" key={point}>{point}</span>
              ))}
            </div>
          </article>
          <article>
            <h2>Why traders use it</h2>
            <ul>
              <li>Keep the review process focused on evidence instead of memory.</li>
              <li>Move from raw activity to clean decisions and repeatable habits.</li>
              <li>Connect this feature with the rest of the Entrack workflow.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
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
  const goToDemo = (index) => {
    setActiveDemoIndex((index + demoSections.length) % demoSections.length);
  };
  const goToBroker = (index) => {
    setActiveBrokerIndex((index + brokerGalleryItems.length) % brokerGalleryItems.length);
  };
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
      height: cardRect.height,
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

  if (detailSection) {
    return <DemoDetailPage section={detailSection} />;
  }

  if (brokerSection) {
    return <BrokerDetailPage broker={brokerSection} />;
  }

  return (
    <div className="entrack-landing demo-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header demo-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark" aria-hidden="true">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
          </span>
          <span>Entrack</span>
        </a>
        <nav className="docs-header-links" aria-label="Demo navigation">
          <a href="/">Landing</a>
          <a href="/documentation/journal">Documentation</a>
        </nav>
      </header>

      <main className="demo-main">
        <section className="demo-hero">
          <div className="section-kicker">Product demo</div>
          <h1>See how Entrack pages fit together.</h1>
        </section>

        <section className="demo-showcase" aria-label="Demo screenshots">
          {demoShowcaseSections.map((section) => (
            <article className="demo-card" key={section.title}>
              <a className="demo-card__link" href={`/demo/${section.slug}`}>
                <div className="demo-card__media">
                <img src={section.image} alt={`${section.title} preview`} loading="lazy" />
                </div>
                <div className="demo-card__body">
                  <span>{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                  <div className="demo-feature-list">
                    {section.features.map((feature) => (
                      <div className="demo-feature-pill" key={feature}>{feature}</div>
                    ))}
                  </div>
                </div>
              </a>
            </article>
          ))}
        </section>

        <section className="demo-slider-shell" ref={hoverShellRef} aria-label="Interactive demo screenshots">
          <div className="demo-slider-bg" aria-hidden="true">
            <img src={activeDemo.image} alt="" />
          </div>
          <div
            className={`demo-slider-highlight ${hoverBg.visible ? 'is-visible' : ''}`}
            aria-hidden="true"
            style={{
              width: `${hoverBg.width}px`,
              height: `${hoverBg.height}px`,
              transform: `translate3d(${hoverBg.x}px, ${hoverBg.y}px, 0)`,
            }}
          />

          <div className="demo-slider-track">
            {demoSections.map((section, index) => (
              <button
                className={`demo-slide-card ${index === activeDemoIndex ? 'is-active' : ''}`}
                type="button"
                key={section.title}
                ref={(element) => {
                  hoverCardRefs.current[index] = element;
                }}
                onClick={() => {
                  navigate(`/demo/${section.slug}`);
                }}
                onMouseEnter={() => {
                  goToDemo(index);
                  moveHoverBg(index);
                }}
                onFocus={() => {
                  goToDemo(index);
                  moveHoverBg(index);
                }}
              >
                <div className="demo-slide-date">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <small>{section.eyebrow}</small>
                </div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
                <div className="demo-slide-image">
                  <img src={section.image} alt={`${section.title} preview`} loading="lazy" />
                </div>
                <div className="demo-feature-list">
                  {section.features.slice(0, 2).map((feature) => (
                    <span className="demo-feature-pill" key={feature}>{feature}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

        </section>

        <section
          className="broker-gallery-demo"
          aria-label="Broker gallery demo"
          onWheel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (Math.abs(event.deltaY) < 16) return;
            goToBroker(activeBrokerIndex + (event.deltaY > 0 ? 1 : -1));
          }}
        >
          <div className="broker-gallery-copy">
            <span className="catalogue-number">
              {String(activeBrokerIndex + 1).padStart(2, '0')} / Broker coverage
            </span>
            <h2>{brokerGalleryItems[activeBrokerIndex].name}</h2>
            <p>{brokerGalleryItems[activeBrokerIndex].description}</p>
            <div className="broker-gallery-meta">
              <span>Type</span>
              <strong>{brokerGalleryItems[activeBrokerIndex].type}</strong>
              <span>Status</span>
              <strong>{brokerGalleryItems[activeBrokerIndex].coverage}</strong>
              <span>Workspace</span>
              <strong>Journal + analytics</strong>
            </div>
          </div>

          <div className="broker-gallery-wall" aria-label="Broker cards">
            {brokerGalleryItems.map((broker, index) => {
              const offset = index - activeBrokerIndex;
              const absoluteOffset = Math.abs(offset);
              return (
                <button
                  type="button"
                  className={`broker-gallery-frame ${index === activeBrokerIndex ? 'is-active' : ''} ${absoluteOffset <= 1 ? 'is-near' : ''}`}
                  key={broker.name}
                  style={{ '--offset': offset, '--abs-offset': absoluteOffset }}
                  onClick={() => {
                    navigate(`/demo/brokers/${broker.slug}`);
                  }}
                  onMouseEnter={() => goToBroker(index)}
                  onFocus={() => goToBroker(index)}
                >
                  <div className="broker-frame-art">
                    {broker.image ? (
                      <img src={broker.image} alt={`${broker.name} preview`} />
                    ) : (
                      <strong>{broker.mark}</strong>
                    )}
                  </div>
                  <span>{broker.name}</span>
                </button>
              );
            })}
          </div>

          <div className="broker-gallery-hint">Scroll or hover to explore brokers</div>
        </section>
      </main>
    </div>
  );
}

function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login');
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isDocumentationPage = normalizedPath.startsWith('/documentation');
  const isAnalyticsGuidePage = normalizedPath === '/analytics' || normalizedPath.startsWith('/analytics/');
  const legalDocument = normalizedPath === '/privacy' ? legalDocuments.privacy : normalizedPath === '/terms' ? legalDocuments.terms : null;
  const isDemoPage = normalizedPath === '/demo' || normalizedPath.startsWith('/demo/');
  const featureSection = getFeatureSectionFromPath();

  const openLoginModal = (tab = 'login') => {
    setLoginModalTab(tab);
    setShowLoginModal(true);
  };

  const handleViewDemo = () => {
    navigate('/demo');
  };

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
    <div className="landing-route-boundary" onClick={handleInternalNavigation}>
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
        <>
          <LandingHome
            onLogin={() => openLoginModal('login')}
            onSignUp={() => openLoginModal('signup')}
            onStartTracking={() => openLoginModal('login')}
            onGetStarted={() => openLoginModal('login')}
            onViewDemo={handleViewDemo}
          />
          <Suspense fallback={null}>
            <UserLoginModal
              isOpen={showLoginModal}
              initialTab={loginModalTab}
              onClose={() => setShowLoginModal(false)}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}

export default LandingPage;
