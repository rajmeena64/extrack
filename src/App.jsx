import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/app-shell.css';
import './styles/mobile.css';
import './styles/globals.css';

const DevAgentation = import.meta.env.DEV ? lazy(() => import('agentation').then((m) => ({ default: m.Agentation }))) : null;

import tradeApi from './utils/api/tradeApi';
import { API_URL, WS_URL } from './utils/common/constants';
import { ThemeProvider } from './context/ThemeContext'; 
import { useAuth } from './context/AuthContext';
import api from './utils/common/serve';
import { convertCurrency, convertTradePnlForDisplay, normalizeCurrencyCode } from './utils/user/Currency';
import { getTradeDisplayDate } from './utils/trading/tradeTime';
import { loadCachedUserSettings, saveUserSettings } from './utils/user/userSettings';
import { useUserSettings } from './hooks/useUserSettings';
import { markPerf, measurePerf } from './utils/common/perfMarks';
import AppShell from './components/Layout/AppShell';
import MainContentWrapper from './components/Layout/MainContentWrapper';
import PageHeader from './components/Layout/PageHeader';

const VerifyEmailPage = lazy(() => import('./features/auth/components/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/components/ResetPasswordPage'));
const ProfileOnboardingPage = lazy(() => import('./features/auth/components/ProfileOnboardingPage'));
const AuthPage = lazy(() => import('./features/auth/components/AuthPage'));
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));
const Dashboard = lazy(() => import('./features/analytics/components/Dashboard/dashboard'));
const AnalyticsPage = lazy(() => import('./features/analytics/components/AnalyticsPage/AnalyticsPage'));
const AddTrade = lazy(() => import('./features/trades/components/AddTrade/AddTrade'));
const Heatmaps = lazy(() => import('./features/markets/components/Heatmaps/Heatmaps'));
const AIAnalysisPage = lazy(() => import('./features/ai-analysis/components/AIAnalysisPage'));
const EconomicCalendar = lazy(() => import('./features/markets/components/EconomicCalendar/EconomicCalendar'));
const TradeLog = lazy(() => import('./features/trades/components/TradeLog/TradeLog').then((m) => ({ default: m.TradeLog })));
const ThatTrade = lazy(() => import('./features/trades/components/ThatTrade/ThatTrade'));
const DayReview = lazy(() => import('./features/trades/components/DayReview/DayReview'));
const BacktestingPage = lazy(() => import('./features/markets/components/Backtesting/BacktestingPage'));
const MarketTerminal = lazy(() => import('./features/markets/components/MarketTerminal/MarketTerminal'));

const startOfLocalDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfLocalDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const RouteFallback = () => <div className="route-soft-fallback" aria-hidden="true" />;

const normalizeRoutePath = (pathname) => String(pathname || '/').replace(/\/+$/, '').toLowerCase() || '/';

const isPublicLandingRoute = (pathname) => {
  const path = normalizeRoutePath(pathname);
  return (
    path === '/' || path === '/privacy' || path === '/terms' ||
    path === '/analytics' || path.startsWith('/analytics/') ||
    path === '/demo' || path.startsWith('/demo/') ||
    path === '/features' || path.startsWith('/features/') ||
    path === '/documentation' || path.startsWith('/documentation/')
  );
};

const isPublicAuthRoute = (pathname) => {
  const path = normalizeRoutePath(pathname);
  return (
    path === '/login' || path === '/signup' || path === '/forgot-password' ||
    path === '/verify-email-pending' || path === '/verify-email' || path === '/reset-password'
  );
};

const LEGACY_STORAGE_KEYS = [
  'darkMode', 'entrack:darkMode', 'tradeanalytics:darkMode', 'economic_calendar_provider',
  'tradeMode', 'dashboardRowOrder', 'trades_visible_fields', 'entrack:userSettings',
  'entrack:dashboard_stats', 'extrack:userSettings', 'extrack:dashboard_stats', 'accessToken',
];

const getCachedDashboardCurrency = (fallback = 'USD') => {
  const cached = loadCachedUserSettings()?.dashboard?.currency;
  return cached ? normalizeCurrencyCode(cached, fallback) : null;
};

