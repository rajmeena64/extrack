import React from 'react';
import { WordRotate } from '../components/WordRotate';

export function FeatureSection({ onViewDemo }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-28 relative z-10" id="features">
      <div className="max-w-[880px] mx-auto text-center flex flex-col gap-4 mb-14 sm:mb-20">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-[2px] text-[#2E90FA]">
          Core Review Workflow
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-2px] text-[#ececec] leading-[1.1]">
          Everything you need to review your{' '}
          <WordRotate
            words={['trading.', 'discipline.', 'strategies.', 'performance.']}
            className="bg-gradient-to-r from-[#2E90FA] via-[#60A5FA] to-[#93C5FD] bg-clip-text text-transparent"
          />
        </h2>
        <p className="text-base sm:text-xl font-normal text-[#cacaca] leading-relaxed max-w-2xl mx-auto">
          Journal, broker coverage, analytics, and replay in one unified trading workspace.
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button className="px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all" type="button" onClick={onViewDemo}>
            View Interactive Demo
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -left-24 lg:-left-44 top-1/2 -translate-y-1/2 w-[800px] lg:w-[1100px] h-[600px] lg:h-[750px] bg-[radial-gradient(ellipse_at_center,rgba(225,29,72,0.55)_0%,rgba(231,61,138,0.28)_40%,transparent_70%)] blur-[90px] -z-10" aria-hidden="true" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
          <article className="group relative flex flex-col justify-between rounded-[32px] sm:rounded-[40px] bg-[#090909] border border-[#1f1f1f] p-8 sm:p-12 min-h-[520px] sm:min-h-[580px] overflow-hidden transition-all duration-300 hover:border-white/20">
            <div className="flex flex-col gap-4 z-10">
              <span className="w-fit text-xs font-bold uppercase tracking-[1px] text-[#2E90FA] px-3.5 py-1.5 rounded-lg bg-[#2E90FA]/[0.12] backdrop-blur-[40px]">
                Replay Simulator
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Market Replay &amp; Execution Engine
              </h3>
            </div>
            <div className="relative w-full h-[300px] sm:h-[380px] mt-8 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050608] border border-white/[0.06]">
              <img className="w-full h-full object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105" src="/assets/landing/market-terminal.png" alt="Market Replay Simulator" loading="lazy" decoding="async" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
              <a href="/features/replay" className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-[#13151b]/90 border border-white/[0.08] backdrop-blur-md flex items-center justify-center text-white transition-all duration-300 group-hover:bg-[#2563eb] group-hover:border-[#2563eb]" aria-label="Explore Replay Simulator">
                <svg className="w-4 h-4 stroke-current fill-none stroke-[2.5] -rotate-45" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </article>

          <article className="group relative flex flex-col justify-between rounded-[32px] sm:rounded-[40px] bg-[#090909] border border-[#1f1f1f] p-8 sm:p-12 min-h-[520px] sm:min-h-[580px] overflow-hidden transition-all duration-300 hover:border-white/20">
            <div className="flex flex-col gap-4 z-10">
              <span className="w-fit text-xs font-bold uppercase tracking-[1px] text-emerald-400 px-3.5 py-1.5 rounded-lg bg-emerald-500/[0.12] backdrop-blur-[40px]">
                Advanced Analytics
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                P&amp;L Calendar &amp; Performance Heatmaps
              </h3>
            </div>
            <div className="relative w-full h-[300px] sm:h-[380px] mt-8 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050608] border border-white/[0.06]">
              <img className="w-full h-full object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105" src="/assets/landing/pnl-calendar.png" alt="P&L Calendar Analytics" loading="lazy" decoding="async" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
              <a href="/analytics" className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-[#13151b]/90 border border-white/[0.08] backdrop-blur-md flex items-center justify-center text-white transition-all duration-300 group-hover:bg-[#2563eb] group-hover:border-[#2563eb]" aria-label="Explore Analytics">
                <svg className="w-4 h-4 stroke-current fill-none stroke-[2.5] -rotate-45" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
