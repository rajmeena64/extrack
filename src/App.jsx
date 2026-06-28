import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/app-shell.css';
import './styles/mobile.css';

import { TradeManager } from './utils/tradeManager';
import { API_URL, WS_URL } from './utils/constants';
import { ThemeProvider } from './context/ThemeContext'; 
import { useAuth } from './context/AuthContext';
import api from './utils/serve';
import { convertCurrency, normalizeCurrencyCode } from './utils/Currency';
import { getTradeDisplayDate } from './utils/tradeTime';
import { loadCachedUserSettings, saveUserSettings } from './utils/userSettings';
import { useUserSettings } from './hooks/useUserSettings';
import { markPerf, measurePerf } from './utils/perfMarks';
import VerifyEmailPage from './components/Auth/VerifyEmailPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import ProfileOnboardingPage from './components/Auth/ProfileOnboardingPage';
import LandingPage from './components/Landing/LandingPage';
import AppShell from './components/Layout/AppShell';
import MainContentWrapper from './components/Layout/MainContentWrapper';
import PageHeader from './components/Layout/PageHeader';


/* ---------------- LAZY LOADED PAGES ---------------- */
// These will load only when needed (Code Splitting)
const Dashboard = lazy(() => import('./components/dashboard/dashboard'));
const AddTrade = lazy(() => import('./components/AddTrade/AddTrade'));
const Analytics = lazy(() => import('./components/Analytics/Analytics'));
const EconomicCalendar = lazy(() => import('./components/EconomicCalendar/EconomicCalendar'));
const TradeView = lazy(() => import('./components/Daily/TradeView'));
const ThatTrade = lazy(() => import('./components/Daily/ThatTrade/ThatTrade'));
const DayReview = lazy(() => import('./components/DayReview/DayReview'));
const BacktestingPage = lazy(() => import('./features/backtesting/BacktestingPage'));
const MarketTerminal = lazy(() => import('./features/marketTerminal/MarketTerminal'));

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

const RouteFallback = () => <div className="route-soft-fallback" aria-hidden="true" />;

const LEGACY_LOCAL_STORAGE_KEYS = [
  'darkMode',
  'entrack:darkMode',
  ['trade', 'analytics:darkMode'].join(''),
  'economic_calendar_provider',
  'tradeMode',
  'dashboardRowOrder',
  'trades_visible_fields',
  'entrack:userSettings',
  'entrack:dashboard_stats',
  ['ex', 'track:userSettings'].join(''),
  ['ex', 'track:dashboard_stats'].join(''),
];

const getCachedDashboardCurrency = (fallback = 'USD') => {
  const cachedCurrency = loadCachedUserSettings()?.dashboard?.currency;
  return cachedCurrency ? normalizeCurrencyCode(cachedCurrency, fallback) : null;
};

const isApiTrade = (trade) => Boolean(trade?.account_id || trade?.ticket || trade?.platform);

const deriveCachedTradesForMode = (queryClient, userId, mode) => {
  const exactCachedTrades = queryClient.getQueryData(['trades', userId, mode]);
  if (Array.isArray(exactCachedTrades)) return exactCachedTrades;

  const allCachedTrades = queryClient.getQueryData(['trades', userId, 'all']);
  if (Array.isArray(allCachedTrades)) {
    if (mode === 'manual') return allCachedTrades.filter((trade) => !isApiTrade(trade));
    if (mode === 'api') return allCachedTrades.filter(isApiTrade);
    return allCachedTrades;
  }

  if (mode === 'all') {
    const manualCachedTrades = queryClient.getQueryData(['trades', userId, 'manual']);
    const apiCachedTrades = queryClient.getQueryData(['trades', userId, 'api']);

    if (Array.isArray(manualCachedTrades) || Array.isArray(apiCachedTrades)) {
      return [
        ...(Array.isArray(manualCachedTrades) ? manualCachedTrades : []),
        ...(Array.isArray(apiCachedTrades) ? apiCachedTrades : []),
      ];
    }
  }

  return undefined;
};

function Profile() {
  const { user: currentUser, isAuthLoading } = useAuth();
  const navigate = useNavigate();

  if (isAuthLoading) {
    return <div style={{ padding: '40px' }}>Loading profile...</div>;
  }

  return (
    <MainContentWrapper>
      <PageHeader title="Profile" onBack={() => navigate(-1)} />
      {currentUser ? (
        <>
          <p><strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}</p>
          <p><strong>Email:</strong> {currentUser.email}</p>
        </>
      ) : (
        <p>Please login</p>
      )}
    </MainContentWrapper>
  );
}

const isProfileComplete = (user) => (
  user?.profileComplete === undefined || user?.profileComplete === null
    ? Boolean(String(user?.firstName || '').trim() && String(user?.lastName || '').trim())
    : Boolean(user.profileComplete)
);

const normalizeRoutePath = (pathname) => {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
  return normalized.toLowerCase();
};

