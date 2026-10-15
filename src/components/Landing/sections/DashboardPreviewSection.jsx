import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

function NumberTicker({ value, decimals = 0 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / 1400, 1);
          setVal(value * (1 - Math.pow(1 - p, 3)));
          if (p < 1) anim = requestAnimationFrame(tick);
          else setVal(value);
        };
        anim = requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (anim) cancelAnimationFrame(anim);
    };
  }, [value]);
  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US')}</span>;
}

export function DashboardPreviewSection({ statCards }) {
  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-24 relative z-10" id="dashboard-preview">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        <div className="lg:col-span-4 lg:sticky lg:top-24 self-start flex flex-col gap-4">
          <div>
            <a className="inline-block mb-4 hover:opacity-90 transition-opacity" href="/documentation/dashboard">
              <Badge variant="brand" size="lg">
                Performance overview
              </Badge>
            </a>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              <a className="hover:opacity-95 transition-opacity" href="/documentation/dashboard">
                Your stats should feel readable, not noisy.
              </a>
            </h2>
          </div>
          <p className="text-sm font-medium text-slate-400 leading-relaxed">
            Monitor account health, risk, sessions, and repeatable performance patterns without distraction.
          </p>
          <div className="pt-4 hidden lg:flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span>Real-time Risk Adherence</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#2E90FA] shadow-[0_0_8px_#2E90FA]" />
              <span>Tick-by-Tick Replay Terminal</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((card) => {
              const m = card.metric.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
              return (
                <article 
                  className="relative p-6 rounded-[28px] border border-[#1f1f1f] bg-[#090909] backdrop-blur-xl transition-all duration-300 hover:border-[#2563eb]/40 flex flex-col justify-between"
                  key={card.label}
                >
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
                    <span>{card.label}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-white tracking-tight mb-2">
                      {m ? (
                        <>
                          {m[1]}
                          <NumberTicker value={parseFloat(m[2])} decimals={m[2].includes('.') ? m[2].split('.')[1].length : 0} />
                          {m[3]}
                        </>
                      ) : (
                        card.metric
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">{card.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="rounded-[32px] sm:rounded-[40px] border border-[#1f1f1f] bg-[#090909] p-6 sm:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden" aria-label="Entrack dashboard mockup">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-300 font-medium">
                Live Terminal &amp; Replay Engine
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 rounded-2xl sm:rounded-3xl overflow-hidden bg-[#050608] border border-white/[0.08] relative group/preview min-h-[300px] sm:min-h-[380px]">
                <img
                  className="w-full h-full object-cover object-top opacity-95 transition-transform duration-500 group-hover/preview:scale-[1.02]"
                  src="/assets/landing/market-terminal.png"
                  alt="Market Replay Terminal"
                  loading="lazy"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent opacity-60" />
              </div>

              <aside className="lg:col-span-4 flex flex-col gap-4">
                <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f1f1f] hover:border-[#2E90FA]/30 transition-colors">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#2E90FA]/10 text-[#2E90FA] text-[11px] font-bold uppercase tracking-wider mb-2">Speed Control</span>
                  <strong className="block text-base font-bold text-white mb-1">1x - 100x Replay</strong>
                  <p className="text-xs sm:text-sm text-[#cacaca] leading-relaxed">Tick-by-tick market simulation with granular playback control.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f1f1f] hover:border-[#2E90FA]/30 transition-colors">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#2E90FA]/10 text-[#2E90FA] text-[11px] font-bold uppercase tracking-wider mb-2">Order Routing</span>
                  <strong className="block text-base font-bold text-white mb-1">Simulated Execution</strong>
                  <p className="text-xs sm:text-sm text-[#cacaca] leading-relaxed">Practice limit and stop orders without risking real capital.</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f1f1f] hover:border-[#2E90FA]/30 transition-colors">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#2E90FA]/10 text-[#2E90FA] text-[11px] font-bold uppercase tracking-wider mb-2">Review Loop</span>
                  <strong className="block text-base font-bold text-white mb-1">Historical Sessions</strong>
                  <p className="text-xs sm:text-sm text-[#cacaca] leading-relaxed">Revisit key past setups to build unbreakable trade discipline.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
