import React from 'react';

export function HeroSection({ onLogin, onSignUp }) {
  return (
    <header className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-6 flex items-center justify-between relative z-20">
      <a href="#" className="flex items-center gap-3 text-white font-bold text-lg tracking-tight hover:opacity-90 transition-opacity" aria-label="Entrack home">
        <span className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center p-2 backdrop-blur-md transition-colors hover:border-[#2563eb]/40" aria-hidden="true">
          <img className="w-full h-full object-contain" src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
        </span>
        <span className="font-extrabold tracking-tight">Entrack</span>
      </a>

      <nav className="hidden md:flex items-center gap-8 px-6 py-2 rounded-full bg-[#0a0a0f]/80 border border-white/[0.08] backdrop-blur-xl text-sm font-medium text-slate-300" aria-label="Primary navigation">
        <a href="#features" className="hover:text-[#60a5fa] transition-colors">Journal</a>
        <a href="/analytics" className="hover:text-[#60a5fa] transition-colors">Analytics</a>
        <a href="#modules" className="hover:text-[#60a5fa] transition-colors">Replay</a>
        <a href="#brokers" className="hover:text-[#60a5fa] transition-colors">Brokers</a>
        <a href="/documentation/journal" className="hover:text-[#60a5fa] transition-colors">Documentation</a>
      </nav>

      <div className="flex items-center gap-3">
        <button className="px-5 py-2.5 rounded-full text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all" type="button" onClick={onLogin}>Login</button>
        <button className="px-6 py-2.5 rounded-full text-sm font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] shadow-[0_4px_24px_rgba(37,99,235,0.45)] transition-all" type="button" onClick={onSignUp}>Sign Up</button>
      </div>
    </header>
  );
}
