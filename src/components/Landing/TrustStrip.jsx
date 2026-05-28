import React from 'react';

const TrustStrip = () => {
  const items = [
    { icon: 'verified', label: 'Built for serious traders' },
    { icon: 'replay', label: 'Replay-based practice' },
    { icon: 'description', label: 'Strategy journaling' },
    { icon: 'query_stats', label: 'Performance analytics' },
  ];

  return (
    <section className="bg-surface-container-lowest border-y border-outline-variant/10 py-lg overflow-hidden">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop flex flex-wrap justify-center md:justify-between items-center gap-xl opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
        {items.map((item, index) => (
          <div 
            key={index} 
            className="flex items-center gap-sm"
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <span className="material-symbols-outlined text-primary" data-icon={item.icon}>
              {item.icon}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustStrip;
