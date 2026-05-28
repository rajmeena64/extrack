import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import TrustStrip from './TrustStrip';
import BrokerSlider from './BrokerSlider';
import ProblemSection from './ProblemSection';
import FeatureSection from './FeatureSection';
import WorkflowSection from './WorkflowSection';
import SpotlightSection from './SpotlightSection';
import CalendarSection from './CalendarSection';
import MarketIntelligence from './MarketIntelligence';
import PricingSection from './PricingSection';
import LandingFooter from './LandingFooter';
import { landingImages } from './LandingData';
import './LandingPage.css';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));

function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const revealRefs = useRef([]);

  useEffect(() => {
    // Safety Fallback: 1.5s baad sab dikha do agar JS/Observer slow hai
    const fallbackTimer = setTimeout(() => {
      document.querySelectorAll('.reveal:not(.active)').forEach(el => {
        el.classList.add('active');
      });
    }, 1500);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.01,
        rootMargin: '0px 0px 100px 0px' 
      }
    );

    const currentRefs = revealRefs.current;
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      clearTimeout(fallbackTimer);
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const addToRevealRefs = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  const handleSignIn = () => {
    setShowLoginModal(true);
  };

  return (
    <div className="landing-page-body">
      <LandingNavbar 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode} 
        onSignIn={handleSignIn}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      
      <HeroSection onCTA={handleSignIn} />
      
      <TrustStrip />
      
      <BrokerSlider revealRef={addToRevealRefs} />
      
      <ProblemSection revealRef={addToRevealRefs} />
      
      <FeatureSection revealRef={addToRevealRefs} />
      
      <WorkflowSection revealRef={addToRevealRefs} />
      
      <SpotlightSection
        revealRef={addToRevealRefs}
        id="replay"
        title="Practice the market"
        highlight="before risking real money"
        description="Entrack Replay allows you to backtest your strategies in a live-market environment. No more scrolling back on static charts—relive every tick."
        image={landingImages.spotlightReplay}
        imageAlt="Replay Mode"
      >
        <div className="space-y-sm">
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary">speed</span>
            <span className="font-body-md">Variable speed control up to 500x</span>
          </div>
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary">ads_click</span>
            <span className="font-body-md">Simulated Buy/Sell buttons with auto-P&L calculation</span>
          </div>
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-primary">save</span>
            <span className="font-body-md">Save backtest sessions to your main journal</span>
          </div>
        </div>
      </SpotlightSection>

      <SpotlightSection
        revealRef={addToRevealRefs}
        title="Journal every trade with"
        highlight="absolute context"
        description="Stop relying on memory. Document the 'Why' behind every execution so you can spot your psychological triggers."
        image={landingImages.spotlightJournal}
        imageAlt="Trading Journal"
        reverse={true}
        background=""
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div className="glass-panel p-md rounded">
            <p className="font-data-mono text-primary">Mistake Tagging</p>
            <p className="text-body-sm opacity-60">FOMO, Early Exit, Over-leveraging</p>
          </div>
          <div className="glass-panel p-md rounded">
            <p className="font-data-mono text-primary">Setup Filtering</p>
            <p className="text-body-sm opacity-60">Break & Retest, Supply/Demand</p>
          </div>
        </div>
      </SpotlightSection>

      <SpotlightSection
        revealRef={addToRevealRefs}
        id="analytics"
        title="Know exactly what"
        highlight="improves your performance"
        description="Advanced metrics that go beyond simple P&L. Understand your expectation and profit factors at a granular level."
        image={landingImages.spotlightAnalytics}
        imageAlt="Performance Analytics"
      >
        <div className="space-y-sm bg-surface-container p-lg rounded-xl border border-outline-variant/20">
          <div className="flex justify-between items-center py-sm border-b border-outline-variant/10">
            <span className="text-on-surface-variant">Expectancy per Trade</span>
            <span className="font-data-mono text-primary">+$142.50</span>
          </div>
          <div className="flex justify-between items-center py-sm border-b border-outline-variant/10">
            <span className="text-on-surface-variant">Max Drawdown</span>
            <span className="font-data-mono text-error">-4.2%</span>
          </div>
          <div className="flex justify-between items-center py-sm">
            <span className="text-on-surface-variant">Profit Factor</span>
            <span className="font-data-mono text-primary">1.82</span>
          </div>
        </div>
      </SpotlightSection>
      
      <CalendarSection revealRef={addToRevealRefs} />
      
      <MarketIntelligence revealRef={addToRevealRefs} />
      
      <PricingSection revealRef={addToRevealRefs} onCTA={handleSignIn} />
      
      <LandingFooter />

      <Suspense fallback={null}>
        <UserLoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </Suspense>
    </div>
  );
}

export default LandingPage;
