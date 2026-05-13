import React, { useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';


function DashboardSettings() {
  const [rowOrder, setRowOrder] = useState(
    localStorage.getItem('dashboardRowOrder') || 'charts-first'
  );

  const updateRowOrder = (value) => {
    setRowOrder(value);
    localStorage.setItem('dashboardRowOrder', value);

    window.dispatchEvent(new Event('dashboard-layout-change'));
  };

  return (
    <div className="dashboard-settings">
      <div className="sub-nav-item">
        <LegacyIcon className="fas fa-th-large" />
        <span>Dashboard Layout</span>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="dashboard-row"
            checked={rowOrder === 'charts-first'}
            onChange={() => updateRowOrder('charts-first')}
          />
          Charts on top
        </label>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="dashboard-row"
            checked={rowOrder === 'overview-first'}
            onChange={() => updateRowOrder('overview-first')}
          />
          Overview on top
        </label>
      </div>
    </div>
  );
}

export default DashboardSettings;
