import React, { useEffect, useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import { useAuth } from '../../context/AuthContext';
import { loadUserSettings, saveUserSettings } from '../../utils/userSettings';


function DashboardSettings() {
  const { isAuthenticated } = useAuth();
  const [rowOrder, setRowOrder] = useState('overview-first');
  const [columnOrder, setColumnOrder] = useState('normal');

  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrent = true;

    loadUserSettings()
      .then((settings) => {
        const savedOrder = settings?.dashboard?.rowOrder || 'overview-first';
        const savedColOrder = settings?.dashboard?.columnOrder || 'normal';
        if (isCurrent) {
          setRowOrder(savedOrder);
          setColumnOrder(savedColOrder);
          window.dispatchEvent(new Event('dashboard-layout-change'));
        }
      })
      .catch(() => null);

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  const updateLayout = (updates) => {
    const nextRowOrder = updates.rowOrder !== undefined ? updates.rowOrder : rowOrder;
    const nextColOrder = updates.columnOrder !== undefined ? updates.columnOrder : columnOrder;

    setRowOrder(nextRowOrder);
    setColumnOrder(nextColOrder);

    if (isAuthenticated) {
      saveUserSettings({ 
        dashboard: { 
          rowOrder: nextRowOrder,
          columnOrder: nextColOrder 
        } 
      }).catch(() => null);
    }

    window.dispatchEvent(new Event('dashboard-layout-change'));
  };

  return (
    <div className="dashboard-settings">
      <div className="sub-nav-item" style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
        <span>Vertical Arrangement</span>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', width: '100%' }}>
          <input
            type="radio"
            name="dashboard-row"
            checked={rowOrder === 'overview-first'}
            onChange={() => updateLayout({ rowOrder: 'overview-first' })}
          />
          Overview First (Standard)
        </label>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', width: '100%' }}>
          <input
            type="radio"
            name="dashboard-row"
            checked={rowOrder === 'charts-first'}
            onChange={() => updateLayout({ rowOrder: 'charts-first' })}
          />
          Charts First
        </label>
      </div>

      <div className="sub-nav-item" style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border-light)', margin: '16px 0 8px' }}>
        <span>Horizontal Arrangement</span>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', width: '100%' }}>
          <input
            type="radio"
            name="dashboard-col"
            checked={columnOrder === 'normal'}
            onChange={() => updateLayout({ columnOrder: 'normal' })}
          />
          Standard (Sidebar Left)
        </label>
      </div>

      <div className="sub-nav-item">
        <label style={{ display: 'flex', gap: '8px', cursor: 'pointer', width: '100%' }}>
          <input
            type="radio"
            name="dashboard-col"
            checked={columnOrder === 'flipped'}
            onChange={() => updateLayout({ columnOrder: 'flipped' })}
          />
          Flipped (Sidebar Right)
        </label>
      </div>
    </div>
  );
}

export default DashboardSettings;