const isApiTrade = (trade) => Boolean(trade?.account_id || trade?.platform);

const deriveCachedTradesForMode = (queryClient, userId, mode) => {
  const exact = queryClient.getQueryData(['trades', userId, mode]);
  if (Array.isArray(exact)) return exact;
  const all = queryClient.getQueryData(['trades', userId, 'all']);
  if (Array.isArray(all)) {
    if (mode === 'manual') return all.filter((t) => !isApiTrade(t));
    if (mode === 'api') return all.filter(isApiTrade);
    return all;
  }
  if (mode === 'all') {
    const manual = queryClient.getQueryData(['trades', userId, 'manual']);
    const apiTrades = queryClient.getQueryData(['trades', userId, 'api']);
    if (Array.isArray(manual) || Array.isArray(apiTrades)) {
      return [...(Array.isArray(manual) ? manual : []), ...(Array.isArray(apiTrades) ? apiTrades : [])];
    }
  }
  return undefined;
};

function Profile() {
  const { user, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  if (isAuthLoading) return <div style={{ padding: '40px' }}>Loading profile...</div>;
  return (
    <MainContentWrapper>
      <PageHeader title="Profile" onBack={() => navigate(-1)} />
      {user ? (
        <>
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
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

const ROUTE_KEYS = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/add-trade': 'add-trade',
  '/heatmaps': 'heatmaps',
  '/ai-analysis': 'ai-analysis',
  '/economic-calendar': 'economic-calendar',
  '/backtesting': 'backtesting',
  '/chart': 'chart',
  '/profile': 'profile',
  '/day-review': 'day-review',
  '/trade-log': 'trade-log',
  '/tradelog': 'trade-log',
};

const getCachedRouteKey = (pathname) => {
  const path = normalizeRoutePath(pathname);
  if (ROUTE_KEYS[path]) return ROUTE_KEYS[path];
  if (path.startsWith('/analytics')) return 'analytics';
  return null;
};

function CachedMainRoutes({
  tradeMode,
  setTradeMode,
  trades,
  convertedTrades,
  convertedDashboardTrades,
  dashboardDateRange,
  setDashboardDateRange,
  dashboardCurrency,
  defaultDashboardCurrency,
  handleDashboardCurrencyChange,
  isTradesLoading,
  openPositions,
}) {
  const location = useLocation();
  const activeRouteKey = getCachedRouteKey(location.pathname);
  const [visitedRoutes, setVisitedRoutes] = useState(() => new Set([activeRouteKey || 'dashboard']));
  const visibleRoutes = useMemo(() => {
    if (!activeRouteKey || visitedRoutes.has(activeRouteKey)) return visitedRoutes;
    const next = new Set(visitedRoutes);
    next.add(activeRouteKey);
    return next;
  }, [activeRouteKey, visitedRoutes]);

  useEffect(() => {
    if (!activeRouteKey) return;
    setVisitedRoutes((prev) => {
      if (prev.has(activeRouteKey)) return prev;
      const next = new Set(prev);
      next.add(activeRouteKey);
      return next;
    });
  }, [activeRouteKey]);

  const panes = [
    ['dashboard', <Dashboard tradeMode={tradeMode} setTradeMode={setTradeMode} trades={convertedDashboardTrades} dateRange={dashboardDateRange} setDateRange={setDashboardDateRange} currencyCode={dashboardCurrency} defaultCurrencyCode={defaultDashboardCurrency} onCurrencyChange={handleDashboardCurrencyChange} isLoading={isTradesLoading} openPositions={openPositions} />],
    ['analytics', <AnalyticsPage trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />],
    ['add-trade', <AddTrade trades={trades} currencyCode={dashboardCurrency} defaultCurrencyCode={defaultDashboardCurrency} onCurrencyChange={handleDashboardCurrencyChange} />],
    ['heatmaps', <Heatmaps />],
    ['ai-analysis', <AIAnalysisPage trades={convertedTrades} currencyCode={dashboardCurrency} />],
    ['economic-calendar', <EconomicCalendar />],
    ['backtesting', <BacktestingPage />],
    ['chart', <MarketTerminal pageActive={activeRouteKey === 'chart'} />],
    ['profile', <Profile />],
    ['day-review', <DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />],
    ['trade-log', <TradeLog trades={convertedTrades} currencyCode={dashboardCurrency} />],
  ];

  return (
    <>
      {panes.map(([key, element]) => {
        if (!visibleRoutes.has(key)) return null;
        const isActive = activeRouteKey === key;
        return (
          <div key={key} aria-hidden={!isActive} style={{ display: isActive ? 'block' : 'none' }}>
            <Suspense fallback={<RouteFallback />}>{element}</Suspense>
          </div>
        );
      })}

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
            <Route path="/day-review/:dateKey" element={<DayReview trades={convertedDashboardTrades} currencyCode={dashboardCurrency} />} />
            <Route path="/trade/:uniqueId" element={<ThatTrade currencyCode={dashboardCurrency} />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

function AuthenticatedApp(props) {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = normalizeRoutePath(location.pathname);

  if (currentPath === '/auth/oauth-callback') return <Navigate to="/dashboard" replace />;
  if (!isProfileComplete(user)) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/profile-setup" element={<ProfileOnboardingPage />} />
          <Route path="*" element={<Navigate to="/profile-setup" replace state={{ from: location.pathname }} />} />
        </Routes>
      </Suspense>
    );
  }
  if (currentPath === '/profile-setup') return <Navigate to="/dashboard" replace />;

  return (
    <AppShell>
      <CachedMainRoutes {...props} />
    </AppShell>
  );
}

function App() {
  const { user, isAuthLoading } = useAuth();
  const userSettingsQuery = useUserSettings();
  const cachedDashboardSettings = useMemo(() => loadCachedUserSettings()?.dashboard || {}, []);
  const [tradeMode, setTradeMode] = useState(
    ['all', 'manual', 'api'].includes(cachedDashboardSettings.tradeMode) ? cachedDashboardSettings.tradeMode : 'all'
  );
  const [dashboardDateRange, setDashboardDateRange] = useState(
    cachedDashboardSettings.dateRange && typeof cachedDashboardSettings.dateRange === 'object'
      ? cachedDashboardSettings.dateRange : { from: null, to: null }
  );
  const [dashboardCurrency, setDashboardCurrency] = useState(() => getCachedDashboardCurrency('USD') || 'USD');
  const [openPositions, setOpenPositions] = useState([]);
  const queryClient = useQueryClient();
  const ws = useRef(null);
  const updatingTrades = useRef(false);
  const hasHydratedDashboardCurrency = useRef(false);
  const hasHydratedUserSettings = useRef(false);
  const hasInitializedTimeZone = useRef(false);

  useEffect(() => {
    markPerf('shell-visible');
    measurePerf('visible-shell-from-start', 'app-start', 'shell-visible');
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    if (isAuthLoading || typeof window === 'undefined') return;
    sessionStorage.removeItem('entrack:oauthPending');
  }, [isAuthLoading]);

  useEffect(() => {
    if (!user?.ID || typeof window === 'undefined') return undefined;
    const preloadTimer = window.setTimeout(() => {
      import('./features/trades/components/AddTrade/AddTrade');
      window.setTimeout(() => {
        import('./features/trades/components/DayReview/DayReview');
        import('./features/markets/components/Heatmaps/Heatmaps');
        import('./features/markets/components/EconomicCalendar/EconomicCalendar');
      }, 5000);
    }, 4000);
    return () => window.clearTimeout(preloadTimer);
  }, [user?.ID]);

  useEffect(() => {
    hasHydratedDashboardCurrency.current = false;
    hasInitializedTimeZone.current = false;
    setDashboardCurrency(getCachedDashboardCurrency('USD') || 'USD');
    setOpenPositions([]);
  }, [user?.ID]);

  useEffect(() => {
    if (isAuthLoading || !user?.ID || !userSettingsQuery.data) return;
    const settings = userSettingsQuery.data;
    if (['all', 'manual', 'api'].includes(settings?.dashboard?.tradeMode)) {
      setTradeMode(settings.dashboard.tradeMode);
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

  useEffect(() => {
    if (isAuthLoading || !user?.ID || userSettingsQuery.isPlaceholderData || !userSettingsQuery.data) return;
    if (hasInitializedTimeZone.current) return;
    hasInitializedTimeZone.current = true;
    if (userSettingsQuery.data?.preferences?.timeZone) return;

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    saveUserSettings({ preferences: { timeZone: detected } })
      .then((settings) => queryClient.setQueryData(['user-settings', user.ID], settings))
      .catch(() => { hasInitializedTimeZone.current = false; });
  }, [isAuthLoading, queryClient, user?.ID, userSettingsQuery.data, userSettingsQuery.isPlaceholderData]);

  const tradesQuery = useQuery({
    queryKey: ['trades', user?.ID, tradeMode],
    enabled: false,
    queryFn: async () => {
      const source = tradeMode === 'api' ? 'sync' : tradeMode === 'manual' ? 'manual,file' : null;
      const res = await tradeApi.getAll(source ? { source } : {});
      return Array.isArray(res?.trades) ? res.trades : [];
    },
    initialData: () => (user?.ID ? deriveCachedTradesForMode(queryClient, user.ID, tradeMode) : undefined),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (tradesQuery.isSuccess) {
      markPerf('trades-ready');
      measurePerf('trades-from-start', 'app-start', 'trades-ready');
    }
  }, [tradesQuery.isSuccess]);

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
        const { data: wsTokenResponse } = await api.get('/ws-token');
        const wsToken = wsTokenResponse?.token;
        if (!wsToken || isDisposed || ws.current) return;

        const wsUrl = new URL(WS_URL);
        wsUrl.searchParams.set('token', wsToken);
        const socket = new WebSocket(wsUrl.toString());
        ws.current = socket;

        socket.onmessage = async (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'OPEN_POSITIONS_UPDATED') {
            const incoming = Array.isArray(msg.positions) ? msg.positions : [];
            const targetIds = new Set([...(Array.isArray(msg.connection_ids) ? msg.connection_ids : []), ...incoming.map((p) => p.connection_id)].filter(Boolean));
            setOpenPositions((cur) => [...cur.filter((p) => !targetIds.has(p.connection_id)), ...incoming]);
            return;
          }
          if (msg.type === 'BROKER_BALANCES_UPDATED') {
            window.dispatchEvent(new CustomEvent('broker-balances-updated', { detail: Array.isArray(msg.balances) ? msg.balances : [] }));
            return;
          }
          if (msg.type === 'TRADE_UPDATED') {
            if (updatingTrades.current) return;
            updatingTrades.current = true;
            try {
              await queryClient.invalidateQueries({ queryKey: ['trades', user.ID] });
            } catch {} finally {
              setTimeout(() => { updatingTrades.current = false; }, 100);
            }
          }
        };

        socket.onerror = () => {
          if (ws.current === socket) ws.current = null;
          socket.close();
        };
        socket.onclose = () => {
          if (ws.current === socket) ws.current = null;
          scheduleConnection(3000);
        };
      } catch {
        scheduleConnection(5000);
      }
    };

    const closeSocket = () => {
      if (connectTimer) { window.clearTimeout(connectTimer); connectTimer = null; }
      if (ws.current) { ws.current.close(); ws.current = null; }
    };

    const handlePageHide = () => { isDisposed = true; closeSocket(); };
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
    if (user?.ID) saveUserSettings({ dashboard: { tradeMode: mode } }).catch(() => null);
  };

  const handleDashboardDateRangeChange = (range) => {
    setDashboardDateRange(range);
    if (user?.ID) saveUserSettings({ dashboard: { dateRange: range } }).catch(() => null);
  };

  const trades = useMemo(() => (user?.ID ? (tradesQuery.data || []) : []), [tradesQuery.data, user?.ID]);
  const defaultDashboardCurrency = useMemo(
    () => normalizeCurrencyCode(user?.preferred_currency || 'USD'),
    [user?.preferred_currency]
  );

  useEffect(() => {
    if (hasHydratedDashboardCurrency.current) return;
    setDashboardCurrency(getCachedDashboardCurrency(defaultDashboardCurrency) || defaultDashboardCurrency);
    hasHydratedDashboardCurrency.current = true;
  }, [defaultDashboardCurrency]);

  const handleDashboardCurrencyChange = (currencyCode) => {
    const normalized = normalizeCurrencyCode(currencyCode, defaultDashboardCurrency);
    setDashboardCurrency(normalized);
    saveUserSettings({ currency: normalized, dashboard: { currency: normalized } }).catch(() => null);
    queryClient.invalidateQueries({ queryKey: ['trade-log-trades'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['trades'] });
  };

  const convertedTrades = useMemo(
    () => trades.map((t) => convertTradePnlForDisplay(t, dashboardCurrency, defaultDashboardCurrency)),
    [dashboardCurrency, defaultDashboardCurrency, trades]
  );

  const convertedDashboardTrades = useMemo(() => {
    if (!Array.isArray(convertedTrades)) return [];
    const from = dashboardDateRange?.from ? startOfLocalDay(new Date(dashboardDateRange.from)) : null;
    const to = dashboardDateRange?.to ? endOfLocalDay(new Date(dashboardDateRange.to)) : null;
    return convertedTrades.filter((t) => {
      const tradeDate = getTradeDisplayDate(t);
      if (!tradeDate) return false;
      if (from && tradeDate < from) return false;
      if (to && tradeDate > to) return false;
      return true;
    });
  }, [convertedTrades, dashboardDateRange]);

  const convertedOpenPositions = useMemo(() => (
    openPositions.map((p) => {
      const sourceCurrency = p?.pnlCurrency || defaultDashboardCurrency;
      const convertedPnl = convertCurrency(p?.pnl, sourceCurrency, dashboardCurrency);
      return {
        ...p,
        pnl: convertedPnl,
        netPnl: convertedPnl,
        grossPnl: convertCurrency(p?.grossPnl, sourceCurrency, dashboardCurrency),
        pnl_currency: dashboardCurrency,
        pnlCurrency: dashboardCurrency,
        currency: dashboardCurrency,
        display_currency: dashboardCurrency,
      };
    })
  ), [dashboardCurrency, defaultDashboardCurrency, openPositions]);

  const isTradesLoading = Boolean(user?.ID) && tradesQuery.isFetching && !Array.isArray(tradesQuery.data);

  if (isAuthLoading) {
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    if (!user && (isPublicLandingRoute(currentPath) || isPublicAuthRoute(currentPath))) {
      return (
        <BrowserRouter>
          <ThemeProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<AuthPage initialTab="login" />} />
                <Route path="/signup" element={<AuthPage initialTab="signup" />} />
                <Route path="/forgot-password" element={<AuthPage initialTab="forgot" />} />
                <Route path="/verify-email-pending" element={<AuthPage initialTab="verification" />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="*" element={<LandingPage />} />
              </Routes>
            </Suspense>
          </ThemeProvider>
        </BrowserRouter>
      );
    }
    return <div className="app-bootstrap-screen" aria-label="Loading Entrack" />;
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        {DevAgentation && <Suspense fallback={null}><DevAgentation /></Suspense>}
        {user ? (
          <AuthenticatedApp
            tradeMode={tradeMode}
            setTradeMode={handleTradeModeChange}
            trades={trades}
            convertedTrades={convertedTrades}
            convertedDashboardTrades={convertedDashboardTrades}
            dashboardDateRange={dashboardDateRange}
            setDashboardDateRange={handleDashboardDateRangeChange}
            dashboardCurrency={dashboardCurrency}
            defaultDashboardCurrency={defaultDashboardCurrency}
            handleDashboardCurrencyChange={handleDashboardCurrencyChange}
            isTradesLoading={isTradesLoading}
            openPositions={convertedOpenPositions}
          />
        ) : (
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<AuthPage initialTab="login" />} />
              <Route path="/signup" element={<AuthPage initialTab="signup" />} />
              <Route path="/forgot-password" element={<AuthPage initialTab="forgot" />} />
              <Route path="/verify-email-pending" element={<AuthPage initialTab="verification" />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/oauth-callback" element={<Navigate to="/" replace />} />
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </Suspense>
        )}
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
