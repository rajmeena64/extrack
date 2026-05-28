import React from 'react';
import { landingImages } from './LandingData';
import { useTheme } from '../../context/ThemeContext';

const ProblemSection = () => {
  const { darkMode } = useTheme();

  return (
    <section className="py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl items-center items-stretch">
        <div>
          <h2 className="font-headline-lg text-headline-lg mb-md leading-tight">
            Most traders repeat the same mistakes because they <span className="text-error">never review them</span>.
          </h2>
          <ul className="space-y-md">
            <li className="flex items-start gap-md">
              <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error text-sm" data-icon="close">
                  close
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">No structured review process</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Scattered notes in Discord, notebooks, or Excel that are never opened again.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-md">
              <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error text-sm" data-icon="close">
                  close
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">Invisible emotional leaks</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Revenge trading and FOMO go untracked, draining your account balance slowly.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-md">
              <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-error text-sm" data-icon="close">
                  close
                </span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">Flying blind on strategy</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Not knowing which setups are profitable and which ones are just noise.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-surface-container rounded-xl border border-outline-variant/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-primary/5 opacity-50"></div>
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 h-full min-h-[400px]">
            <div className="flex flex-col opacity-60 hover:opacity-100 transition-opacity duration-500 border-r border-outline-variant/30">
              <div className="flex-grow overflow-hidden relative">
                <img
                  alt="Unorganized Notes"
                  className="absolute inset-0 w-full h-full object-cover grayscale brightness-50"
                  src={darkMode ? landingImages.problemNotebook.dark : landingImages.problemNotebook.light}
                />
              </div>
              <div className="py-lg text-center font-data-mono text-error bg-surface-container/80 backdrop-blur-sm border-t border-outline-variant/20">
                Unorganized Notebooks
              </div>
            </div>
            <div className="flex flex-col group/dashboard transition-all duration-500">
              <div className="flex-grow overflow-hidden relative">
                <img
                  alt="Entrack Dashboard"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/dashboard:scale-110"
                  src={darkMode ? landingImages.problemDashboard.dark : landingImages.problemDashboard.light}
                />
              </div>
              <div className="py-lg text-center font-data-mono text-primary bg-surface-container/80 backdrop-blur-sm border-t border-outline-variant/20">
                Entrack Dashboard
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
