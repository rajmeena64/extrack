import React from 'react';

function MainContentWrapper({ children, className = '', as = 'main', ...props }) {
  const Component = as;
  const classes = ['main-content', className].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}

export default MainContentWrapper;
