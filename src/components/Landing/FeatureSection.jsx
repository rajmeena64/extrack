import React, { useState } from 'react';
import { features } from './LandingData';
import { useTheme } from '../../context/ThemeContext';

const FeatureSection = ({ revealRef }) => {
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const { darkMode } = useTheme();

  return (
    <section
      ref={revealRef}
      className="py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto reveal active relative"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md relative">
        {features.map((feature, index) => (
          <div
            key={index}
            className="glass-panel p-lg rounded-xl group hover:border-primary/50 transition-colors flex flex-col h-full cursor-pointer relative overflow-hidden"
            onMouseEnter={() => setHoveredFeature(feature)}
            onMouseLeave={() => setHoveredFeature(null)}
          >
            <span className={`material-symbols-outlined text-3xl mb-md ${feature.color} transition-transform group-hover:scale-110`}>
              {feature.icon}
            </span>
            <h3 className="font-headline-sm text-headline-sm mb-sm">
              {feature.title}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              {feature.description}
            </p>
            
            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        ))}

        {/* Interactive Popup Overlay */}
        {hoveredFeature && (
          <div className="hidden md:block absolute inset-0 z-50 pointer-events-none">
            <div className="sticky top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl p-1 bg-gradient-to-br from-primary/30 to-transparent rounded-3xl animate-featurePopup shadow-2xl">
              <div className="bg-surface-container-high rounded-[22px] overflow-hidden flex flex-col md:flex-row h-[420px]">
                <div className="flex-1 p-xl flex flex-col justify-center">
                  <div className="flex items-center gap-md mb-md">
                    <span className={`material-symbols-outlined text-4xl ${hoveredFeature.color}`}>
                      {hoveredFeature.icon}
                    </span>
                    <h3 className="font-headline-md text-headline-md">{hoveredFeature.title}</h3>
                  </div>
                  <p className="text-lg text-on-surface leading-relaxed mb-lg">
                    {hoveredFeature.longDescription}
                  </p>
                  <div className="mt-auto">
                    <button className="text-primary font-bold flex items-center gap-sm group/btn">
                      Learn more about {hoveredFeature.title}
                      <span className="material-symbols-outlined transition-transform group-hover/btn:translate-x-1">arrow_forward</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 relative bg-surface-container-lowest overflow-hidden">
                  <img 
                    src={darkMode ? hoveredFeature.image.dark : hoveredFeature.image.light} 
                    alt={hoveredFeature.title}
                    className="w-full h-full object-cover object-left-top animate-imageSlide"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-surface-container-high via-transparent to-transparent md:block hidden" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeatureSection;