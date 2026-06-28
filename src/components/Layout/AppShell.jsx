import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../Common/Logo';
import Sidebar from '../Sidebar/Sidebar';

function AppShell({ children }) {
  const location = useLocation();
  const routeClass = `app-route-${(location.pathname || '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-') || 'dashboard'}`;

  return (
    <div className={`dashboard ${routeClass}`}>
      <Link className="app-shell-header-logo" to="/dashboard" aria-label="Go to dashboard" title="Dashboard">
        <Logo className="app-shell-header-logo__brand" invertTheme />
      </Link>
      <Sidebar />
      {children}
    </div>
  );
}

export default AppShell;
