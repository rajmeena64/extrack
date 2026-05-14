import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { endOfDay, startOfDay } from 'date-fns';
import './styles/app-shell.css';
import './styles/mobile.css';

import Sidebar from './components/Sidebar/Sidebar';
import { TradeManager } from './utils/tradeManager';
import { API_URL, WS_URL } from './utils/constants';
import { ThemeProvider } from './context/ThemeContext'; 
import { useAuth } from './context/AuthContext';
import api from './utils/serve';
import { convertCurrency, normalizeCurrencyCode } from './utils/Currency';


/* ---------------- LAZY LOADED PAGES ---------------- */
// These will load only when needed (Code Splitting)
const Dashboard = lazy(() => import('./components/dashboard/dashboard'));
const AddTrade = lazy(() => import('./components/AddTrade/AddTrade'));
const Analytics = lazy(() => import('./components/Analytics/Analytics'));
const TradeView = lazy(() => import('./components/Daily/TradeView'));
const ThatTrade = lazy(() => import('./components/Daily/ThatTrade/ThatTrade'));
const LandingPage = lazy(() => import('./components/Landing/LandingPage'));

// Loading component shown while page is loading
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <div>Loading page...</div>
  </div>
);

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
  const [tradeMode, setTradeMode] = useState(() => localStorage.getItem('tradeMode') || 'all');
  const [dashboardDateRange, setDashboardDateRange] = useState({ from: null, to: null });
  const [dashboardCurrency, setDashboardCurrency] = useState('USD');

  const tradeManager = useMemo(() => new TradeManager(), []);
  const queryClient = useQueryClient();
  const ws = useRef(null);
  const updatingTrades = useRef(false);
  const hasHydratedDashboardCurrency = useRef(false);

  useEffect(() => {
    hasHydratedDashboardCurrency.current = false;
    setDashboardCurrency('USD');
  }, [user?.ID]);

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

  // WebSocket
  useEffect(() => {
    if (isAuthLoading || !user?.ID || !API_URL || !WS_URL) return undefined;

    let isDisposed = false;

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

    connectWebSocket();

    return () => {
      isDisposed = true;
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [isAuthLoading, user?.ID, tradeMode, queryClient]);

  const handleTradeModeChange = (mode) => {
    localStorage.setItem('tradeMode', mode);
    setTradeMode(mode);
  };

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
    const from = dashboardDateRange?.from ? startOfDay(new Date(dashboardDateRange.from)) : null;
    const to = dashboardDateRange?.to ? endOfDay(new Date(dashboardDateRange.to)) : null;

    return trades.filter((trade) => {
      if (!trade?.timestamp) return false;

      const tradeDate = new Date(trade.timestamp);
      if (Number.isNaN(tradeDate.getTime())) return false;
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
    (isAuthLoading && !user) ||
    (Boolean(user?.ID) &&
      tradesQuery.isPending &&
      !Array.isArray(tradesQuery.data));

  return (
    <BrowserRouter>
    <ThemeProvider>
      {isAuthLoading ? (
        <PageLoader />
      ) : user ? (
        <div className="dashboard">
          <Sidebar />

          <Suspense fallback={<PageLoader />}>
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
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile />} />
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
