import React from 'react';

import App from './App';

function AppBootstrap() {
  React.useEffect(() => {
    const loading = document.getElementById('loading');
    if (!loading) return;

    const revealApp = () => {
      loading.style.opacity = '0';
      loading.style.pointerEvents = 'none';
      window.setTimeout(() => {
        loading.style.display = 'none';
      }, 180);
    };

    const rafId = window.requestAnimationFrame(() => {
      window.setTimeout(revealApp, 80);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return <App />;
}

export default AppBootstrap;
