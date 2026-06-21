import React, { useCallback, useRef, useState } from 'react';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../config/supportContact';

const featureCards = [
  {
    tag: 'Journal',
    title: 'Track Every Trade',
    text: 'Log entry, exit, screenshots, notes, risk, mistakes, setup quality and the lesson behind every position.',
    href: '/features/journal',
    link: 'Explore →',
    bg: "linear-gradient(135deg, rgba(37,99,235,.52), rgba(2,6,23,.42)), url('https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1000&q=80')",
  },
  {
    tag: 'Brokers',
    title: 'Supported Brokers',
    text: 'Keep Exness, IC Markets, Binance, Bybit, Zerodha, Angel One and popular brokers in one clean list.',
    href: '/features/brokers',
    link: 'View brokers →',
    bg: "linear-gradient(135deg, rgba(124,58,237,.52), rgba(2,6,23,.44)), url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&q=80')",
  },
  {
    tag: 'Analytics',
    title: 'Find Weakness',
    text: 'Break down win rate, RR, symbols, weekdays, sessions and repeated behavior that quietly hurts performance.',
    href: '/analytics',
    link: 'Analyze ->',
    bg: "linear-gradient(135deg, rgba(14,165,233,.50), rgba(2,6,23,.44)), url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80')",
  },
  {
    tag: 'Backtest',
    title: 'Replay Markets',
    text: 'Practice entries, exits and risk rules with historical candles before risking money in live markets.',
    href: '/features/replay',
    link: 'Replay →',
    bg: "linear-gradient(135deg, rgba(34,197,94,.42), rgba(2,6,23,.46)), url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&q=80')",
  },
];

const statCards = [
  {
    label: 'MT5 Account',
    metric: '$12.4k',
    text: 'Live balance, equity and account health stay visible inside the same workspace.',
    bg: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.08), transparent 34%), radial-gradient(circle at 92% 12%, rgba(45,212,255,.10), transparent 26%), linear-gradient(135deg, #101012, #050506 58%, #010204)',
  },
  {
    label: 'Journal',
    metric: '68%',
    text: 'See whether your setups are actually working across symbols and sessions.',
    bg: 'radial-gradient(circle at 18% 12%, rgba(255,79,216,.13), transparent 30%), radial-gradient(circle at 92% 12%, rgba(45,212,255,.08), transparent 26%), linear-gradient(135deg, #101012, #060607 58%, #010204)',
  },
  {
    label: 'Risk',
    metric: '1:3.2',
    text: 'Track average RR and keep risk discipline clear before, during and after trades.',
    bg: 'radial-gradient(circle at 18% 12%, rgba(34,197,94,.10), transparent 32%), radial-gradient(circle at 92% 12%, rgba(45,212,255,.08), transparent 26%), linear-gradient(135deg, #101012, #060607 58%, #010204)',
  },
];

const modules = [
  {
    eyebrow: 'Journal',
    title: 'Trade Journal',
    text: 'Track every setup, screenshot, mistake and lesson in one clean trading workspace built for serious review.',
    bg: "url('https://images.unsplash.com/photo-1642790551116-18e150f248e8?auto=format&fit=crop&w=1000&q=80')",
  },
  {
    eyebrow: 'Analytics',
    title: 'Performance Analytics',
    text: 'See win rate, risk reward, daily PnL, mistakes and patterns without digging through messy spreadsheets.',
    bg: "url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1000&q=80')",
  },
  {
    eyebrow: 'Replay',
    title: 'Backtest Replay',
    text: 'Replay candles, place virtual trades, test strategy rules and build confidence before risking real capital.',
    bg: "url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80')",
  },
  {
    eyebrow: 'Brokers',
    title: 'Broker Directory',
    text: 'Organize broker names, market type and trading source cleanly with journal and analytics context.',
    bg: "url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80')",
  },
  {
    eyebrow: 'Risk',
    title: 'Risk Control',
    text: 'Keep risk visible with daily limits, position sizing, drawdown checks and rule-based trading stats.',
    bg: "url('https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=1000&q=80')",
  },
];

