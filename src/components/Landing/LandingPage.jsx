import React, { lazy, Suspense, useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, ShieldCheck, UploadCloud } from 'lucide-react';

import Logo from '../Common/Logo';
import './LandingPage.css';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));

const previewRows = [
  { symbol: 'XAUUSD', setup: 'Breakout retest', pnl: '+$248.20', tone: 'profit' },
  { symbol: 'EURUSD', setup: 'London pullback', pnl: '+$92.40', tone: 'profit' },
  { symbol: 'NAS100', setup: 'Late chase', pnl: '-$36.10', tone: 'loss' },
];

function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Logo className="landing-nav__brand" />
        <button className="landing-nav__login" type="button" onClick={() => setShowLoginModal(true)}>
          Sign in
        </button>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-hero__eyebrow">Trade review, without the spreadsheet drag</span>
          <h1>Know what your trading is really doing.</h1>
          <p>
            EXTrack brings imports, P&L, calendar review, and setup tracking into one calm dashboard
            built for traders who want clarity after every session.
          </p>

          <div className="landing-hero__actions">
            <button className="landing-primary" type="button" onClick={() => setShowLoginModal(true)}>
              Start tracking
              <ArrowRight size={18} />
            </button>
            <button className="landing-secondary" type="button" onClick={() => setShowLoginModal(true)}>
              I already have an account
            </button>
          </div>
        </div>

        <div className="landing-preview" aria-label="Dashboard preview">
          <div className="landing-preview__topbar">
            <span />
            <span />
            <span />
          </div>

          <div className="landing-preview__metrics">
            <div>
              <small>Total P&L</small>
              <strong>$3,482</strong>
              <span>+18.4% this month</span>
            </div>
            <div>
              <small>Win rate</small>
              <strong>62%</strong>
              <span>42 / 68 trades</span>
            </div>
            <div>
              <small>Profit factor</small>
              <strong>1.86</strong>
              <span>Stable edge</span>
            </div>
          </div>

          <div className="landing-preview__body">
            <div className="landing-preview__chart">
              <div className="landing-preview__chart-line" />
            </div>

            <div className="landing-preview__trades">
              {previewRows.map((trade) => (
                <div className="landing-preview__trade" key={trade.symbol}>
                  <div>
                    <strong>{trade.symbol}</strong>
                    <span>{trade.setup}</span>
                  </div>
                  <em className={`landing-preview__pnl landing-preview__pnl--${trade.tone}`}>
                    {trade.pnl}
                  </em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" aria-label="Product features">
        <article>
          <UploadCloud size={20} />
          <strong>Import fast</strong>
          <span>Manual, CSV, and sync workflows stay in one place.</span>
        </article>
        <article>
          <BarChart3 size={20} />
          <strong>Read the edge</strong>
          <span>Track win rate, expectancy, and performance trends.</span>
        </article>
        <article>
          <CalendarDays size={20} />
          <strong>Review by day</strong>
          <span>Spot streaks and weak sessions on a trading calendar.</span>
        </article>
        <article>
          <ShieldCheck size={20} />
          <strong>Stay focused</strong>
          <span>A quiet dashboard for repeat review, not distraction.</span>
        </article>
      </section>

      <Suspense fallback={null}>
        <UserLoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </Suspense>
    </main>
  );
}

export default LandingPage;
