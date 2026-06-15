import React from 'react';

const WorkflowSection = () => {
  return (
    <section className="py-8 bg-transparent">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="font-headline-lg text-headline-lg mb-sm">
            A simple workflow to <span className="text-primary">improve every week</span>.
          </h2>
          <p className="text-on-surface-variant text-body-lg">
            Journal the trade, replay the setup, and review the data—so improvement becomes a repeatable process.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="glass-panel p-xl rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-md">
              <span className="material-symbols-outlined">edit_note</span>
            </div>
            <div className="font-headline-sm text-headline-sm mb-sm">1. Journal with context</div>
            <p className="text-on-surface-variant">
              Save entries, exits, screenshots, reasons, emotions, and setup tags in one place.
            </p>
          </div>
          <div className="glass-panel p-xl rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-md">
              <span className="material-symbols-outlined">slow_motion_video</span>
            </div>
            <div className="font-headline-sm text-headline-sm mb-sm">2. Replay the market</div>
            <p className="text-on-surface-variant">
              Revisit sessions bar by bar and understand what you missed, forced, or executed well.
            </p>
          </div>
          <div className="glass-panel p-xl rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-md">
              <span className="material-symbols-outlined">insights</span>
            </div>
            <div className="font-headline-sm text-headline-sm mb-sm">3. Improve with analytics</div>
            <p className="text-on-surface-variant">
              Use your numbers to spot winning setups, recurring mistakes, and real performance trends.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
