import React from 'react';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/utils/common/constants';

function InstagramGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="16" height="16" x="4" y="4" rx="5" />
      <circle cx="12" cy="12" r="3.25" />
      <path d="M16.8 7.2h.01" />
    </svg>
  );
}

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/entrack',
    Icon: InstagramGlyph,
  },
  {
    label: 'X',
    href: 'https://x.com/entrack',
    mark: 'X',
  },
];

export function LandingFooter() {
  return (
    <footer className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 border-t border-[#1f1f1f] bg-[#000000] relative z-10">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-14">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 text-white font-bold text-lg mb-4" aria-label="Entrack footer">
            <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center p-1.5" aria-hidden="true">
              <img className="w-full h-full object-contain" src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
            </span>
            <span>Entrack</span>
          </div>
          <a className="text-sm font-semibold text-[#2E90FA] hover:text-[#60A5FA] transition-colors block mb-6" href={SUPPORT_MAILTO}>
            {SUPPORT_EMAIL}
          </a>
          <div className="flex items-center gap-3" aria-label="Social links">
            {socialLinks.map(({ label, href, Icon, mark }) => (
              <a
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#181d26] hover:border-[#2563eb]/40 hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open Entrack on ${label}`}
                title={label}
                key={label}
              >
                {Icon ? (
                  <Icon className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-bold font-mono" aria-hidden="true">{mark}</span>
                )}
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-sm">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Product</span>
            <a href="#features" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Replay Simulator</a>
            <a href="/analytics" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Analytics Engine</a>
            <a href="#modules" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Core Modules</a>
            <a href="#brokers" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Broker Directory</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Workflow</span>
            <a href="/features/journal" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Trade Journal</a>
            <a href="/features/replay" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Backtest Practice</a>
            <a href="/documentation/add-trade" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Trade Entry</a>
            <a href="/documentation/analytics" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Score Radar</a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Legal &amp; Help</span>
            <a href="/privacy" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-slate-400 hover:text-[#60A5FA] transition-colors">Terms of Service</a>
            <a href={SUPPORT_MAILTO} className="text-slate-400 hover:text-[#60A5FA] transition-colors">Support Desk</a>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-[#181d26] flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
        <p className="text-[11px] leading-relaxed max-w-xl text-slate-500">
          Trading carries risk of capital loss. Backtest replay and analytics data are for educational performance review and do not guarantee future profits.
        </p>
        <div className="flex items-center gap-4 whitespace-nowrap">
          <span>© 2026 Entrack</span>
        </div>
      </div>
    </footer>
  );
}
