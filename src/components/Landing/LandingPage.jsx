import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import landingMarkup from './landingMarkup';
import { legalDocuments } from './legalDocuments';
import './LandingPage.css';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));

const ctaLabels = new Set(['start tracking', 'get started', 'sign in', 'login', 'sign up']);

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

function DocumentationPage() {
  const requestedSlug = window.location.pathname.split('/').filter(Boolean)[1] || 'journal';
  const activeSection = documentationSections.find((section) => section.slug === requestedSlug) || documentationSections[0];

  return (
    <div className="entrack-landing docs-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark">E</span>
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

function LegalPage({ document }) {
  return (
    <div className="entrack-landing docs-page legal-page">
      <div className="page-bg" aria-hidden="true" />
      <header className="docs-header">
        <a href="/" className="brand" aria-label="Entrack home">
          <span className="brand__mark">E</span>
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
  {
    slug: 'day-review',
    title: 'Day review',
    eyebrow: 'Daily Review',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1400&q=80',
    description: 'Turn one trading day into a clear lesson before the next session begins.',
    features: ['Daily summary', 'Mistake review', 'Next-session focus'],
    details: [
      'Day review compresses one session into the decisions that mattered.',
      'It helps traders name one improvement instead of carrying vague frustration.',
      'The page connects trades, notes and performance into a daily lesson.',
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
          <span className="brand__mark">E</span>
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
          <span className="brand__mark">E</span>
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
          <span className="brand__mark">E</span>
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
          <span className="brand__mark">E</span>
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
                  window.location.href = `/demo/${section.slug}`;
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
                    window.location.href = `/demo/brokers/${broker.slug}`;
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login');
  const landingRef = useRef(null);
  const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const isDocumentationPage = normalizedPath.startsWith('/documentation');
  const legalDocument = normalizedPath === '/privacy' ? legalDocuments.privacy : normalizedPath === '/terms' ? legalDocuments.terms : null;
  const isDemoPage = normalizedPath === '/demo' || normalizedPath.startsWith('/demo/');
  const featureSection = getFeatureSectionFromPath();

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return undefined;

    const moduleCarousel = root.querySelector('#moduleCarousel');
    const moduleCards = moduleCarousel ? [...moduleCarousel.querySelectorAll('.module-card')] : [];
    let activeModule = Math.max(0, moduleCards.findIndex((card) => card.classList.contains('is-open')));

    const setActiveModule = (index) => {
      if (!moduleCards.length) return;
      activeModule = ((index % moduleCards.length) + moduleCards.length) % moduleCards.length;
      moduleCards.forEach((card, cardIndex) => card.classList.toggle('is-open', cardIndex === activeModule));
      moduleCards[activeModule].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    const moduleNext = root.querySelector('#moduleNext');
    const modulePrev = root.querySelector('#modulePrev');
    const handleModuleNext = () => setActiveModule(activeModule + 1);
    const handleModulePrev = () => setActiveModule(activeModule - 1);
    const cardHandlers = moduleCards.map((card, index) => {
      const handler = () => setActiveModule(index);
      card.addEventListener('click', handler);
      return { card, handler };
    });

    moduleNext?.addEventListener('click', handleModuleNext);
    modulePrev?.addEventListener('click', handleModulePrev);

    return () => {
      moduleNext?.removeEventListener('click', handleModuleNext);
      modulePrev?.removeEventListener('click', handleModulePrev);
      cardHandlers.forEach(({ card, handler }) => card.removeEventListener('click', handler));
    };
  }, []);

  const handleLandingClick = (event) => {
    const element = event.target.closest('button, a');
    const root = landingRef.current;
    if (!root) return;

    if (!element || !root.contains(element)) return;

    const label = element.textContent?.trim().toLowerCase();
    if (ctaLabels.has(label)) {
      event.preventDefault();
      setLoginModalTab(label === 'sign up' ? 'signup' : 'login');
      setShowLoginModal(true);
      return;
    }

    if (label === 'view demo') {
      event.preventDefault();
      window.location.href = '/demo';
    }
  };

  return (
    <>
      {featureSection ? (
        <FeatureDetailPage section={featureSection} />
      ) : isDemoPage ? (
        <DemoPage />
      ) : isDocumentationPage ? (
        <DocumentationPage />
      ) : legalDocument ? (
        <LegalPage document={legalDocument} />
      ) : (
        <>
          <div
            ref={landingRef}
            className="entrack-landing"
            onClick={handleLandingClick}
            dangerouslySetInnerHTML={{ __html: landingMarkup }}
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
    </>
  );
}

export default LandingPage;
