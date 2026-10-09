import React, { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export function ModulesSection({ modules }) {
  const [activeModule, setActiveModule] = useState(0);
  const moduleRefs = useRef([]);

  const setModule = useCallback((index) => {
    const nextIndex = ((index % modules.length) + modules.length) % modules.length;
    setActiveModule(nextIndex);
    moduleRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [modules.length]);

  return (
    <section className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 sm:py-24 relative z-10" id="modules">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <a className="inline-block mb-4 hover:opacity-90 transition-opacity" href="/documentation/add-trade">
            <Badge variant="brand" size="lg">
              Core tools
            </Badge>
          </a>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            <a className="hover:opacity-95 transition-opacity" href="/documentation/add-trade">
              Open only the tool you need right now.
            </a>
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-400 max-w-sm">
          Move between journal, analytics, replay, broker coverage, and risk tools without breaking your workflow.
        </p>
      </div>

      <div className="relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {modules.map((module, index) => (
            <article
              className={`p-6 sm:p-7 rounded-[28px] border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[260px] ${index === activeModule ? 'bg-[#090909] border-[#2563eb] shadow-[0_0_30px_rgba(37,99,235,0.2)]' : 'bg-[#090909] border-[#1f1f1f] hover:border-white/20'}`}
              key={module.title}
              ref={(el) => {
                moduleRefs.current[index] = el;
              }}
              onClick={() => setModule(index)}
            >
              <div>
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#2E90FA] mb-3">
                  {module.eyebrow}
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight mb-2">{module.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">{module.text}</p>
              </div>
              <div className="mt-6 text-xs font-bold text-[#2E90FA] flex items-center gap-1">
                Explore module →
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-8">
        <button 
          className="w-10 h-10 rounded-full border border-white/10 bg-[#090909] hover:border-[#2563eb]/40 hover:bg-white/5 text-white flex items-center justify-center text-lg transition-all" 
          type="button" 
          aria-label="Previous module" 
          onClick={() => setModule(activeModule - 1)}
        >
          ‹
        </button>
        <button 
          className="w-10 h-10 rounded-full border border-white/10 bg-[#090909] hover:border-[#2563eb]/40 hover:bg-white/5 text-white flex items-center justify-center text-lg transition-all" 
          type="button" 
          aria-label="Next module" 
          onClick={() => setModule(activeModule + 1)}
        >
          ›
        </button>
      </div>
    </section>
  );
}