const getCachedRouteKey = (pathname) => {
  const path = normalizeRoutePath(pathname);

  if (path === '/' || path === '/dashboard') return 'dashboard';
  if (path === '/add-trade') return 'add-trade';
  if (path === '/analytics') return 'analytics';
  if (path === '/economic-calendar') return 'economic-calendar';
  if (path === '/backtesting') return 'backtesting';
  if (path === '/chart') return 'chart';
  if (path === '/profile') return 'profile';
  if (path === '/day-review') return 'day-review';
  if (path === '/tradeview') return 'trade-view';

  return null;
};

function CachedMainRoutes({
  tradeMode,
  setTradeMode,
  trades,
  convertedDashboardTrades,
  dashboardDateRange,
  setDashboardDateRange,
  dashboardCurrency,
  defaultDashboardCurrency,
  handleDashboardCurrencyChange,
  isTradesLoading,
  mt5Accounts,
}) {
  const location = useLocation();
  const activeRouteKey = getCachedRouteKey(location.pathname);
  const [visitedRoutes, setVisitedRoutes] = useState(() => new Set([activeRouteKey || 'dashboard']));
  const visibleRoutes = useMemo(() => {
    if (!activeRouteKey || visitedRoutes.has(activeRouteKey)) return visitedRoutes;
    const nextRoutes = new Set(visitedRoutes);
    nextRoutes.add(activeRouteKey);
    return nextRoutes;
  }, [activeRouteKey, visitedRoutes]);

  useEffect(() => {
    if (!activeRouteKey) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitedRoutes((previous) => {
      if (previous.has(activeRouteKey)) return previous;
      const nextRoutes = new Set(previous);
      nextRoutes.add(activeRouteKey);
      return nextRoutes;
    });
  }, [activeRouteKey]);

  const renderCachedPane = (routeKey, element) => {
    if (!visibleRoutes.has(routeKey)) return null;

    const isActive = activeRouteKey === routeKey;

    return (
      <div
        key={routeKey}
        aria-hidden={!isActive}
        style={{ display: isActive ? 'block' : 'none' }}
      >
        <Suspense fallback={<RouteFallback />}>
          {element}
        </Suspense>
      </div>
    );
  };

  return (
    <>
      {renderCachedPane('dashboard', (
        <Dashboard
          tradeMode={tradeMode}
          setTradeMode={setTradeMode}
          trades={convertedDashboardTrades}
          dateRange={dashboardDateRange}
          setDateRange={setDashboardDateRange}
          currencyCode={dashboardCurrency}
          defaultCurrencyCode={defaultDashboardCurrency}
          onCurrencyChange={handleDashboardCurrencyChange}
          isLoading={isTradesLoading}
          mt5Accounts={mt5Accounts}
        />
      ))}

      {renderCachedPane('add-trade', <AddTrade trades={trades} />)}

      {renderCachedPane('analytics', (
        <Analytics trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />
      ))}

      {renderCachedPane('economic-calendar', <EconomicCalendar />)}
      {renderCachedPane('backtesting', <BacktestingPage />)}
      {renderCachedPane('chart', <MarketTerminal pageActive={activeRouteKey === 'chart'} />)}
      {renderCachedPane('profile', <Profile />)}

      {renderCachedPane('day-review', (
        <DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />
      ))}

      {renderCachedPane('trade-view', <TradeView trades={trades} currencyCode={defaultDashboardCurrency} />)}

      {!activeRouteKey && (
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/demo/*" element={<LandingPage />} />
            <Route path="/features/*" element={<LandingPage />} />
            <Route path="/documentation/*" element={<LandingPage />} />
            <Route path="/privacy" element={<LandingPage />} />
            <Route path="/terms" element={<LandingPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/day-review/:dateKey"
              element={<DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />}
            />
            <Route path="/trade/:tradeId" element={<ThatTrade />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

function AuthenticatedApp({
  tradeMode,
  setTradeMode,
  trades,
  convertedDashboardTrades,
  dashboardDateRange,
  setDashboardDateRange,
  dashboardCurrency,
  defaultDashboardCurrency,
  handleDashboardCurrencyChange,
  isTradesLoading,
  mt5Accounts,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = normalizeRoutePath(location.pathname);

  if (currentPath === '/auth/oauth-callback') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isProfileComplete(user)) {
    return (
      <Routes>
        <Route path="/profile-setup" element={<ProfileOnboardingPage />} />
        <Route
          path="*"
          element={<Navigate to="/profile-setup" replace state={{ from: location.pathname }} />}
        />
      </Routes>
    );
  }

  if (currentPath === '/profile-setup') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppShell>
      <CachedMainRoutes
        tradeMode={tradeMode}
        setTradeMode={setTradeMode}
        trades={trades}
        convertedDashboardTrades={convertedDashboardTrades}
        dashboardDateRange={dashboardDateRange}
        setDashboardDateRange={setDashboardDateRange}
        dashboardCurrency={dashboardCurrency}
        defaultDashboardCurrency={defaultDashboardCurrency}
        handleDashboardCurrencyChange={handleDashboardCurrencyChange}
        isTradesLoading={isTradesLoading}
        mt5Accounts={mt5Accounts}
      />
    </AppShell>
  );
}

function App() {
  const { user, isAuthLoading } = useAuth();
  const userSettingsQuery = useUserSettings();
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
  const [dashboardCurrency, setDashboardCurrency] = useState(
    getCachedDashboardCurrency('USD') || 'USD'
  );

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
    if (isAuthLoading || typeof window === 'undefined') return;
    sessionStorage.removeItem('entrack:oauthPending');
  }, [isAuthLoading]);

  useEffect(() => {
    if (!user?.ID || typeof window === 'undefined') return undefined;

    const preloadRoutes = () => {
      import('./components/AddTrade/AddTrade');

      window.setTimeout(() => {
        import('./components/DayReview/DayReview');
        import('./components/Analytics/Analytics');
        import('./components/EconomicCalendar/EconomicCalendar');
      }, 5000);
    };

    const preloadTimer = window.setTimeout(preloadRoutes, 600);

    return () => {
      window.clearTimeout(preloadTimer);
    };
  }, [user?.ID]);

  useEffect(() => {
    LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    hasHydratedDashboardCurrency.current = false;
    setDashboardCurrency(getCachedDashboardCurrency('USD') || 'USD');
  }, [user?.ID]);

  useEffect(() => {
    if (isAuthLoading || !user?.ID || !userSettingsQuery.data) return;

    const settings = userSettingsQuery.data;
    const savedTradeMode = settings?.dashboard?.tradeMode;
    if (['all', 'manual', 'api'].includes(savedTradeMode)) {
      setTradeMode(savedTradeMode);
    }

    if (settings?.dashboard?.dateRange && typeof settings.dashboard.dateRange === 'object') {
      setDashboardDateRange(settings.dashboard.dateRange);
    }

    if (settings?.dashboard?.currency) {
      setDashboardCurrency(normalizeCurrencyCode(settings.dashboard.currency));
    }

    hasHydratedUserSettings.current = true;
    markPerf('settings-ready');
    measurePerf('settings-from-start', 'app-start', 'settings-ready');
  }, [isAuthLoading, user?.ID, userSettingsQuery.data]);

  const tradesQuery = useQuery({
    queryKey: ['trades', user?.ID, tradeMode],
    enabled: !isAuthLoading && Boolean(user?.ID),
    queryFn: () => tradeManager.loadTrades(user.ID, tradeMode),
    initialData: () => (
      user?.ID ? deriveCachedTradesForMode(queryClient, user.ID, tradeMode) : undefined
    ),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

    const scheduleConnection = (delay = 2500) => {
      if (isDisposed || connectTimer || ws.current) return;
      connectTimer = window.setTimeout(() => {
        connectTimer = null;
        connectWebSocket();
      }, delay);
    };

    const connectWebSocket = async () => {
      try {
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          credentials: 'include',
        });

        if (!healthResponse.ok || isDisposed || ws.current) {
          return;
        }

        await api.get('/auth/me');
        if (isDisposed || ws.current) {
          return;
        }

        const { data: wsTokenResponse } = await api.get('/ws-token');
        const wsToken = wsTokenResponse?.token;

        if (!wsToken || isDisposed || ws.current) {
          return;
        }

        const wsUrl = new URL(WS_URL);
        wsUrl.searchParams.set('token', wsToken);

        const socket = new WebSocket(wsUrl.toString());
        ws.current = socket;

        socket.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === 'TRADE_UPDATED') {
            if (updatingTrades.current) return;

            updatingTrades.current = true;

            try {
              await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
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

          scheduleConnection(3000);
        };
      } catch {
        // Backend not reachable yet; skip websocket setup silently.
        scheduleConnection(5000);
      }
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

    setDashboardCurrency(
      savedDashboardCurrency
      || getCachedDashboardCurrency(defaultDashboardCurrency)
      || defaultDashboardCurrency
    );
    hasHydratedDashboardCurrency.current = true;
  }, [defaultDashboardCurrency, mt5AccountsQuery.isSuccess, savedDashboardCurrency]);

  const handleDashboardCurrencyChange = async (currencyCode) => {
    const normalizedCurrency = normalizeCurrencyCode(currencyCode, defaultDashboardCurrency);
    setDashboardCurrency(normalizedCurrency);
    saveUserSettings({ dashboard: { currency: normalizedCurrency } }).catch(() => null);
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

  if (isAuthLoading) {
    return null;
  }

  return (
    <BrowserRouter>
    <ThemeProvider>
      {user ? (
        <AuthenticatedApp
          tradeMode={tradeMode}
          setTradeMode={handleTradeModeChange}
          trades={trades}
          convertedDashboardTrades={convertedDashboardTrades}
          dashboardDateRange={dashboardDateRange}
          setDashboardDateRange={setDashboardDateRange}
          dashboardCurrency={dashboardCurrency}
          defaultDashboardCurrency={defaultDashboardCurrency}
          handleDashboardCurrencyChange={handleDashboardCurrencyChange}
          isTradesLoading={isTradesLoading}
          mt5Accounts={mt5AccountsQuery.data || []}
        />
      ) : (
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/oauth-callback" element={<Navigate to="/" replace />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      )}
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
