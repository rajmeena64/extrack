import React from 'react';
import { featureCards, statCards, modules, brokerTracks } from './data/landingData';
import { HeroSection } from './sections/HeroSection';
import { FeatureSection } from './sections/FeatureSection';
import { ImagePeekSection } from './sections/ImagePeekSection';
import { DashboardPreviewSection } from './sections/DashboardPreviewSection';
import { ModulesSection } from './sections/ModulesSection';
import { BrokerConnectionSection } from './sections/BrokerConnectionSection';
import { BrokerTrackSection } from './sections/BrokerTrackSection';
import { FinalCtaSection } from './sections/FinalCtaSection';
import { LandingFooter } from './sections/LandingFooter';

function LandingHome({ onLogin, onSignUp, onStartTracking, onGetStarted, onViewDemo }) {
  return (
    <div className="min-h-screen bg-[#000000] text-[#f8fafc] relative overflow-hidden antialiased">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-10%,rgba(37,99,235,0.14),transparent_65%),radial-gradient(ellipse_50%_35%_at_90%_45%,rgba(30,58,138,0.08),transparent_60%),radial-gradient(ellipse_70%_30%_at_50%_100%,rgba(37,99,235,0.07),transparent_70%)]" aria-hidden="true" />
      <main className="relative z-10">
        <HeroSection onLogin={onLogin} onSignUp={onSignUp} />
        <FeatureSection featureCards={featureCards} onViewDemo={onViewDemo} />
        <ImagePeekSection />
        <DashboardPreviewSection statCards={statCards} />
        <ModulesSection modules={modules} />
        <BrokerConnectionSection />
        <BrokerTrackSection brokerTracks={brokerTracks} />
        <FinalCtaSection onStartTracking={onStartTracking} onGetStarted={onGetStarted} onViewDemo={onViewDemo} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingHome;
