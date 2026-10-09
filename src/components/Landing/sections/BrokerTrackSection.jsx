import React, { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

function ScrollVelocityRow({ items, direction = -1, baseSpeed = 28, velocityRef }) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const blockRef = useRef(null);
  const isInViewRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => { isInViewRef.current = entry.isIntersecting; });
    io.observe(el);
    let x = direction > 0 ? -1000 : 0;
    let smoothV = 0;
    let lastT = performance.now();
    let frameId;

    const loop = (now) => {
      frameId = requestAnimationFrame(loop);
      if (!isInViewRef.current || document.visibilityState !== 'visible') {
        lastT = now;
        return;
      }
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      smoothV += (velocityRef.current - smoothV) * 0.1;
      velocityRef.current *= 0.95;
      const dir = direction * (smoothV < -2 ? -1 : 1);
      const speed = baseSpeed * (1 + Math.min(4, Math.abs(smoothV) / 30));
      x += dir * speed * dt;
      const blockW = blockRef.current?.offsetWidth || 1;
      if (x <= -blockW) x += blockW;
      if (x >= 0) x -= blockW;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${x}px,0,0)`;
    };
    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      io.disconnect();
    };
  }, [direction, baseSpeed, velocityRef]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden whitespace-nowrap">
      <div ref={trackRef} className="flex w-max will-change-transform select-none">
        {[0, 1, 2, 3].map((copy) => (
          <div key={copy} ref={copy === 0 ? blockRef : null} className="flex shrink-0 items-center">
            {items.map((broker, idx) => (
              <span
                key={`${broker.name}-${copy}-${idx}`}
                className="inline-block text-4xl md:text-7xl md:leading-[5rem] font-bold tracking-[-0.02em] text-white drop-shadow-sm mr-12 select-none"
              >
                {broker.name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrokerTrackSection({ brokerTracks }) {
  const scrollVelocityRef = useRef(0);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      scrollVelocityRef.current = ((window.scrollY - lastY) / dt) * 80;
      lastY = window.scrollY;
      lastT = now;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="w-full py-16 sm:py-24 relative z-10 overflow-hidden" id="brokers">
      <div className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 mb-12 text-center">
        <div className="flex justify-center mb-4">
          <Badge variant="brand" size="md">
            connected review
          </Badge>
        </div>
        <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
          Know where your edge performs best.
        </h3>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-medium">
          Bring broker activity into one calm dashboard and spot the accounts, symbols, and sessions that actually deserve your focus.
        </p>
      </div>

      <div className="relative w-full overflow-hidden flex flex-col gap-4 py-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <ScrollVelocityRow items={brokerTracks[0]} direction={-1} baseSpeed={28} velocityRef={scrollVelocityRef} />
        <ScrollVelocityRow items={brokerTracks[1]} direction={1} baseSpeed={28} velocityRef={scrollVelocityRef} />
      </div>

      <div className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 flex justify-end text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-500 mt-8">
        broker names only · no platform lock-in
      </div>
    </section>
  );
}
