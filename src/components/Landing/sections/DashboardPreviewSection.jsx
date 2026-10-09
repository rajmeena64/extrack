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

          <div className="rounded-[32px] sm:rounded-[40px] border border-[#1f1f1f] bg-[#07070b]/90 backdrop-blur-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden" aria-label="Entrack dashboard mockup">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/60" />
                <span className="w-3 h-3 rounded-full bg-amber-500/60" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-slate-400 font-medium">
                Market Replay Terminal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 p-6 rounded-2xl bg-[#040407] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-mono text-slate-400 font-semibold">XAUUSD Replay (250ms Speed)</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2E90FA]/15 text-[#2E90FA] text-[11px] font-bold border border-[#2E90FA]/20">
                    +8.4R this session
                  </span>
                </div>
                <div className="h-0.5 w-full bg-gradient-to-r from-[#2563eb] to-[#60a5fa] mb-6 rounded-full" />
                <div className="flex items-end justify-between gap-2 h-36 px-2" aria-hidden="true">
                  {[44, 78, 56, 122, 92, 148, 110, 170, 132, 190, 154, 210].map((height, idx) => (
                    <span 
                      className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${idx % 2 === 0 ? 'bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[#2563eb] shadow-[0_0_10px_rgba(37,99,235,0.3)]'}`}
                      style={{ height: `${height * 0.6}px` }} 
                      key={idx} 
                    />
                  ))}
                </div>
              </div>

              <aside className="md:col-span-4 flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-[#090909] border border-[#1f1f1f]">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#2E90FA]/10 text-[#2E90FA] text-[10px] font-bold uppercase tracking-wider mb-1">Speed Control</span>
                  <strong className="block text-sm font-bold text-white mb-1">1x - 100x Replay</strong>
                  <p className="text-xs text-slate-400">Tick by tick execution with responsive control.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#090909] border border-[#1f1f1f]">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#2E90FA]/10 text-[#2E90FA] text-[10px] font-bold uppercase tracking-wider mb-1">Order Routing</span>
                  <strong className="block text-sm font-bold text-white mb-1">Level II Tape</strong>
                  <p className="text-xs text-slate-400">Simulate bids, asks and market orders.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#090909] border border-[#1f1f1f]">
                  <span className="inline-block px-2 py-0.5 rounded bg-[#2E90FA]/10 text-[#2E90FA] text-[10px] font-bold uppercase tracking-wider mb-1">Session Playlists</span>
                  <strong className="block text-sm font-bold text-white mb-1">Past Setups</strong>
                  <p className="text-xs text-slate-400">Replay trades to build execution discipline.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
