import React from 'react';

const CalendarSection = () => {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-xl">
        <div className="md:col-span-7">
          <h2 className="font-headline-lg text-headline-lg mb-md">
            Review your month <span className="text-primary">at a glance</span>.
          </h2>
          <div className="landing-mockup-card">
            <img
              alt="Trading Calendar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtWB83srelfxja0FSRYrnpB7bLCyVVQV5dTM71QQqfjWKrS2NVCFp28p7_7jpvt_jghwJksZGF03uqgyQe2-_jIE2Xwl-zQVaUDZDva0lQI_ig0KknTxgE9h1Ha3N1xhhE7iSTKKWgdGSlsSCXk6WVL989MuFIBNSocXSk7euPdaorKFyTJN5DustwD12JdGwB-EaiNQKS2v3_aPN3YTVlzA5t_pvS7HCVNankv3XvCpYz8e7j-W5jLzO5uuQprdRKkAZYIWgnrnxAMLU"
            />
          </div>
        </div>
        <div className="md:col-span-5 flex flex-col justify-center">
          <div className="glass-panel p-xl rounded-xl">
            <span className="material-symbols-outlined text-primary text-3xl mb-md" data-icon="insights">
              insights
            </span>
            <h3 className="font-headline-sm text-headline-sm mb-md">Strategy Tracking Spotlight</h3>
            <p className="text-on-surface-variant mb-xl">
              Filter your entire history by setup. Find out if your 'Head and Shoulders' pattern is actually making
              money, or if it's just a distraction.
            </p>
            <div className="space-y-md">
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[75%]"></div>
              </div>
              <div className="flex justify-between text-label-caps font-label-caps">
                <span className="opacity-60">Breakout Strategy</span>
                <span className="text-primary">75% Win Rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CalendarSection;
