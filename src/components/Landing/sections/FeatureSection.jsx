import React from 'react';
import { WordRotate } from '../components/WordRotate';
import { Badge } from '@/components/ui';

const cards = [
  {
    tag: 'TRAINING',
    image: '/assets/landing/market-terminal.png',
    title: 'Backtest Strategies.',
    text: 'Replay past market days with realistic simulator execution.',
    href: '/features/replay',
  },
  {
    tag: 'JOURNAL',
    image: '/assets/landing/trades-list.png',
    title: 'Track Every Trade.',
    text: 'Log entries, exits, screenshots, and discipline in one view.',
    href: '/features/journal',
  },
  {
    tag: 'ANALYTICS',
    image: '/assets/landing/pnl-calendar.png',
    title: 'Smart Decisions.',
    text: 'Uncover win rate, risk-reward, and behavioral edge instantly.',
    href: '/analytics',
  },
];

export function FeatureSection({ onViewDemo }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-12 sm:py-16 relative z-10" id="features">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <a className="inline-block mb-3 hover:opacity-90 transition-opacity" href="/documentation/journal">
            <Badge variant="brand" size="lg">
              Core workflow
            </Badge>
          </a>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            <a className="hover:opacity-95 transition-opacity" href="/documentation/journal">
              Everything you need to review your{' '}
              <WordRotate
                words={['trading.', 'discipline.', 'strategies.', 'performance.']}
                className="bg-gradient-to-r from-[#2E90FA] via-[#60A5FA] to-[#93C5FD] bg-clip-text text-transparent"
              />
            </a>
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:text-right">
          <button className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-200 border border-white/10 hover:border-[#2563eb]/40 hover:bg-white/[0.05] transition-all" type="button" onClick={onViewDemo}>
            View Demo
          </button>
          <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-xs">
            Journal, broker coverage, analytics, and replay in one trading workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <article 
            className="group relative flex flex-col rounded-[28px] sm:rounded-[36px] bg-[#090909] border border-[#1f1f1f] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-white/20" 
            key={card.tag}
          >
            <div className="relative w-full h-[270px] sm:h-[290px] overflow-hidden bg-[#060608]">
              <img 
                className="w-full h-full object-cover object-top opacity-90 transition-transform duration-500 group-hover:scale-105" 
                src={card.image} 
                alt={card.title} 
                loading="lazy" 
                decoding="async" 
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
              <a 
                href={card.href} 
                className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#131313]/90 border border-white/[0.08] backdrop-blur-md flex items-center justify-center text-white transition-all duration-300 group-hover:bg-[#2563eb] group-hover:border-[#2563eb]"
                aria-label={`Open ${card.title}`}
              >
                <svg className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5] -rotate-45" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>

            <div className="p-6 sm:p-7 pt-4 sm:pt-5 flex flex-col gap-2 bg-[#090909]">
              <span className="w-fit text-[11px] font-bold uppercase leading-4 tracking-[0.04em] text-[#e73d8a] px-2.5 py-1 rounded-[6px] bg-[rgba(231,61,138,0.12)] backdrop-blur-[40px]">
                {card.tag}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-[#cacaca] leading-relaxed">
                {card.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
