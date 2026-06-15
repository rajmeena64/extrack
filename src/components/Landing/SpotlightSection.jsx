import React from 'react';

const SpotlightSection = ({ 
  revealRef, 
  id, 
  title, 
  highlight, 
  description, 
  image, 
  imageAlt, 
  reverse = false, 
  background = 'bg-transparent',
  children 
}) => {
  return (
    <section ref={revealRef} className={`py-8 ${background} reveal`} id={id}>
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
        <div className={`${reverse ? 'order-1 md:order-2' : 'order-2 md:order-1'} landing-mockup-card`}>
          <img alt={imageAlt} src={image} />
        </div>
        <div className={`${reverse ? 'order-2 md:order-1' : 'order-1 md:order-2'} space-y-md`}>
          <h2 className="font-headline-lg text-headline-lg">
            {title} <span className="text-primary">{highlight}</span>
          </h2>
          <p className="text-on-surface-variant text-body-lg">
            {description}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
};

export default SpotlightSection;