const brokerTracks = [
  [
    { x: '6%', y: '8%', r: '-2deg', name: 'Exness', type: 'forex broker', image: '/assets/broker/exness%20image.svg' },
    { x: '27%', y: '5%', r: '2deg', mark: 'IC', name: 'IC Markets', type: 'forex broker' },
    { x: '48%', y: '10%', r: '-1deg', mark: 'PP', name: 'Pepperstone', type: 'cfd broker' },
    { x: '70%', y: '7%', r: '3deg', mark: 'FP', name: 'FP Markets', type: 'cfd broker' },
    { x: '88%', y: '13%', r: '-2deg', name: 'XM', type: 'forex broker', image: '/assets/broker/xm.svg' },
    { x: '13%', y: '31%', r: '2deg', mark: 'OC', name: 'Octa', type: 'forex broker' },
    { x: '35%', y: '36%', r: '-3deg', mark: 'HF', name: 'HFM', type: 'cfd broker' },
    { x: '57%', y: '30%', r: '2deg', mark: 'OA', name: 'OANDA', type: 'forex broker' },
    { x: '79%', y: '35%', r: '-2deg', mark: 'FC', name: 'FOREX.com', type: 'forex broker' },
    { x: '8%', y: '58%', r: '-2deg', mark: 'TK', name: 'Tickmill', type: 'forex broker' },
    { x: '28%', y: '63%', r: '2deg', mark: 'AV', name: 'AvaTrade', type: 'cfd broker' },
    { x: '50%', y: '58%', r: '-2deg', mark: '8C', name: 'Eightcap', type: 'cfd broker' },
    { x: '72%', y: '62%', r: '2deg', mark: 'FX', name: 'FXTM', type: 'forex broker' },
    { x: '89%', y: '57%', r: '-1deg', name: 'Vantage', type: 'cfd broker', image: '/assets/broker/vantage.svg' },
    { x: '18%', y: '83%', r: '-2deg', mark: 'BN', name: 'Binance', type: 'crypto exchange' },
    { x: '47%', y: '87%', r: '2deg', mark: 'BY', name: 'Bybit', type: 'crypto exchange' },
    { x: '64%', y: '82%', r: '-2deg', mark: 'OK', name: 'OKX', type: 'crypto exchange' },
    { x: '84%', y: '86%', r: '2deg', mark: 'IB', name: 'Interactive Brokers', type: 'global broker' },
  ],
  [
    { x: '10%', y: '5%', r: '2deg', mark: 'DN', name: 'Dhan', type: 'india broker' },
    { x: '34%', y: '8%', r: '-2deg', mark: 'ZR', name: 'Zerodha', type: 'india broker' },
    { x: '60%', y: '4%', r: '2deg', mark: 'UP', name: 'Upstox', type: 'india broker' },
    { x: '82%', y: '9%', r: '-2deg', mark: 'AG', name: 'Angel One', type: 'india broker' },
    { x: '5%', y: '29%', r: '-2deg', mark: 'DR', name: 'Deriv', type: 'cfd broker' },
    { x: '28%', y: '34%', r: '2deg', mark: 'FB', name: 'FBS', type: 'forex broker' },
    { x: '48%', y: '28%', r: '-3deg', mark: 'RO', name: 'RoboForex', type: 'forex broker' },
    { x: '69%', y: '32%', r: '2deg', mark: 'TM', name: 'TMGM', type: 'cfd broker' },
    { x: '90%', y: '27%', r: '-2deg', mark: 'SK', name: 'Skilling', type: 'cfd broker' },
    { x: '14%', y: '56%', r: '2deg', mark: 'ET', name: 'eToro', type: 'multi asset' },
    { x: '37%', y: '60%', r: '-2deg', mark: 'SAX', name: 'Saxo', type: 'global broker' },
    { x: '59%', y: '55%', r: '2deg', mark: 'CM', name: 'CMC Markets', type: 'cfd broker' },
    { x: '80%', y: '61%', r: '-2deg', mark: 'IG', name: 'IG', type: 'global broker' },
    { x: '9%', y: '84%', r: '-2deg', mark: 'QS', name: 'Questrade', type: 'global broker' },
    { x: '31%', y: '89%', r: '2deg', mark: 'WB', name: 'Webull', type: 'stock broker' },
    { x: '54%', y: '83%', r: '-2deg', mark: 'RH', name: 'Robinhood', type: 'stock broker' },
    { x: '72%', y: '88%', r: '2deg', mark: 'MO', name: 'moomoo', type: 'stock broker' },
    { x: '92%', y: '82%', r: '-2deg', mark: 'TT', name: 'TradeStation', type: 'stock broker' },
  ],
];

