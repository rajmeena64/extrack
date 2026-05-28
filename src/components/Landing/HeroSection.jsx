import React from 'react';

const HeroSection = ({ onCTA }) => {
  return (
    <section className="front-hero text-center">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.14)_0%,transparent_64%)]"></div>
      </div>
      <div className="relative z-10 fade-in hero-shell">
        {/* Navbar is passed as child or sibling in LandingPage.jsx, but hero-shell contains the stage */}
        <div className="hero-stage">
          <div className="hero-bg-word" aria-hidden="true">
            Entrack
          </div>
          <div className="hero-dots left" aria-hidden="true"></div>
          <div className="hero-dots right" aria-hidden="true"></div>
          
          <svg
            className="hero-chart"
            viewBox="0 0 1500 300"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="heroChartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#007aff" stopOpacity="0.24" />
                <stop offset="72%" stopColor="#007aff" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#007aff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 225 L40 175 L65 198 L96 138 L118 174 L160 142 L230 155 L280 105 L340 58 L365 108 L430 165 L520 210 L560 182 L605 198 L650 185 L705 178 L760 166 L828 142 L900 84 L960 66 L990 95 L1020 30 L1060 98 L1115 176 L1148 142 L1172 198 L1217 42 L1230 84 L1290 128 L1322 250 L1335 196 L1360 275 L1380 260 L1400 224 L1425 255 L1455 188 L1500 232"
              fill="none"
              stroke="#007aff"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M0 225 L40 175 L65 198 L96 138 L118 174 L160 142 L230 155 L280 105 L340 58 L365 108 L430 165 L520 210 L560 182 L605 198 L650 185 L705 178 L760 166 L828 142 L900 84 L960 66 L990 95 L1020 30 L1060 98 L1115 176 L1148 142 L1172 198 L1217 42 L1230 84 L1290 128 L1322 250 L1335 196 L1360 275 L1380 260 L1400 224 L1425 255 L1455 188 L1500 232 L1500 300 L0 300 Z"
              fill="url(#heroChartFill)"
            />
          </svg>

          <div className="hero-content">
            <div className="hero-pill">
              <span className="material-symbols-outlined text-[16px] text-primary">
                auto_graph
              </span>{' '}
              Trading Journal <span className="text-primary font-semibold">Platform</span>
            </div>
            <h1 className="hero-title">
              Trading journal, replay, and analytics for <span className="text-primary">serious traders.</span>
            </h1>
            <p className="hero-copy">
              Track every trade, review setups, replay market sessions, and improve performance from one
              focused workspace.
            </p>
            
            <div className="hero-feature-grid">
              <div className="hero-feature-wrapper">
                <div className="hero-feature-card">
                  <div className="hero-feature-icon">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <div>
                    <div className="hero-feature-title">Journal Trades</div>
                    <div className="hero-feature-copy">
                      Log every trade with context, screenshots, and setup notes.
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-feature-wrapper">
                <div className="hero-feature-card">
                  <div className="hero-feature-icon">
                    <span className="material-symbols-outlined">play_circle</span>
                  </div>
                  <div>
                    <div className="hero-feature-title">Replay Setups</div>
                    <div className="hero-feature-copy">
                      Revisit market sessions and study your decision-making bar by bar.
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-feature-wrapper">
                <div className="hero-feature-card">
                  <div className="hero-feature-icon">
                    <span className="material-symbols-outlined">query_stats</span>
                  </div>
                  <div>
                    <div className="hero-feature-title">Performance Analytics</div>
                    <div className="hero-feature-copy">
                      Analyze results and quickly see what actually works.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <button onClick={onCTA} className="hero-cta">
              Try Free Trial <span aria-hidden="true">→</span>
            </button>
          </div>

          <a href="#features" className="scroll-indicator" aria-label="Scroll down">
            <span>Scroll</span>
            <span className="material-symbols-outlined">expand_more</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
