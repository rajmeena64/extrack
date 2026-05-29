import React, { useState, useRef } from 'react';
import { features } from './LandingData';

const FeatureSection = ({ revealRef }) => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const sectionRef = useRef(null);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
  };

  const closeWindow = () => {
    setSelectedFeature(null);
  };

  return (
    <section
      ref={(el) => {
        revealRef(el);
        sectionRef.current = el;
      }}
      className="py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto reveal active relative"
      id="features"
    >
      <div className={`text-center mb-20 transition-all duration-500 ${selectedFeature ? 'blur-md opacity-30 scale-[0.98]' : ''}`}>
        <h2 className="font-headline-lg text-headline-lg mb-sm">
          Everything a trader needs in <span className="text-primary">one cockpit</span>.
        </h2>
        <p className="text-on-surface-variant">
          Data-driven tools to refine your edge and master the markets.
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md relative transition-all duration-500 ${selectedFeature ? 'blur-md opacity-30 scale-[0.98]' : ''}`}>
        {features.map((feature, index) => (
          <div
            key={index}
            onClick={() => handleFeatureClick(feature)}
            className="glass-panel p-lg rounded-xl group hover:border-primary/50 transition-all duration-300 flex flex-col h-full cursor-pointer relative overflow-hidden hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <span className={`material-symbols-outlined text-3xl mb-md ${feature.color} relative z-10`}>
              {feature.icon}
            </span>
            <h3 className="font-headline-sm text-headline-sm mb-sm relative z-10">
              {feature.title}
            </h3>
            <p className="text-body-sm text-on-surface-variant relative z-10">
              {feature.description}
            </p>
            
            <div className="mt-auto pt-md flex items-center text-primary text-xs font-bold relative z-10">
              <span>LEARN MORE</span>
              <span className="material-symbols-outlined text-sm ml-xs transition-transform group-hover:translate-x-1">add_circle</span>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Detailed Feature Window (Modal Style) */}
      {selectedFeature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/60 backdrop-blur-xl transition-opacity animate-in fade-in duration-300" 
            onClick={closeWindow}
          />
          
          {/* Modal Window */}
          <div className="glass-panel w-full max-w-5xl h-[min(800px,85vh)] overflow-hidden rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-primary/20 flex flex-col md:flex-row bg-surface/90 relative z-10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            
            {/* Close Button */}
            <button 
              onClick={closeWindow}
              className="absolute top-md right-md z-30 w-10 h-10 rounded-full bg-surface/80 border border-outline-variant/30 flex items-center justify-center hover:bg-error hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Image side (Expanded) */}
            <div className="w-full md:w-1/2 h-64 md:h-full relative overflow-hidden bg-surface-container">
              <img 
                src={selectedFeature.image} 
                alt={selectedFeature.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface md:bg-gradient-to-r md:from-transparent md:to-surface" />
              
              <div className="absolute bottom-xl left-xl right-xl block md:hidden">
                <span className={`material-symbols-outlined text-5xl ${selectedFeature.color} mb-sm block`}>
                  {selectedFeature.icon}
                </span>
                <h3 className="font-headline-lg text-headline-lg text-white drop-shadow-2xl">
                  {selectedFeature.title}
                </h3>
              </div>
            </div>

            {/* Content side (Expanded) */}
            <div className="w-full md:w-1/2 p-xl md:p-2xl flex flex-col justify-center overflow-y-auto">
              <div className="hidden md:block mb-xl">
                <div className="flex items-center gap-md mb-md">
                  <span className={`material-symbols-outlined text-6xl ${selectedFeature.color}`}>
                    {selectedFeature.icon}
                  </span>
                  <h3 className="font-headline-lg text-headline-lg">
                    {selectedFeature.title}
                  </h3>
                </div>
              </div>
              
              <div className="space-y-xl">
                <div>
                  <p className="text-primary font-bold uppercase tracking-[0.2em] text-sm mb-sm flex items-center gap-sm">
                    <span className="h-px w-8 bg-primary/40" />
                    Deep Dive
                  </p>
                  <p className="text-on-surface-variant text-lg leading-relaxed font-body-lg">
                    {selectedFeature.detailedDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md pt-xl border-t border-outline-variant/10">
                  <div className="p-lg rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-sm text-primary mb-sm">
                      <span className="material-symbols-outlined text-md">verified</span>
                      <span className="text-xs font-bold uppercase tracking-widest">Key Advantage</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-snug">
                      Institutional-grade precision designed for professional individual traders.
                    </p>
                  </div>
                  
                  <div className="p-lg rounded-2xl bg-emerald-400/5 border border-emerald-400/10">
                    <div className="flex items-center gap-sm text-emerald-400 mb-sm">
                      <span className="material-symbols-outlined text-md">bolt</span>
                      <span className="text-xs font-bold uppercase tracking-widest">Quick Impact</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-snug">
                      Immediate reduction in cognitive bias and emotional decision making.
                    </p>
                  </div>
                </div>

                <div className="pt-md">
                  <button 
                    onClick={closeWindow}
                    className="w-full py-lg px-xl rounded-xl bg-primary text-on-primary font-bold text-lg hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                  >
                    Back to Cockpit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeatureSection;