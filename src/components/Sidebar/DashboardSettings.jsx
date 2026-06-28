import React, { useEffect, useRef, useState } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import { useAuth } from '../../context/AuthContext';
import { loadCachedUserSettings, saveUserSettings } from '../../utils/userSettings';
import { useUserSettings } from '../../hooks/useUserSettings';

const DEFAULT_DASHBOARD_LAYOUT = {
  rowOrder: 'overview-first',
  columnOrder: 'normal',
};

const getCachedDashboardLayout = () => {
  const cachedLayout = loadCachedUserSettings()?.dashboard || {};

  return {
    rowOrder: cachedLayout.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder,
    columnOrder: cachedLayout.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder,
  };
};

const notifyDashboardLayoutChange = (layout) => {
  window.dispatchEvent(new CustomEvent('dashboard-layout-change', {
    detail: { layout },
  }));
};


function DashboardSettings() {
  const { isAuthenticated } = useAuth();
  const userSettingsQuery = useUserSettings();
  const hasLocalLayoutChange = useRef(false);
  const [rowOrder, setRowOrder] = useState(() => getCachedDashboardLayout().rowOrder);
  const [columnOrder, setColumnOrder] = useState(() => getCachedDashboardLayout().columnOrder);

  useEffect(() => {
    if (!isAuthenticated) return;

    const savedOrder = userSettingsQuery.data?.dashboard?.rowOrder || DEFAULT_DASHBOARD_LAYOUT.rowOrder;
    const savedColOrder = userSettingsQuery.data?.dashboard?.columnOrder || DEFAULT_DASHBOARD_LAYOUT.columnOrder;
    if (!hasLocalLayoutChange.current) {
      window.queueMicrotask(() => {
        if (hasLocalLayoutChange.current) return;
        setRowOrder(savedOrder);
        setColumnOrder(savedColOrder);
        notifyDashboardLayoutChange({
          rowOrder: savedOrder,
          columnOrder: savedColOrder,
        });
      });
    }
  }, [isAuthenticated, userSettingsQuery.data]);

  const updateLayout = (updates) => {
    const nextRowOrder = updates.rowOrder !== undefined ? updates.rowOrder : rowOrder;
    const nextColOrder = updates.columnOrder !== undefined ? updates.columnOrder : columnOrder;
    const nextLayout = {
      rowOrder: nextRowOrder,
      columnOrder: nextColOrder,
    };

    hasLocalLayoutChange.current = true;
    setRowOrder(nextRowOrder);
    setColumnOrder(nextColOrder);
    notifyDashboardLayoutChange(nextLayout);

    if (isAuthenticated) {
      saveUserSettings({ 
        dashboard: nextLayout,
      }).catch(() => null);
    }
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
