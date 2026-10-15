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
    <div className="min-h-screen bg-[#000000] text-[#f8fafc] relative overflow-hidden antialiased selection:bg-[#2563eb]/30 selection:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" aria-hidden="true" />
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
