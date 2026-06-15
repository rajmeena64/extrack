import React from 'react';
import { pricingPlans } from './LandingData';

const PricingSection = ({ onCTA }) => {
  return (
    <section className="py-8 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto" id="pricing">
      <div className="text-center mb-20">
        <h2 className="font-headline-lg text-headline-lg mb-sm">
          Professional tools for <span className="text-primary">every stage</span>.
        </h2>
        <p className="text-on-surface-variant">Start free, upgrade as your trading career grows.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        {pricingPlans.map((plan, index) => (
          <div 
            key={index} 
            className={`glass-panel p-xl rounded-xl flex flex-col relative ${plan.popular ? 'border-primary/50 bg-surface-container-high ring-1 ring-primary/20' : ''}`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest px-md py-1 rounded-full">
                MOST POPULAR
              </div>
            )}
            <div className="mb-xl">
              <h3 className="font-headline-sm text-headline-sm mb-xs">{plan.name}</h3>
              <p className="text-on-surface-variant text-body-sm">{plan.tagline}</p>
              <div className="mt-md text-3xl font-bold">
                {plan.price}<span className="text-body-sm text-on-surface-variant font-normal">{plan.period}</span>
              </div>
            </div>
            <ul className="space-y-md mb-xl flex-grow">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-sm text-body-sm">
                  <span className="material-symbols-outlined text-primary text-sm">check</span> {feature}
                </li>
              ))}
              {plan.lockedFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-sm text-body-sm opacity-30">
                  <span className="material-symbols-outlined text-sm">lock</span> {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={onCTA}
              className={`w-full py-md rounded-lg font-label-caps text-label-caps transition-all ${
                plan.popular 
                  ? 'bg-primary text-on-primary hover:brightness-110' 
                  : 'border border-outline-variant/30 hover:bg-surface-variant'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
