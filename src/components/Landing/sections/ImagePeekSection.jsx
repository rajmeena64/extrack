import React, { useEffect, useRef, useState } from 'react';

export function ImagePeekSection() {
  const [isHovered, setIsHovered] = useState(false);
  const sectionRef = useRef(null);
  const headerRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (sectionRef.current && headerRef.current) {
            const rect = sectionRef.current.getBoundingClientRect();
            const pinOffset = 80;
            const maxPin = 600;
            if (rect.top < pinOffset) {
              const translateY = Math.min(maxPin, Math.max(0, pinOffset - rect.top));
              headerRef.current.style.transform = `translateY(${translateY}px)`;
            } else {
              headerRef.current.style.transform = 'translateY(0px)';
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section ref={sectionRef} className="w-full max-w-[1568px] mx-auto px-4 pt-12 pb-20 relative z-10" aria-label="Product image preview">
      <div ref={headerRef} className="relative z-0 flex flex-col items-center text-center pt-8 pb-4 max-w-4xl mx-auto px-4 will-change-transform">
        <h2 className="text-4xl sm:text-5xl lg:text-[72px] font-bold tracking-tight text-[#ececec] leading-[1.08]">
          Master Trading Strategies with Market Replay Simulator
        </h2>
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Entrack lets you practice in an environment that mirrors your real trading terminal. By customizing your workspace, you bring the comfort of your daily trading experience to every backtest session.
        </p>
      </div>
      <div 
        className="group relative z-20 flex items-center justify-center w-full max-w-[1568px] min-h-[520px] lg:min-h-[660px] mx-auto select-none cursor-pointer pt-12 pb-20 mt-4"
        style={{ background: 'linear-gradient(360deg, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 80%, rgba(0, 0, 0, 0.9) 90%, rgba(0, 0, 0, 1) 100%)' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered((prev) => !prev)}
      >
        <div 
          className="hidden lg:block absolute left-4 xl:left-16 top-1/2 z-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ transform: isHovered ? 'translate(-140px, -50%)' : 'translate(0px, -50%)' }}
        >
          <img 
            className="h-[440px] xl:h-[500px] w-auto object-cover rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            style={{ border: '3px solid rgb(37, 37, 37)' }}
            src="/assets/landing/market-terminal.png" 
            alt="Market terminal preview" 
            loading="lazy" 
            decoding="async" 
          />
        </div>
        <div 
          className="relative z-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ transform: isHovered ? 'scale(1.015)' : 'scale(1)' }}
        >
          <img 
            className="h-[360px] sm:h-[480px] lg:h-[560px] xl:h-[635px] max-w-[92vw] lg:max-w-[980px] xl:max-w-[1100px] w-auto object-cover rounded-[16px] shadow-[0_30px_90px_rgba(0,0,0,0.9)]"
            style={{ border: '3px solid rgb(37, 37, 37)' }}
            src="/assets/landing/pnl-calendar.png" 
            alt="Trading dashboard preview" 
            loading="lazy" 
            decoding="async" 
          />
        </div>
        <div 
          className="hidden lg:block absolute right-4 xl:right-16 top-1/2 z-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
          style={{ transform: isHovered ? 'translate(140px, -50%)' : 'translate(0px, -50%)' }}
        >
          <img 
            className="h-[440px] xl:h-[500px] w-auto object-cover rounded-[16px] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            style={{ border: '3px solid rgb(37, 37, 37)' }}
            src="/assets/landing/trade-detail-strategy.png" 
            alt="Trade review preview" 
            loading="lazy" 
            decoding="async" 
          />
        </div>
      </div>
    </section>
  );
}
