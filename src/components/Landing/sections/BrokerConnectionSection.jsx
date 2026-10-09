import React, { useRef } from 'react';
import { AnimatedBeam } from '../components/AnimatedBeam';
import { DotPattern } from '../components/DotPattern';
import { Badge } from '@/components/ui';
import { BookOpenCheck, ChartLine, LayoutDashboard, BadgeCheck, RefreshCw, Grid2x2 } from '@/icons';

const brokers = [
  { name: 'Zerodha', logo: '/assets/provider-logo/logos/zerodha.png' },
  { name: 'Binance', logo: '/assets/provider-logo/logos/binance.svg' },
  { name: 'Bybit', logo: '/assets/provider-logo/logos/bybit.svg' },
  { name: 'Dhan', logo: '/assets/provider-logo/logos/dhan.svg' },
  { name: 'Exness', logo: '/assets/provider-logo/logos/exness.svg' },
];

const outputs = [
  { name: 'Trade Journal', icon: BookOpenCheck, color: 'text-sky-400', hover: 'hover:border-sky-500/60 hover:shadow-sky-500/20' },
  { name: 'Performance Analytics', icon: ChartLine, color: 'text-emerald-400', hover: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20' },
  { name: 'Live Dashboard', icon: LayoutDashboard, color: 'text-amber-400', hover: 'hover:border-amber-500/60 hover:shadow-amber-500/20' },
];

function CircleNode({ innerRef, src, icon: Icon, label, color, hover = 'hover:border-blue-500/60 hover:shadow-blue-500/20' }) {
  return (
    <div
      ref={innerRef}
      className={`group relative z-10 flex size-12 sm:size-14 items-center justify-center rounded-full border border-white/10 bg-[#111116] p-2.5 shadow-xl transition-all duration-300 ${hover} hover:scale-110 hover:shadow-2xl cursor-pointer`}
    >
      {src ? (
        <img src={src} alt={label} className="w-full h-full object-contain rounded-full" loading="lazy" />
      ) : Icon ? (
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color || 'text-slate-300'} transition-transform group-hover:scale-110`} />
      ) : null}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[11px] font-semibold text-white bg-black/90 px-2.5 py-0.5 rounded-lg border border-white/10 whitespace-nowrap z-30 shadow-lg scale-95 group-hover:scale-100">
        {label}
      </span>
    </div>
  );
}

export function BrokerConnectionSection() {
  const containerRef = useRef(null);
  const b0 = useRef(null);
  const b1 = useRef(null);
  const b2 = useRef(null);
  const b3 = useRef(null);
  const b4 = useRef(null);
  const hubRef = useRef(null);
  const o0 = useRef(null);
  const o1 = useRef(null);
  const o2 = useRef(null);

  const brokerRefs = [b0, b1, b2, b3, b4];
  const outputRefs = [o0, o1, o2];

  return (
    <section className="w-full py-20 sm:py-28 relative z-10 overflow-hidden" id="sync">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-1/2 overflow-hidden"
        aria-hidden="true"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 55%, transparent 100%)',
          maskImage: 'linear-gradient(to right, #000 0%, #000 55%, transparent 100%)',
        }}
      >
        <DotPattern
          width={28}
          height={28}
          cr={1.5}
          className="text-white/[0.22]"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, #000 30%, transparent 95%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, #000 30%, transparent 95%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, #000 25%, transparent 95%)',
            maskImage: 'radial-gradient(ellipse 90% 70% at 50% 50%, #000 25%, transparent 95%)',
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[450px] rounded-full bg-red-600/[0.05] blur-[150px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[350px] h-[300px] rounded-full bg-rose-500/[0.03] blur-[130px]" />
        </div>
      </div>
      <div className="w-full max-w-[1360px] mx-auto px-6 sm:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center justify-center">
          <div className="lg:col-span-6 w-full max-w-[560px] mx-auto lg:mx-0">
            <div
              ref={containerRef}
              className="relative w-full h-[400px] sm:h-[460px] flex items-center justify-between px-2 sm:px-6"
            >
              <div className="flex flex-col justify-between h-full py-4 z-10">
                {brokers.map((b, i) => (
                  <CircleNode key={b.name} innerRef={brokerRefs[i]} src={b.logo} label={b.name} />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center z-10">
                <CircleNode
                  innerRef={hubRef}
                  src="/assets/applogo/entrack_dna_light_icon.svg"
                  label="Entrack Engine"
                />
              </div>

              <div className="flex flex-col justify-around h-full py-8 z-10">
                {outputs.map((o, i) => (
                  <CircleNode key={o.name} innerRef={outputRefs[i]} icon={o.icon} label={o.name} color={o.color} hover={o.hover} />
                ))}
              </div>

              <AnimatedBeam containerRef={containerRef} fromRef={b0} toRef={hubRef} curvature={60} duration={3.5} delay={0} />
              <AnimatedBeam containerRef={containerRef} fromRef={b1} toRef={hubRef} curvature={30} duration={3.5} delay={0.4} />
              <AnimatedBeam containerRef={containerRef} fromRef={b2} toRef={hubRef} curvature={0} duration={3.5} delay={0.8} />
              <AnimatedBeam containerRef={containerRef} fromRef={b3} toRef={hubRef} curvature={-30} duration={3.5} delay={1.2} />
              <AnimatedBeam containerRef={containerRef} fromRef={b4} toRef={hubRef} curvature={-60} duration={3.5} delay={1.6} />

              <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={o0} curvature={-35} duration={3} delay={0.6} gradientStartColor="#38bdf8" gradientStopColor="#0284c7" />
              <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={o1} curvature={0} duration={3} delay={1.1} gradientStartColor="#34d399" gradientStopColor="#059669" />
              <AnimatedBeam containerRef={containerRef} fromRef={hubRef} toRef={o2} curvature={35} duration={3} delay={1.6} gradientStartColor="#fbbf24" gradientStopColor="#d97706" />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center max-w-[560px] mx-auto lg:mx-0">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="brand" size="md">
                instant sync engine
              </Badge>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Connect your entire trading ecosystem in seconds.
            </h2>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium mb-8">
              Stop wasting time on manual CSV uploads and broken spreadsheet formulas. Entrack connects directly to your trading accounts to ingest fills, track risk, and journal every execution seamlessly.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                  <RefreshCw className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Automated Execution Sync</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">Orders, executions, fees, and timestamps are pulled directly via verified APIs and OAuth feeds without manual intervention.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                  <BadgeCheck className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Bank-Grade Read-Only Security</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">All credentials are encrypted with AES-256 with strict read-only scopes. Zero fund access, zero withdrawal, zero trade-placement permission.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="size-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/20">
                  <Grid2x2 className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Multi-Broker Unified Engine</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">Trade across Indian equities, global forex, prop firms, and crypto exchanges while analyzing everything in one single journal.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="size-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 border border-sky-500/20">
                  <BookOpenCheck className="size-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">Automated Round-Trip Grouping</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">Multi-tier scaling, partial fills, and layered take-profits are automatically structured into clean, audited trades with accurate metrics.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BrokerConnectionSection;
