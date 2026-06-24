import React from 'react';
import { Menu, X } from '../../icons/lucideIcons';

const LandingNavbar = ({ darkMode, toggleDarkMode, onSignIn, mobileMenuOpen, setMobileMenuOpen }) => {
  return (
    <div className="hero-topbar">
      <div className="hero-brand">
        <span className="hero-logo-mark" aria-hidden="true">
          <img src={darkMode ? '/assets/applogo/entrack_dna_dark_icon.svg' : '/assets/applogo/entrack_dna_light_icon.svg'} alt="" />
        </span>
        <span>Entrack</span>
      </div>
      
      <nav className="hero-nav" aria-label="Main navigation">
        <a href="#replay">Replay</a>
        <a href="#features">Journal</a>
        <a href="/analytics">Analytics</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">AI Assistant</a>
      </nav>

      <div className="flex items-center gap-3">
        <button
          className="hero-theme-toggle hidden md:inline-grid"
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <span className="material-symbols-outlined">light_mode</span>
          ) : (
            <span className="material-symbols-outlined">dark_mode</span>
          )}
        </button>
        <button className="hero-signin hidden md:inline-flex" onClick={onSignIn}>
          Sign in <span aria-hidden="true">↗</span>
        </button>
        <button 
          className="md:hidden p-2 text-on-surface flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[70px] bg-surface-container-high border-b border-outline-variant p-lg flex flex-col gap-md z-[100] md:hidden animate-fadeIn shadow-2xl">
          <a href="#replay" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold py-3 border-b border-outline-variant/30">Replay</a>
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold py-3 border-b border-outline-variant/30">Journal</a>
          <a href="/analytics" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold py-3 border-b border-outline-variant/30">Analytics</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold py-3 border-b border-outline-variant/30">Pricing</a>
          
          <div className="flex items-center justify-between py-4 border-b border-outline-variant/30">
            <span className="text-lg font-semibold">Switch Theme</span>
            <button
              className="hero-theme-toggle"
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <span className="material-symbols-outlined">light_mode</span>
              ) : (
                <span className="material-symbols-outlined">dark_mode</span>
              )}
            </button>
          </div>

          <button 
            className="hero-cta w-full mt-6 h-[56px] text-lg font-bold" 
            onClick={() => {
              onSignIn();
              setMobileMenuOpen(false);
            }}
          >
            Sign in ↗
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingNavbar;
