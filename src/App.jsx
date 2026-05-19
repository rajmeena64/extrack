import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/app-shell.css';
import './styles/mobile.css';

import Sidebar from './components/Sidebar/Sidebar';
import { TradeManager } from './utils/tradeManager';
import { API_URL, WS_URL } from './utils/constants';
import { ThemeProvider } from './context/ThemeContext'; 
import { useAuth } from './context/AuthContext';
import api from './utils/serve';
import { convertCurrency, normalizeCurrencyCode } from './utils/Currency';
import { getTradeDisplayDate } from './utils/tradeTime';
import { loadCachedUserSettings, loadUserSettings, saveUserSettings } from './utils/userSettings';
import { markPerf, measurePerf } from './utils/perfMarks';


/* ---------------- LAZY LOADED PAGES ---------------- */
// These will load only when needed (Code Splitting)
const Dashboard = lazy(() => import('./components/dashboard/dashboard'));
const AddTrade = lazy(() => import('./components/AddTrade/AddTrade'));
const Analytics = lazy(() => import('./components/Analytics/Analytics'));
const EconomicCalendar = lazy(() => import('./components/EconomicCalendar/EconomicCalendar'));
const TradeView = lazy(() => import('./components/Daily/TradeView'));
const ThatTrade = lazy(() => import('./components/Daily/ThatTrade/ThatTrade'));
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));
const DayReview = lazy(() => import('./components/DayReview/DayReview'));

const startOfLocalDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const endOfLocalDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
};

const PageLoader = () => (
  <div className="dashboard dashboard-boot-shell" aria-hidden="true">
    <main className="main-content dashboard-boot-shell__main">
      <header className="dashboard-boot-shell__header">
        <h1 className="app-page-title">Dashboard</h1>
        <div className="dashboard-boot-shell__controls">
          <span />
          <span />
          <span />
        </div>
      </header>
      <section className="dashboard-boot-shell__stats">
        <article className="dashboard-boot-shell__card dashboard-boot-shell__card--featured">
          <small>Total P&amp;L</small>
          <strong>&nbsp;</strong>
        </article>
        <article className="dashboard-boot-shell__card" />
        <article className="dashboard-boot-shell__card" />
        <article className="dashboard-boot-shell__card" />
      </section>
    </main>
  </div>
);

const RouteSkeleton = () => {
  useEffect(() => {
    markPerf('stats-skeleton-visible');
  }, []);

  return (
    <main className="main-content dashboard-boot-shell__main" aria-hidden="true">
      <header className="dashboard-boot-shell__header">
        <h1 className="app-page-title">Dashboard</h1>
        <div className="dashboard-boot-shell__controls">
          <span />
          <span />
          <span />
        </div>
      </header>
      <section className="dashboard-boot-shell__stats">
        <article className="dashboard-boot-shell__card dashboard-boot-shell__card--featured">
          <small>Total P&amp;L</small>
          <strong>&nbsp;</strong>
        </article>
        <article className="dashboard-boot-shell__card" />
        <article className="dashboard-boot-shell__card" />
        <article className="dashboard-boot-shell__card" />
      </section>
    </main>
  );
};

const LEGACY_LOCAL_STORAGE_KEYS = [
  'darkMode',
  'economic_calendar_provider',
  'tradeMode',
  'dashboardRowOrder',
  'trades_visible_fields',
];

