import React from 'react';
import { brokers } from './LandingData';

const BrokerSlider = () => {
  return (
    <section
      className="py-8 bg-transparent overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop mb-lg text-center">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
          Seamlessly Integrated With
        </h3>
      </div>
      <div className="broker-marquee py-sm">
        <div className="broker-track animate-scroll">
          <div className="broker-group">
            {brokers.map((broker, index) => (
              <div key={index} className="broker-item">
                <div className="broker-logo">
                  <img alt={broker.name} src={broker.logo} />
                </div>
                <span className="broker-name">{broker.name}</span>
              </div>
            ))}
          </div>
          {/* Duplicate for infinite scroll */}
          <div className="broker-group" aria-hidden="true">
            {brokers.map((broker, index) => (
              <div key={`dup-${index}`} className="broker-item">
                <div className="broker-logo">
                  <img alt={broker.name} src={broker.logo} />
                </div>
                <span className="broker-name">{broker.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrokerSlider;
