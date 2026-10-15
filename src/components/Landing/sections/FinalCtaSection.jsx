import React from 'react';

export function FinalCtaSection({ onStartTracking, onGetStarted, onViewDemo }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-28 relative z-10">
      <div className="relative rounded-[32px] sm:rounded-[40px] border border-[#1f1f1f] bg-[#090909] p-10 sm:p-20 text-center overflow-hidden shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.18),transparent_65%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-[880px] mx-auto">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-[2px] text-[#2E90FA]">
            Take Control of Your Edge
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-[-2px] leading-[1.1]">
            Make every trading day easier to review.
          </h2>
          <p className="text-base sm:text-xl font-normal text-[#cacaca] leading-relaxed max-w-2xl mx-auto my-2">
            Entrack brings journaling, performance analytics, multi-broker sync, and replay simulation into one unified workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4 w-full sm:w-auto">
            <button 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_0_30px_rgba(37,99,235,0.35)] transition-all" 
              type="button" 
              onClick={onStartTracking || onGetStarted}
            >
              Start Free Tracking
            </button>
            <button 
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold text-slate-200 border border-white/10 hover:border-[#2563eb]/40 hover:bg-white/[0.05] transition-all" 
              type="button" 
              onClick={onViewDemo}
            >
              View Interactive Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

