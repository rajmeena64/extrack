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
    <footer className="w-full max-w-[1480px] mx-auto px-6 sm:px-10 py-16 border-t border-[#1f1f1f] relative z-10">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-10 mb-12">
        <div className="max-w-sm">
          <div className="flex items-center gap-3 text-white font-bold text-lg mb-4" aria-label="Entrack footer">
            <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center p-1.5" aria-hidden="true">
              <img className="w-full h-full object-contain" src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
            </span>
            <span>Entrack</span>
          </div>
          <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4">
            Trading journal, broker coverage, analytics, and replay tools built for focused trade review.
          </p>
          <a className="text-sm font-semibold text-[#2E90FA] hover:text-[#60A5FA] transition-colors block mb-6" href={SUPPORT_MAILTO}>
            {SUPPORT_EMAIL}
          </a>
          <div className="flex items-center gap-3" aria-label="Social links">
            {socialLinks.map(({ label, href, Icon, mark }) => (
              <a
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-[#1f1f1f] hover:border-[#2563eb]/40 hover:bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all"
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

        <div className="flex flex-wrap gap-x-12 gap-y-4 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-[#60A5FA] transition-colors">Features</a>
          <a href="/analytics" className="hover:text-[#60A5FA] transition-colors">Analytics</a>
          <a href="#modules" className="hover:text-[#60A5FA] transition-colors">Modules</a>
          <a href="#brokers" className="hover:text-[#60A5FA] transition-colors">Brokers</a>
          <a href="/privacy" className="hover:text-[#60A5FA] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[#60A5FA] transition-colors">Terms</a>
          <a href={SUPPORT_MAILTO} className="hover:text-[#60A5FA] transition-colors">Support</a>
        </div>
      </div>

      <div className="pt-8 border-t border-[#1f1f1f] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
        <span>© 2026 Entrack. Built for focused traders.</span>
        <span>Zero clutter · Pure focus</span>
      </div>
    </footer>
  );
}
