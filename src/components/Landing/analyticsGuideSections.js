export const analyticsGuideSections = [
  {
    slug: 'overview',
    label: 'Analytics Overview',
    eyebrow: 'Start Here',
    title: 'All trading analytics in one improvement system.',
    intro: 'The Analytics page explains what each Entrack analytics tool does, how it reads your trading data, and how a trader can use the result to improve decisions without guessing.',
    works: [
      'It connects dashboard stats, radar scores, calendar behavior, day review, charts, heatmaps, AI review and replay into one learning flow.',
      'Each tool starts from your own trades, notes, timestamps, symbols, P&L and review habits.',
      'The goal is not to promise profit. The goal is to make repeated behavior visible so you can fix one thing at a time.'
    ],
    improves: [
      'See where your edge is strong before increasing size.',
      'Find weak sessions, symbols, weekdays, exits or risk habits before they become expensive.',
      'Turn scattered trades into a clear review routine: capture, measure, inspect, decide, practice.'
    ],
    features: ['Feature sidebar', 'Deep tool pages', 'Trader-focused explanations', 'Improvement workflow']
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
      'Dashboard is the place to notice what needs deeper review, then jump into calendar, radar, day review or analytics.'
    ],
    improves: [
      'You stop judging performance from one emotional trade.',
      'You can compare periods and ask better questions, such as whether the month is profitable because of quality or just one oversized winner.',
      'You quickly see if risk, activity or consistency is drifting.'
    ],
    features: ['P&L summary', 'Win rate scan', 'Currency-aware stats', 'Date filtering', 'Trade mode filtering']
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
      'The overall grade helps you understand if the account is excellent, good, average or needs work.'
    ],
    improves: [
      'You can see the exact weak side of your trading instead of saying "I am inconsistent" vaguely.',
      'If win rate is fine but average win/loss is weak, you know exits need work.',
      'If drawdown score is poor, you know risk control needs attention before strategy changes.'
    ],
    features: ['Overall score', 'Profit factor', 'Average win/loss', 'Recovery factor', 'Drawdown control', 'Consistency']
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
      'It is useful even before advanced statistics become meaningful because consistency starts with data capture.'
    ],
    improves: [
      'You can detect overtrading clusters and missing review days.',
      'You can confirm whether improvement came from a repeatable process or just random activity.',
      'It encourages a steady review habit instead of a burst of journaling after losses.'
    ],
    features: ['Weekly heatmap', 'Weekday rows', 'Month markers', 'Activity intensity', 'Consistency signal']
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
      'Clicking a trading day opens the specific Day Review for that date.'
    ],
    improves: [
      'You can find which weekdays repeatedly hurt performance.',
      'You can spot streaks, revenge-trading days or breakeven survival days.',
      'You can plan future sessions around days that historically deserve more caution.'
    ],
    features: ['Daily P&L', 'Trade count', 'Win rate', 'Breakeven marking', 'Weekly cards', 'Calendar image export']
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
      'It separates symbol and session results to show where the day was won or lost.'
    ],
    improves: [
      'You finish the day with one lesson instead of a vague feeling.',
      'You can identify if the damage came from a symbol, session, streak or payout problem.',
      'You can build a next-session focus before repeating the same mistake.'
    ],
    features: ['Intraday curve', 'Largest winner', 'Largest loser', 'Daily checklist', 'Symbol breakdown', 'Session breakdown']
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
      'It should be treated as a review assistant, not as financial advice.'
    ],
    improves: [
      'You get a faster draft of what to review after a busy session.',
      'You can catch repeated mistakes that are hard to notice manually.',
      'You can turn the AI output into one practical rule for the next trading day.'
    ],
    features: ['Behavior summary', 'Mistake detection', 'Improvement prompts', 'Currency context', 'Human review required']
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
      'It supports multiple timeframes so you can review execution context at different levels.'
    ],
    improves: [
      'You can see if the entry was late, early or against market structure.',
      'You can compare exits against the move that followed instead of relying on memory.',
      'You can turn screenshots and chart evidence into better rules.'
    ],
    features: ['Candlestick chart', 'Entry markers', 'Exit markers', '1m/5m/15m/1h views', 'Full-day context']
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
      'It supports the Day Review and dashboard by turning raw numbers into a visible path.'
    ],
    improves: [
      'You can identify whether the account is growing steadily or relying on rare spikes.',
      'You can see when a losing streak begins instead of noticing too late.',
      'You can adjust risk when the curve shows instability.'
    ],
    features: ['Cumulative P&L', 'Intraday curve', 'Period comparison', 'Drawdown visibility', 'Performance trend']
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
      'It turns repeated behavior into something visible enough to act on.'
    ],
    improves: [
      'You can stop trading low-quality time windows that repeatedly produce losses.',
      'You can focus practice on setups or sessions where your edge is actually visible.',
      'You can compare behavior before and after a rule change.'
    ],
    features: ['Pattern scanning', 'Loss clusters', 'Profit clusters', 'Session review', 'Symbol behavior']
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
      'Backtest stats can be compared with journal analytics to see whether live behavior matches the plan.'
    ],
    improves: [
      'You can practice the exact mistake found in Day Review or Radar.',
      'You can build confidence in a rule before increasing live risk.',
      'You can separate strategy weakness from execution weakness.'
    ],
    features: ['Historical candles', 'Virtual orders', 'Playback controls', 'Risk calculator', 'Practice loop']
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
      'This helps the trader review environment quality, not just individual decisions.'
    ],
    improves: [
      'You can focus capital and attention where execution is cleaner.',
      'You can reduce activity in sessions that repeatedly create poor decisions.',
      'You can compare manual and imported trades without losing context.'
    ],
    features: ['Broker context', 'Session breakdown', 'Symbol categories', 'Manual/API trade separation', 'Source comparison']
  }
];