function Profile() {
  const { user: currentUser, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div style={{ padding: '40px' }}>Loading profile...</div>;
  }

  return (
    <div className="main-content">
      <div className="app-page-header">
        <div className="app-page-header__left">
          <h1 className="app-page-title">Profile</h1>
        </div>
      </div>
      {currentUser ? (
        <>
          <p><strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
        </>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}

function App() {
  const { user, isAuthLoading } = useAuth();
  const cachedSettings = useMemo(() => loadCachedUserSettings(), []);
  const cachedDashboardSettings = cachedSettings?.dashboard || {};
  const [tradeMode, setTradeMode] = useState(
    ['all', 'manual', 'api'].includes(cachedDashboardSettings.tradeMode)
      ? cachedDashboardSettings.tradeMode
      : 'all'
  );
  const [dashboardDateRange, setDashboardDateRange] = useState(
    cachedDashboardSettings.dateRange && typeof cachedDashboardSettings.dateRange === 'object'
      ? cachedDashboardSettings.dateRange
      : { from: null, to: null }
  );
  const [dashboardCurrency, setDashboardCurrency] = useState('USD');

  const tradeManager = useMemo(() => new TradeManager(), []);
  const queryClient = useQueryClient();
  const ws = useRef(null);
  const updatingTrades = useRef(false);
  const hasHydratedDashboardCurrency = useRef(false);
  const hasHydratedUserSettings = useRef(false);

  useEffect(() => {
    markPerf('shell-visible');
    measurePerf('visible-shell-from-start', 'app-start', 'shell-visible');
  }, []);

  useEffect(() => {
    if (!user?.ID || typeof window === 'undefined') return undefined;

    const preloadRoutes = () => {
      // Priority routes only
      import('./components/AddTrade/AddTrade');
      
      // Secondary routes delayed further
      window.setTimeout(() => {
        import('./components/DayReview/DayReview');
        import('./components/Analytics/Analytics');
      }, 5000);
    };

    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(preloadRoutes, { timeout: 6000 })
      : window.setTimeout(preloadRoutes, 4000);

    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [user?.ID]);

  useEffect(() => {
    LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    hasHydratedDashboardCurrency.current = false;
    setDashboardCurrency('USD');
  }, [user?.ID]);

  useEffect(() => {
    if (isAuthLoading || !user?.ID) return;

    let isCurrent = true;

    loadUserSettings()
      .then((settings) => {
        if (!isCurrent) return;

        const savedTradeMode = settings?.dashboard?.tradeMode;
        if (['all', 'manual', 'api'].includes(savedTradeMode)) {
          setTradeMode(savedTradeMode);
        }

        if (settings?.dashboard?.dateRange && typeof settings.dashboard.dateRange === 'object') {
          setDashboardDateRange(settings.dashboard.dateRange);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (isCurrent) {
          hasHydratedUserSettings.current = true;
          markPerf('settings-ready');
          measurePerf('settings-from-start', 'app-start', 'settings-ready');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthLoading, user?.ID]);

  const tradesQuery = useQuery({
    queryKey: ['trades', user?.ID, tradeMode],
    enabled: !isAuthLoading && Boolean(user?.ID),
    queryFn: () => tradeManager.loadTrades(user.ID, tradeMode),
    placeholderData: (previousData) => previousData,
  });

  const mt5AccountsQuery = useQuery({
    queryKey: ['mt5-accounts', user?.ID],
    enabled: !isAuthLoading && Boolean(user?.ID),
    queryFn: async () => {
      const { data } = await api.get('/get-mt5-accounts');
      return data?.accounts || [];
    },
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!tradesQuery.isSuccess) return;

    markPerf('trades-ready');
    measurePerf('trades-from-start', 'app-start', 'trades-ready');
  }, [tradesQuery.isSuccess]);

  // WebSocket
  useEffect(() => {
    if (isAuthLoading || !user?.ID || !API_URL || !WS_URL) return undefined;

    let isDisposed = false;
    let connectTimer = null;

    const connectWebSocket = async () => {
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          credentials: 'include',
        });

        if (!healthResponse.ok || isDisposed || ws.current) {
          return;
        }

        const socket = new WebSocket(WS_URL);
        ws.current = socket;

        socket.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === 'TRADE_UPDATED') {
            if (updatingTrades.current) return;

            updatingTrades.current = true;

            try {
              await queryClient.invalidateQueries({
                queryKey: ['trades', user.ID, tradeMode],
              });
            } catch {
              // Query invalidation is best-effort.
            } finally {
              setTimeout(() => {
                updatingTrades.current = false;
              }, 100);
            }
          }
        };

        socket.onerror = () => {
          if (ws.current === socket) {
            ws.current = null;
          }
          socket.close();
        };

        socket.onclose = () => {
          if (ws.current === socket) {
            ws.current = null;
          }
        };
      } catch {
        // Backend not reachable yet; skip websocket setup silently.
      }
    };

    const scheduleConnection = () => {
      connectTimer = window.setTimeout(connectWebSocket, 2500);
    };

    const closeSocket = () => {
      if (connectTimer) {
        window.clearTimeout(connectTimer);
        connectTimer = null;
      }

      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };

    const handlePageHide = () => {
      isDisposed = true;
      closeSocket();
    };

    window.addEventListener('pagehide', handlePageHide);
    scheduleConnection();

    return () => {
      isDisposed = true;
      window.removeEventListener('pagehide', handlePageHide);
      closeSocket();
    };
  }, [isAuthLoading, user?.ID, tradeMode, queryClient]);

  const handleTradeModeChange = (mode) => {
    setTradeMode(mode);
    if (user?.ID) {
      saveUserSettings({ dashboard: { tradeMode: mode } }).catch(() => null);
    }
  };

  useEffect(() => {
    if (!user?.ID || !hasHydratedUserSettings.current) return;
    saveUserSettings({ dashboard: { dateRange: dashboardDateRange } }).catch(() => null);
  }, [dashboardDateRange, user?.ID]);

  const trades = useMemo(() => (
    user?.ID ? (tradesQuery.data || []) : []
  ), [tradesQuery.data, user?.ID]);
  const defaultDashboardCurrency = useMemo(() => {
    const accountCurrency = mt5AccountsQuery.data?.find((account) => account?.default_currency)
      ?.default_currency;

    return normalizeCurrencyCode(accountCurrency || user?.preferred_currency || 'USD');
  }, [mt5AccountsQuery.data, user?.preferred_currency]);

  const savedDashboardCurrency = useMemo(() => {
    const accountCurrency = mt5AccountsQuery.data?.find((account) => account?.temporary_currency)
      ?.temporary_currency;

    return accountCurrency ? normalizeCurrencyCode(accountCurrency, defaultDashboardCurrency) : null;
  }, [defaultDashboardCurrency, mt5AccountsQuery.data]);

  useEffect(() => {
    if (hasHydratedDashboardCurrency.current) return;
    if (!mt5AccountsQuery.isSuccess) return;

    setDashboardCurrency(savedDashboardCurrency || defaultDashboardCurrency);
    hasHydratedDashboardCurrency.current = true;
  }, [defaultDashboardCurrency, mt5AccountsQuery.isSuccess, savedDashboardCurrency]);

  const handleDashboardCurrencyChange = async (currencyCode) => {
    const normalizedCurrency = normalizeCurrencyCode(currencyCode, defaultDashboardCurrency);
    setDashboardCurrency(normalizedCurrency);
    queryClient.setQueryData(['mt5-accounts', user?.ID], (previousAccounts = []) => (
      Array.isArray(previousAccounts)
        ? previousAccounts.map((account) => ({
            ...account,
            temporary_currency: normalizedCurrency,
          }))
        : previousAccounts
    ));

    try {
      const { data } = await api.post('/update-dashboard-currency', {
        currency: normalizedCurrency,
      });

      if (data?.success) {
        setDashboardCurrency(normalizedCurrency);
      }
    } catch {
      // Currency is kept optimistically in local UI if persistence fails.
    }
  };

  const dashboardTrades = useMemo(() => {
    if (!Array.isArray(trades)) return [];
    const from = dashboardDateRange?.from ? startOfLocalDay(new Date(dashboardDateRange.from)) : null;
    const to = dashboardDateRange?.to ? endOfLocalDay(new Date(dashboardDateRange.to)) : null;

    return trades.filter((trade) => {
      const tradeDate = getTradeDisplayDate(trade);

      if (!tradeDate) return false;
      if (from && tradeDate < from) return false;
      if (to && tradeDate > to) return false;

      return true;
    });
  }, [dashboardDateRange, trades]);
  const convertedDashboardTrades = useMemo(() => (
    dashboardTrades.map((trade) => ({
      ...trade,
      pnl: convertCurrency(trade?.pnl, defaultDashboardCurrency, dashboardCurrency),
      source_pnl: trade?.source_pnl ?? trade?.pnl,
      source_currency: trade?.source_currency ?? defaultDashboardCurrency,
      display_currency: dashboardCurrency,
    }))
  ), [dashboardCurrency, dashboardTrades, defaultDashboardCurrency]);
  const isTradesLoading =
    Boolean(user?.ID) &&
    tradesQuery.isPending &&
    !Array.isArray(tradesQuery.data);

  return (
    <BrowserRouter>
    <ThemeProvider>
      {!user && isAuthLoading ? (
        <PageLoader />
      ) : user ? (
        <div className="dashboard">
          <Sidebar />

          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />

              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    tradeMode={tradeMode}
                    setTradeMode={handleTradeModeChange}
                    trades={convertedDashboardTrades}
                    dateRange={dashboardDateRange}
                    setDateRange={setDashboardDateRange}
                    currencyCode={dashboardCurrency}
                    defaultCurrencyCode={defaultDashboardCurrency}
                    onCurrencyChange={handleDashboardCurrencyChange}
                    isLoading={isTradesLoading}
                  />
                }
              />

              <Route path="/add-trade" element={<AddTrade trades={trades} />} />
              <Route
                path="/analytics"
                element={<Analytics trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />}
              />
              <Route path="/economic-calendar" element={<EconomicCalendar />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/day-review"
                element={<DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />}
              />
              <Route
                path="/day-review/:dateKey"
                element={<DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />}
              />
              <Route path="/TradeView" element={<TradeView trades={trades} />} />
              <Route path="/trade/:tradeId" element={<ThatTrade />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </div>
      ) : (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </Suspense>
      )}
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
