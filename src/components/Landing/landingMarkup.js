import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../config/supportContact';

const landingMarkup = `<div class="page-bg" aria-hidden="true"></div>

  <main class="landing-main">
    <header class="landing-topbar">
      <a href="#" class="brand" aria-label="Entrack home">
        <span class="brand__mark">E</span>
        <span>Entrack</span>
      </a>

      <nav class="slider__links" aria-label="Primary navigation">
        <a href="#features">Journal</a>
        <a href="#dashboard-preview">Analytics</a>
        <a href="#modules">Replay</a>
        <a href="#brokers">Brokers</a>
        <a href="/documentation/journal">Documentation</a>
      </nav>

      <div class="topbar-flow-actions">
        <div class="landing-auth-actions" aria-label="Account actions">
          <button class="auth-action auth-action--ghost" type="button">Login</button>
          <button class="auth-action auth-action--primary" type="button">Sign Up</button>
        </div>
      </div>
    </header>

    <section class="section-block" id="features">
      <div class="section-top">
        <div>
          <a class="section-kicker section-doc-link" href="/documentation/journal">Core workflow</a>
          <h1 class="section-heading"><a class="heading-doc-link" href="/documentation/journal">Everything you need to review your <span class="brush-highlight">trading</span>.</a></h1>
        </div>
        <div class="section-side-actions">
          <button class="auth-action auth-action--demo" type="button">View Demo</button>
          <p class="section-copy">
            Journal, broker coverage, analytics, and replay in one trading workspace.
          </p>
        </div>
      </div>

      <div class="feature-grid">
        <article class="feature-card" style="--feature-bg: linear-gradient(135deg, rgba(37,99,235,.52), rgba(2,6,23,.42)), url('https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1000&q=80');">
          <div class="feature-content">
            <div class="feature-tag">Journal</div>
            <h3 class="feature-title">Track Every Trade</h3>
            <p class="feature-text">Log entry, exit, screenshots, notes, risk, mistakes, setup quality and the lesson behind every position.</p>
            <a class="feature-link" href="/features/journal">Explore →</a>
          </div>
        </article>

        <article class="feature-card" style="--feature-bg: linear-gradient(135deg, rgba(124,58,237,.52), rgba(2,6,23,.44)), url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1000&q=80');">
          <div class="feature-content">
            <div class="feature-tag">Brokers</div>
            <h3 class="feature-title">Supported Brokers</h3>
            <p class="feature-text">Exness, IC Markets, Binance, Bybit, Zerodha, Angel One aur popular brokers ko clean list me dikhaye.</p>
            <a class="feature-link" href="/features/brokers">View brokers →</a>
          </div>
        </article>

        <article class="feature-card" style="--feature-bg: linear-gradient(135deg, rgba(14,165,233,.50), rgba(2,6,23,.44)), url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80');">
          <div class="feature-content">
            <div class="feature-tag">Analytics</div>
            <h3 class="feature-title">Find Weakness</h3>
            <p class="feature-text">Break down win rate, RR, symbols, weekdays, sessions and repeated behavior that quietly hurts performance.</p>
            <a class="feature-link" href="/features/analytics">Analyze →</a>
          </div>
        </article>

        <article class="feature-card" style="--feature-bg: linear-gradient(135deg, rgba(34,197,94,.42), rgba(2,6,23,.46)), url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1000&q=80');">
          <div class="feature-content">
            <div class="feature-tag">Backtest</div>
            <h3 class="feature-title">Replay Markets</h3>
            <p class="feature-text">Practice entries, exits and risk rules with historical candles before risking money in live markets.</p>
            <a class="feature-link" href="/features/replay">Replay →</a>
          </div>
        </article>
      </div>

      <div class="feature-section-divider" aria-hidden="true"></div>
    </section>

    <section class="image-peek-section" aria-label="Product image preview">
      <div class="image-peek-stage">
        <img
          class="peek-image peek-image-left"
          src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80"
          alt="Trading chart side preview"
          loading="lazy"
          decoding="async"
        />
        <img
          class="peek-image peek-image-center"
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&q=80"
          alt="Trading dashboard preview"
          loading="lazy"
          decoding="async"
        />
        <img
          class="peek-image peek-image-right"
          src="https://images.unsplash.com/photo-1642790551116-18e150f248e8?w=1200&q=80"
          alt="Market replay side preview"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>

    <section class="section-block" id="dashboard-preview">
      <div class="section-top">
        <div>
          <a class="section-kicker section-doc-link" href="/documentation/dashboard">Performance overview</a>
          <h2 class="section-heading"><a class="heading-doc-link" href="/documentation/dashboard">Your stats should feel readable, not noisy.</a></h2>
        </div>
        <p class="section-copy">
          Monitor account health, risk, sessions, and repeatable performance patterns.
        </p>
      </div>

      <div class="dashboard-layout">
        <div class="stat-grid">
          <article class="glass-card" style="--card-bg: radial-gradient(circle at 20% 15%, rgba(96,165,250,.48), transparent 34%), linear-gradient(135deg, #111827, #172554 55%, #020617);">
            <div class="glass-card-top"><span>MT5 Account</span><span class="dot-live"></span></div>
            <div class="glass-metric">$12.4k</div>
            <p>Live balance, equity and account health stay visible inside the same workspace.</p>
          </article>

          <article class="glass-card" style="--card-bg: radial-gradient(circle at 25% 15%, rgba(168,85,247,.5), transparent 34%), linear-gradient(135deg, #111827, #312e81 55%, #020617);">
            <div class="glass-card-top"><span>Journal</span><span class="dot-live"></span></div>
            <div class="glass-metric">68%</div>
            <p>See whether your setups are actually working across symbols and sessions.</p>
          </article>

          <article class="glass-card" style="--card-bg: radial-gradient(circle at 25% 15%, rgba(34,197,94,.42), transparent 34%), linear-gradient(135deg, #111827, #064e3b 55%, #020617);">
            <div class="glass-card-top"><span>Risk</span><span class="dot-live"></span></div>
            <div class="glass-metric">1:3.2</div>
            <p>Track average RR and keep risk discipline clear before, during and after trades.</p>
          </article>
        </div>

        <div class="product-window" aria-label="Entrack dashboard mockup">
          <div class="window-bar">
            <div class="window-dots"><span></span><span></span><span></span></div>
            <div class="window-pill">Entrack / Performance</div>
          </div>
          <div class="window-content">
            <div class="chart-panel">
              <div class="chart-label"><span>XAUUSD Replay</span><span>+8.4R this month</span></div>
              <div class="chart-line"></div>
              <div class="candle-row" aria-hidden="true">
                <span class="candle" style="height:44px"></span>
                <span class="candle" style="height:78px"></span>
                <span class="candle" style="height:56px"></span>
                <span class="candle" style="height:122px"></span>
                <span class="candle" style="height:92px"></span>
                <span class="candle" style="height:148px"></span>
                <span class="candle" style="height:110px"></span>
                <span class="candle" style="height:170px"></span>
                <span class="candle" style="height:132px"></span>
                <span class="candle" style="height:190px"></span>
                <span class="candle" style="height:154px"></span>
                <span class="candle" style="height:210px"></span>
              </div>
            </div>
            <aside class="side-panel">
              <div class="mini-panel"><span>Best session</span><strong>London Open</strong><p>Cleaner entries and strongest win rate.</p></div>
              <div class="mini-panel"><span>Main leak</span><strong>Late exits</strong><p>Winners cut too early after first pullback.</p></div>
              <div class="mini-panel"><span>Next focus</span><strong>Hold to 1:3</strong><p>Replay 20 examples before live trading.</p></div>
            </aside>
          </div>
        </div>
      </div>
    </section>

    <section class="section-block" id="modules">
      <div class="section-top">
        <div>
          <a class="section-kicker section-doc-link" href="/documentation/add-trade">Core tools</a>
          <h2 class="section-heading"><a class="heading-doc-link" href="/documentation/add-trade">Open only the tool you need right now.</a></h2>
        </div>
        <p class="section-copy">
          Move between journal, analytics, replay, broker coverage, and risk tools without breaking your workflow.
        </p>
      </div>

      <div class="module-shell">
        <div class="module-carousel" id="moduleCarousel">
          <article class="module-card is-open" style="--module-bg: url('https://images.unsplash.com/photo-1642790551116-18e150f248e8?auto=format&fit=crop&w=1000&q=80');">
            <div class="module-content">
              <div class="module-eyebrow">Journal</div>
              <h3>Trade Journal</h3>
              <p>Track every setup, screenshot, mistake and lesson in one clean trading workspace built for serious review.</p>
              <span class="module-cta">Explore module →</span>
            </div>
          </article>

          <article class="module-card" style="--module-bg: url('https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1000&q=80');">
            <div class="module-content">
              <div class="module-eyebrow">Analytics</div>
              <h3>Performance Analytics</h3>
              <p>See win rate, risk reward, daily PnL, mistakes and patterns without digging through messy spreadsheets.</p>
              <span class="module-cta">Explore module →</span>
            </div>
          </article>

          <article class="module-card" style="--module-bg: url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80');">
            <div class="module-content">
              <div class="module-eyebrow">Replay</div>
              <h3>Backtest Replay</h3>
              <p>Replay candles, place virtual trades, test strategy rules and build confidence before risking real capital.</p>
              <span class="module-cta">Explore module →</span>
            </div>
          </article>

          <article class="module-card" style="--module-bg: url('https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80');">
            <div class="module-content">
              <div class="module-eyebrow">Brokers</div>
              <h3>Broker Directory</h3>
              <p>Broker names, market type aur trading source ko journal aur analytics ke saath clean tarike se organise karo.</p>
              <span class="module-cta">Explore module →</span>
            </div>
          </article>

          <article class="module-card" style="--module-bg: url('https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=1000&q=80');">
            <div class="module-content">
              <div class="module-eyebrow">Risk</div>
              <h3>Risk Control</h3>
              <p>Keep risk visible with daily limits, position sizing, drawdown checks and rule-based trading stats.</p>
              <span class="module-cta">Explore module →</span>
            </div>
          </article>
        </div>
      </div>

      <div class="module-actions">
        <button class="module-nav-btn" id="modulePrev" type="button" aria-label="Previous module">‹</button>
        <button class="module-nav-btn" id="moduleNext" type="button" aria-label="Next module">›</button>
      </div>
    </section>

    <section class="section-block broker-block" id="brokers">
      <div class="section-top">
        <div>
          <a class="section-kicker section-doc-link" href="/documentation/brokers">Broker workspace</a>
          <h2 class="section-heading"><a class="heading-doc-link" href="/documentation/brokers">One clean view for every broker you trade with.</a></h2>
        </div>
        <p class="section-copy">
          Compare accounts, markets, and execution quality without switching tabs or losing context.
        </p>
      </div>

      <div class="broker-stage" aria-label="Broker coverage preview">
        <div class="broker-center-copy">
          <div class="broker-pill">connected review</div>
          <h3>Know where your edge performs best.</h3>
          <p>Bring broker activity into one calm dashboard and spot the accounts, symbols, and sessions that actually deserve your focus.</p>
        </div>

        <div class="broker-flow" aria-hidden="true">
          <div class="broker-track">
        <div class="broker-logo-card" style="--x:6%;--y:8%;--r:-2deg"><div class="broker-logo-mark broker-logo-mark--image"><img class="broker-logo-img" src="/assets/broker/exness%20image.svg" alt="Exness logo" loading="lazy" /></div><span class="broker-logo-name">Exness</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:27%;--y:5%;--r:2deg"><div class="broker-logo-mark">IC</div><span class="broker-logo-name">IC Markets</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:48%;--y:10%;--r:-1deg"><div class="broker-logo-mark">PP</div><span class="broker-logo-name">Pepperstone</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:70%;--y:7%;--r:3deg"><div class="broker-logo-mark">FP</div><span class="broker-logo-name">FP Markets</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:88%;--y:13%;--r:-2deg"><div class="broker-logo-mark broker-logo-mark--image"><img class="broker-logo-img" src="/assets/broker/xm.svg" alt="XM logo" loading="lazy" /></div><span class="broker-logo-name">XM</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:13%;--y:31%;--r:2deg"><div class="broker-logo-mark">OC</div><span class="broker-logo-name">Octa</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:35%;--y:36%;--r:-3deg"><div class="broker-logo-mark">HF</div><span class="broker-logo-name">HFM</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:57%;--y:30%;--r:2deg"><div class="broker-logo-mark">OA</div><span class="broker-logo-name">OANDA</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:79%;--y:35%;--r:-2deg"><div class="broker-logo-mark">FC</div><span class="broker-logo-name">FOREX.com</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:8%;--y:58%;--r:-2deg"><div class="broker-logo-mark">TK</div><span class="broker-logo-name">Tickmill</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:28%;--y:63%;--r:2deg"><div class="broker-logo-mark">AV</div><span class="broker-logo-name">AvaTrade</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:50%;--y:58%;--r:-2deg"><div class="broker-logo-mark">8C</div><span class="broker-logo-name">Eightcap</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:72%;--y:62%;--r:2deg"><div class="broker-logo-mark">FX</div><span class="broker-logo-name">FXTM</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:89%;--y:57%;--r:-1deg"><div class="broker-logo-mark broker-logo-mark--image"><img class="broker-logo-img" src="/assets/broker/vantage.svg" alt="Vantage logo" loading="lazy" /></div><span class="broker-logo-name">Vantage</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:18%;--y:83%;--r:-2deg"><div class="broker-logo-mark">BN</div><span class="broker-logo-name">Binance</span><span class="broker-logo-type">crypto exchange</span></div>
        <div class="broker-logo-card" style="--x:47%;--y:87%;--r:2deg"><div class="broker-logo-mark">BY</div><span class="broker-logo-name">Bybit</span><span class="broker-logo-type">crypto exchange</span></div>
        <div class="broker-logo-card" style="--x:64%;--y:82%;--r:-2deg"><div class="broker-logo-mark">OK</div><span class="broker-logo-name">OKX</span><span class="broker-logo-type">crypto exchange</span></div>
        <div class="broker-logo-card" style="--x:84%;--y:86%;--r:2deg"><div class="broker-logo-mark">IB</div><span class="broker-logo-name">Interactive Brokers</span><span class="broker-logo-type">global broker</span></div>
          </div>

          <div class="broker-track track-two">
        <div class="broker-logo-card" style="--x:10%;--y:5%;--r:2deg"><div class="broker-logo-mark">DN</div><span class="broker-logo-name">Dhan</span><span class="broker-logo-type">india broker</span></div>
        <div class="broker-logo-card" style="--x:34%;--y:8%;--r:-2deg"><div class="broker-logo-mark">ZR</div><span class="broker-logo-name">Zerodha</span><span class="broker-logo-type">india broker</span></div>
        <div class="broker-logo-card" style="--x:60%;--y:4%;--r:2deg"><div class="broker-logo-mark">UP</div><span class="broker-logo-name">Upstox</span><span class="broker-logo-type">india broker</span></div>
        <div class="broker-logo-card" style="--x:82%;--y:9%;--r:-2deg"><div class="broker-logo-mark">AG</div><span class="broker-logo-name">Angel One</span><span class="broker-logo-type">india broker</span></div>
        <div class="broker-logo-card" style="--x:5%;--y:29%;--r:-2deg"><div class="broker-logo-mark">DR</div><span class="broker-logo-name">Deriv</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:28%;--y:34%;--r:2deg"><div class="broker-logo-mark">FB</div><span class="broker-logo-name">FBS</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:48%;--y:28%;--r:-3deg"><div class="broker-logo-mark">RO</div><span class="broker-logo-name">RoboForex</span><span class="broker-logo-type">forex broker</span></div>
        <div class="broker-logo-card" style="--x:69%;--y:32%;--r:2deg"><div class="broker-logo-mark">TM</div><span class="broker-logo-name">TMGM</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:90%;--y:27%;--r:-2deg"><div class="broker-logo-mark">SK</div><span class="broker-logo-name">Skilling</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:14%;--y:56%;--r:2deg"><div class="broker-logo-mark">ET</div><span class="broker-logo-name">eToro</span><span class="broker-logo-type">multi asset</span></div>
        <div class="broker-logo-card" style="--x:37%;--y:60%;--r:-2deg"><div class="broker-logo-mark">SAX</div><span class="broker-logo-name">Saxo</span><span class="broker-logo-type">global broker</span></div>
        <div class="broker-logo-card" style="--x:59%;--y:55%;--r:2deg"><div class="broker-logo-mark">CM</div><span class="broker-logo-name">CMC Markets</span><span class="broker-logo-type">cfd broker</span></div>
        <div class="broker-logo-card" style="--x:80%;--y:61%;--r:-2deg"><div class="broker-logo-mark">IG</div><span class="broker-logo-name">IG</span><span class="broker-logo-type">global broker</span></div>
        <div class="broker-logo-card" style="--x:9%;--y:84%;--r:-2deg"><div class="broker-logo-mark">QS</div><span class="broker-logo-name">Questrade</span><span class="broker-logo-type">global broker</span></div>
        <div class="broker-logo-card" style="--x:31%;--y:89%;--r:2deg"><div class="broker-logo-mark">WB</div><span class="broker-logo-name">Webull</span><span class="broker-logo-type">stock broker</span></div>
        <div class="broker-logo-card" style="--x:54%;--y:83%;--r:-2deg"><div class="broker-logo-mark">RH</div><span class="broker-logo-name">Robinhood</span><span class="broker-logo-type">stock broker</span></div>
        <div class="broker-logo-card" style="--x:72%;--y:88%;--r:2deg"><div class="broker-logo-mark">MO</div><span class="broker-logo-name">moomoo</span><span class="broker-logo-type">stock broker</span></div>
        <div class="broker-logo-card" style="--x:92%;--y:82%;--r:-2deg"><div class="broker-logo-mark">TT</div><span class="broker-logo-name">TradeStation</span><span class="broker-logo-type">stock broker</span></div>
          </div>
        </div>

        <div class="broker-note">broker names only · no platform lock-in</div>
      </div>
    </section>

    <section class="section-block">
      <div class="final-cta">
        <div class="section-kicker" style="margin-left:auto;margin-right:auto;">Start cleaner</div>
        <h2>Make every trading day easier to review.</h2>
        <p>Entrack is for traders who want one focused place for trades, screenshots, broker list, replay and performance improvement.</p>
        <div class="actions final-actions">
          <button type="button">Start Tracking</button>
          <button type="button">View Demo</button>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div>
      <div class="brand" aria-label="Entrack footer"><span class="brand__mark">E</span><span>Entrack</span></div>
      <p class="footer-copy">Trading journal, broker coverage, analytics, and replay tools built for focused trade review.</p>
      <a class="footer-support-link" href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a>
    </div>

    <div class="site-footer-links">
      <a href="#features">Features</a>
      <a href="#dashboard-preview">Analytics</a>
      <a href="#modules">Modules</a>
      <a href="#brokers">Brokers</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <a href="${SUPPORT_MAILTO}">Support</a>
    </div>

    <div class="footer-bottom">© 2026 Entrack. Built for focused traders.</div>
  </footer>`;

export default landingMarkup;
