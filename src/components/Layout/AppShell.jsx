import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Common/Logo';
import Sidebar from '../Sidebar/Sidebar';

function AppShell({ children }) {
  return (
    <div className="dashboard">
      <Link className="app-shell-header-logo" to="/dashboard" aria-label="Go to dashboard" title="Dashboard">
        <Logo className="app-shell-header-logo__brand" invertTheme />
      </Link>
      <Sidebar />
      {children}
    </div>
  );
}

export default AppShell;
