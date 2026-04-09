import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './styles/style.css';

import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/dashboard/dashboard';
import { TradeManager } from './utils/tradeManager';
import { API_URL } from './utils/constants';

/* ---------------- PAGES ---------------- */
import AddTrade from './components/AddTrade/AddTrade';
import Analytics from './components/Analytics/Analytics';
import TradeView from './components/Daily/TradeView';
import ThatTrade from './components/Daily/ThatTrade/ThatTrade';

function Profile() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

  return (
    <div style={{ padding: '40px' }}>
      <h1>User Profile</h1>
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

const getTradesCacheKey = (userId, mode) => `trades-cache:${userId}:${mode}`;

const getStoredTrades = (userId, mode) => {
  if (!userId) return [];

  try {
    const raw = localStorage.getItem(getTradesCacheKey(userId, mode));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse trades cache:', error);
    return [];
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [tradeMode, setTradeMode] = useState(() => localStorage.getItem('tradeMode') || 'all');

  const tradeManager = useMemo(() => new TradeManager(), []);
  const queryClient = useQueryClient();
  const ws = useRef(null);
  const updatingTrades = useRef(false);

  // Load current user
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    setUser(currentUser);
  }, []);

  const tradesQuery = useQuery({
    queryKey: ['trades', user?.ID, tradeMode],
    enabled: Boolean(user?.ID),
    queryFn: () => tradeManager.loadTrades(user.ID, tradeMode),
    initialData: () => getStoredTrades(user?.ID, tradeMode),
  });

  useEffect(() => {
    if (!user?.ID || !Array.isArray(tradesQuery.data)) return;

    localStorage.setItem(
      getTradesCacheKey(user.ID, tradeMode),
      JSON.stringify(tradesQuery.data)
    );
  }, [user?.ID, tradeMode, tradesQuery.data]);

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setTradeMode('all');
      queryClient.clear();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [queryClient]);

  // WebSocket
  useEffect(() => {
    if (!user?.ID) return;

    if (!ws.current) {
      ws.current = new WebSocket(API_URL);

      ws.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'TRADE_UPDATED') {
          if (updatingTrades.current) return;

          updatingTrades.current = true;

          try {
            await queryClient.invalidateQueries({
              queryKey: ['trades', user.ID, tradeMode],
            });
          } catch (err) {
            console.error('Error updating trades:', err);
          } finally {
            setTimeout(() => {
              updatingTrades.current = false;
            }, 100);
          }
        }
      };
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user?.ID, tradeMode, queryClient]);

  const handleTradeModeChange = (mode) => {
    localStorage.setItem('tradeMode', mode);
    setTradeMode(mode);
  };

  const trades = tradesQuery.data || [];

  return (
    <BrowserRouter>
      <div className="dashboard">
        <Sidebar />

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route
            path="/dashboard"
            element={
              <Dashboard
                tradeMode={tradeMode}
                setTradeMode={handleTradeModeChange}
                trades={trades}
              />
            }
          />

          <Route path="/add-trade" element={<AddTrade trades={trades} />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/TradeView" element={<TradeView trades={trades} />} />
          <Route path="/trade/:tradeId" element={<ThatTrade />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
