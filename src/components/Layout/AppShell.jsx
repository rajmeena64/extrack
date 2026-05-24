import React from 'react';
import Logo from '../Common/Logo';
import Sidebar from '../Sidebar/Sidebar';

function AppShell({ children }) {
  return (
    <div className="dashboard">
      <div className="app-shell-header-logo" aria-hidden="true">
        <Logo className="app-shell-header-logo__brand" />
      </div>
      <Sidebar />
      {children}
    </div>
  );
}

export default AppShell;
