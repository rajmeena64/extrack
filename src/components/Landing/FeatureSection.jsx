import React from 'react';
import { features } from './LandingData';

const FeatureSection = ({ revealRef }) => {
  return (
    <section
      ref={revealRef}
      className="py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto reveal active"
      id="features"
    >
      <div className="text-center mb-20">
        <h2 className="font-headline-lg text-headline-lg mb-sm">
          Everything a trader needs in <span className="text-primary">one cockpit</span>.
        </h2>
        <p className="text-on-surface-variant">
          Data-driven tools to refine your edge and master the markets.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md">
        {features.map((feature, index) => (
          <div
            key={index}
            className="glass-panel p-lg rounded-xl group hover:border-primary/50 transition-colors flex flex-col h-full"
          >
            <span className={`material-symbols-outlined text-3xl mb-md ${feature.color}`}>
              {feature.icon}
            </span>
            <h3 className="font-headline-sm text-headline-sm mb-sm">
              {feature.title}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureSection;