import React from 'react';

const MarketIntelligence = () => {
  return (
    <section className="py-24 bg-surface-container-lowest">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center mb-xl max-w-4xl mx-auto">
          <h2 className="font-display-lg text-display-lg mb-md leading-tight">
            Stay ahead with <span className="text-primary">Market Intelligence</span>.
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Real-time economic data, high-impact news, and retail sentiment analysis integrated directly into your
            workflow.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-xl items-center">
          <div className="md:col-span-7">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl blur-xl opacity-20 transition-opacity"></div>
              <div className="landing-mockup-card">
                <img
                  alt="Market Intelligence Dashboard"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKQH4Hisb9apyM27IuXpoa9fhoTv8h7UacQpzHfNQcwIF3FvNYTv31tGOmqOwqtyRyLkFyv1F-58qwsosHbwPOJ72cAMWKAV9KAPh3AQlSh7HFCV4IHlwy0tUYLNo5LNeE5ctIGghcrCtU2_wo4PWPm-VTSv-OCzIF_cGcPH8i8ajWyx62RqgRL1sbINyLO1ZQzNfjbCHvG3THuMRT4tGFpjLW5oIgfTrytl9Jc3lIbynryEUYaOAgmc95GOTkCpxCXttonMnMmj8CTr4"
                />
              </div>
            </div>
          </div>
          <div className="md:col-span-5 space-y-lg">
            <div className="flex items-start gap-md group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="calendar_today">
                  calendar_today
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm mb-xs">Economic Calendar</h4>
                <p className="text-on-surface-variant text-body-sm">
                  Track high-impact events like CPI and Interest Rate decisions with precise timing and historical
                  data context.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-md group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="monitoring">
                  monitoring
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm mb-xs">Market Sentiment Gauge</h4>
                <p className="text-on-surface-variant text-body-sm">
                  See real-time bullish vs bearish positioning from global retail brokers to identify potential
                  reversal points.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-md group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary" data-icon="newspaper">
                  newspaper
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-headline-sm mb-xs">Trending News</h4>
                <p className="text-on-surface-variant text-body-sm">
                  Stay informed with curated fintech news feeds, filtered for relevance to your currently traded
                  assets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketIntelligence;