function BrokerLogoCard({ broker }) {
  return (
    <div className="broker-logo-card" style={{ '--x': broker.x, '--y': broker.y, '--r': broker.r }}>
      <div className={`broker-logo-mark ${broker.image ? 'broker-logo-mark--image' : ''}`}>
        {broker.image ? (
          <img className="broker-logo-img" src={broker.image} alt={`${broker.name} logo`} loading="lazy" />
        ) : (
          broker.mark
        )}
      </div>
      <span className="broker-logo-name">{broker.name}</span>
      <span className="broker-logo-type">{broker.type}</span>
    </div>
  );
}

function LandingHome({ onLogin, onSignUp, onStartTracking, onGetStarted, onViewDemo }) {
  const [activeModule, setActiveModule] = useState(0);
  const moduleRefs = useRef([]);

  const setModule = useCallback((index) => {
    const nextIndex = ((index % modules.length) + modules.length) % modules.length;
    setActiveModule(nextIndex);
    moduleRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  return (
    <div className="entrack-landing">
      <div className="page-bg" aria-hidden="true" />

      <main className="landing-main">
        <header className="landing-topbar">
          <a href="#" className="brand" aria-label="Entrack home">
            <span className="brand__mark">E</span>
            <span>Entrack</span>
          </a>

          <nav className="slider__links" aria-label="Primary navigation">
            <a href="#features">Journal</a>
            <a href="/analytics">Analytics</a>
            <a href="#modules">Replay</a>
            <a href="#brokers">Brokers</a>
            <a href="/documentation/journal">Documentation</a>
          </nav>

          <div className="topbar-flow-actions">
            <div className="landing-auth-actions" aria-label="Account actions">
              <button className="auth-action auth-action--ghost" type="button" onClick={onLogin}>Login</button>
              <button className="auth-action auth-action--primary" type="button" onClick={onSignUp}>Sign Up</button>
            </div>
          </div>
        </header>

        <section className="section-block" id="features">
          <div className="section-top">
            <div>
              <a className="section-kicker section-doc-link" href="/documentation/journal">Core workflow</a>
              <h1 className="section-heading">
                <a className="heading-doc-link" href="/documentation/journal">
                  Everything you need to review your <span className="brush-highlight">trading</span>.
                </a>
              </h1>
            </div>
            <div className="section-side-actions">
              <button className="auth-action auth-action--demo" type="button" onClick={onViewDemo}>View Demo</button>
              <p className="section-copy">
                Journal, broker coverage, analytics, and replay in one trading workspace.
              </p>
            </div>
          </div>

          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article className="feature-card" style={{ '--feature-bg': feature.bg }} key={feature.title}>
                <div className="feature-content">
                  <div className="feature-tag">{feature.tag}</div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-text">{feature.text}</p>
                  <a className="feature-link" href={feature.href}>{feature.link}</a>
                </div>
              </article>
            ))}
          </div>

          <div className="feature-section-divider" aria-hidden="true" />
        </section>

        <section className="image-peek-section" aria-label="Product image preview">
          <div className="image-peek-stage">
            <img className="peek-image peek-image-left" src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80" alt="Trading chart side preview" loading="lazy" decoding="async" />
            <img className="peek-image peek-image-center" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80" alt="Trading dashboard preview" loading="lazy" decoding="async" />
            <img className="peek-image peek-image-right" src="https://images.unsplash.com/photo-1642790551116-18e150f248e8?w=1200&q=80" alt="Market replay side preview" loading="lazy" decoding="async" />
          </div>
        </section>

        <section className="section-block" id="dashboard-preview">
          <div className="section-top">
            <div>
              <a className="section-kicker section-doc-link" href="/documentation/dashboard">Performance overview</a>
              <h2 className="section-heading"><a className="heading-doc-link" href="/documentation/dashboard">Your stats should feel readable, not noisy.</a></h2>
            </div>
            <p className="section-copy">
              Monitor account health, risk, sessions, and repeatable performance patterns.
            </p>
          </div>

          <div className="dashboard-layout">
            <div className="stat-grid">
              {statCards.map((card) => (
                <article className="glass-card" style={{ '--card-bg': card.bg }} key={card.label}>
                  <div className="glass-card-top"><span>{card.label}</span><span className="dot-live" /></div>
                  <div className="glass-metric">{card.metric}</div>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>

            <div className="product-window" aria-label="Entrack dashboard mockup">
              <div className="window-bar">
                <div className="window-dots"><span /><span /><span /></div>
                <div className="window-pill">Entrack / Performance</div>
              </div>
              <div className="window-content">
                <div className="chart-panel">
                  <div className="chart-label"><span>XAUUSD Replay</span><span className="pink-chip">+8.4R this month</span></div>
                  <div className="chart-line" />
                  <div className="candle-row" aria-hidden="true">
                    {[44, 78, 56, 122, 92, 148, 110, 170, 132, 190, 154, 210].map((height) => (
                      <span className="candle" style={{ height: `${height}px` }} key={height} />
                    ))}
                  </div>
                </div>
                <aside className="side-panel">
                  <div className="mini-panel"><span className="pink-chip">Best session</span><strong>London Open</strong><p>Cleaner entries and strongest win rate.</p></div>
                  <div className="mini-panel"><span>Main leak</span><strong>Late exits</strong><p>Winners cut too early after first pullback.</p></div>
                  <div className="mini-panel"><span>Next focus</span><strong>Hold to 1:3</strong><p>Replay 20 examples before live trading.</p></div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block" id="modules">
          <div className="section-top">
            <div>
              <a className="section-kicker section-doc-link" href="/documentation/add-trade">Core tools</a>
              <h2 className="section-heading"><a className="heading-doc-link" href="/documentation/add-trade">Open only the tool you need right now.</a></h2>
            </div>
            <p className="section-copy">
              Move between journal, analytics, replay, broker coverage, and risk tools without breaking your workflow.
            </p>
          </div>

          <div className="module-shell">
            <div className="module-carousel" id="moduleCarousel">
              {modules.map((module, index) => (
                <article
                  className={`module-card ${index === activeModule ? 'is-open' : ''}`}
                  style={{ '--module-bg': module.bg }}
                  key={module.title}
                  ref={(element) => {
                    moduleRefs.current[index] = element;
                  }}
                  onClick={() => setModule(index)}
                >
                  <div className="module-content">
                    <div className="module-eyebrow">{module.eyebrow}</div>
                    <h3>{module.title}</h3>
                    <p>{module.text}</p>
                    <span className="module-cta">Explore module →</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="module-actions">
            <button className="module-nav-btn" id="modulePrev" type="button" aria-label="Previous module" onClick={() => setModule(activeModule - 1)}>‹</button>
            <button className="module-nav-btn" id="moduleNext" type="button" aria-label="Next module" onClick={() => setModule(activeModule + 1)}>›</button>
          </div>
        </section>

        <section className="section-block broker-block" id="brokers">
          <div className="broker-stage" aria-label="Broker coverage preview">
            <div className="broker-center-copy">
              <div className="broker-pill">connected review</div>
              <h3>Know where your edge performs best.</h3>
              <p>Bring broker activity into one calm dashboard and spot the accounts, symbols, and sessions that actually deserve your focus.</p>
            </div>

            <div className="broker-flow" aria-hidden="true">
              {brokerTracks.map((track, index) => (
                <div className={`broker-track ${index === 1 ? 'track-two' : ''}`} key={index === 1 ? 'track-two' : 'track-one'}>
                  {track.map((broker) => (
                    <BrokerLogoCard broker={broker} key={`${broker.name}-${broker.x}`} />
                  ))}
                </div>
              ))}
            </div>

            <div className="broker-note">broker names only · no platform lock-in</div>
          </div>
        </section>

        <section className="section-block">
          <div className="final-cta">
            <div className="section-kicker" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Start cleaner</div>
            <h2>Make every trading day easier to review.</h2>
            <p>Entrack is for traders who want one focused place for trades, screenshots, broker list, replay and performance improvement.</p>
            <div className="actions final-actions">
              <button type="button" onClick={onStartTracking || onGetStarted}>Start Tracking</button>
              <button type="button" onClick={onViewDemo}>View Demo</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <div className="brand" aria-label="Entrack footer"><span className="brand__mark">E</span><span>Entrack</span></div>
          <p className="footer-copy">Trading journal, broker coverage, analytics, and replay tools built for focused trade review.</p>
          <a className="footer-support-link" href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </div>

        <div className="site-footer-links">
          <a href="#features">Features</a>
          <a href="/analytics">Analytics</a>
          <a href="#modules">Modules</a>
          <a href="#brokers">Brokers</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href={SUPPORT_MAILTO}>Support</a>
        </div>

        <div className="footer-bottom">© 2026 Entrack. Built for focused traders.</div>
      </footer>
    </div>
  );
}

export default LandingHome;
