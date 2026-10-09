import React from 'react';
import { Badge } from '@/components/ui/badge';

export function FinalCtaSection({ onStartTracking, onGetStarted, onViewDemo }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-24 relative z-10">
      <div className="relative rounded-[36px] sm:rounded-[48px] border border-[#1f1f1f] bg-gradient-to-b from-[#0a1020] via-[#050811] to-[#090909] p-10 sm:p-20 text-center overflow-hidden shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.15),transparent_70%)]" aria-hidden="true" />
        <div className="relative z-10 flex justify-center mb-6">
          <Badge variant="brand" size="lg">
            Start cleaner
          </Badge>
        </div>
        <h2 className="relative z-10 text-3xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto mb-6">
          Make every trading day easier to review.
        </h2>
        <p className="relative z-10 text-sm sm:text-base text-slate-400 font-medium max-w-xl mx-auto leading-relaxed mb-10">
          Entrack is for traders who want one focused place for trades, screenshots, broker list, replay and performance improvement.
        </p>
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_4px_24px_rgba(37,99,235,0.45)] transition-all" 
            type="button" 
            onClick={onStartTracking || onGetStarted}
          >
            Start Tracking
          </button>
          <button 
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-semibold text-slate-300 border border-white/10 hover:border-[#2563eb]/40 hover:bg-white/[0.06] transition-all" 
            type="button" 
            onClick={onViewDemo}
          >
            View Demo
          </button>
        </div>
      </div>
    </section>
  );
}
