import React, { useEffect, useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import { useAuth } from '../../context/AuthContext';
import { loadUserSettings, saveUserSettings } from '../../utils/userSettings';


function DashboardSettings() {
  const { isAuthenticated } = useAuth();
  const [rowOrder, setRowOrder] = useState('charts-first');

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrent = true;

    loadUserSettings()
      .then((settings) => {
        const savedOrder = settings?.dashboard?.rowOrder;
        if (isCurrent && savedOrder) {
          setRowOrder(savedOrder);
          window.dispatchEvent(new Event('dashboard-layout-change'));
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const updateRowOrder = (value) => {
    setRowOrder(value);
    if (isAuthenticated) {
      saveUserSettings({ dashboard: { rowOrder: value } }).catch(() => null);
    }

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
