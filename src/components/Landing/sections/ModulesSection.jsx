import React from 'react';

export function ModulesSection({ modules = [] }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-28 relative z-10" id="modules">
      <div className="max-w-[880px] mx-auto text-center flex flex-col gap-4 mb-14 sm:mb-20">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-[2px] text-[#2E90FA]">
          Unified Trading Suite
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-2px] text-[#ececec] leading-[1.1]">
          Essential tools built for serious review.
        </h2>
        <p className="text-base sm:text-xl font-normal text-[#cacaca] leading-relaxed max-w-2xl mx-auto">
          Move seamlessly between journal, analytics, replay, broker sync, and risk management in one cohesive workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {modules.map((item) => (
          <article
            className="group relative flex flex-col justify-between rounded-[32px] sm:rounded-[36px] bg-[#090909] border border-[#1f1f1f] p-8 sm:p-10 min-h-[300px] sm:min-h-[340px] overflow-hidden transition-all duration-300 hover:border-[#2E90FA]/40 hover:bg-[#0c0d12] hover:shadow-[0_0_35px_rgba(46,144,250,0.12)]"
            key={item.title}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 p-2.5 flex items-center justify-center group-hover:scale-105 group-hover:border-[#2E90FA]/40 transition-all">
                <img src={item.icon} alt="" className="w-full h-full object-contain" aria-hidden="true" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E90FA] px-3 py-1 rounded-lg bg-[#2E90FA]/[0.12] backdrop-blur-[40px]">
                {item.eyebrow}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 my-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-[#60a5fa] transition-colors">
                {item.title}
              </h3>
              <p className="text-sm sm:text-base text-[#cacaca] font-normal leading-relaxed">
                {item.text}
              </p>
            </div>
            <a
              href={item.href || '/demo'}
              className="mt-auto inline-flex items-center gap-2 text-xs font-bold text-[#2E90FA] group-hover:text-white transition-colors"
            >
              <span>Explore tool</span>
              <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

