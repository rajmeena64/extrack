import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './styles/style.css';

import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/dashboard/dashboard';
import { TradeManager } from './utils/tradeManager';
import { API_URL } from "./utils/constants";

/* ---------------- PAGES ---------------- */
import AddTrade from './components/AddTrade/AddTrade';
import Analytics from "./components/Analytics/Analytics";
import TradeView from './components/Daily/TradeView';
import ThatTrade from './components/Daily/ThatTrade';

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

function App() {
  const [user, setUser] = useState(null);
  const [tradeMode, setTradeMode] = useState(() => localStorage.getItem('tradeMode') || 'all');
  const [trades, setTrades] = useState([]);

  const tradeManager = useMemo(() => new TradeManager(), []);
  const ws = useRef(null);

  // Load current user
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    setUser(currentUser);
  }, []);

  // Load trades
  useEffect(() => {
    if (user?.ID) {
      loadTradesData(user.ID, tradeMode);
    }
  }, [user, tradeMode]);

  const loadTradesData = async (userId, mode) => {
    try {
      const tradesData = await tradeManager.loadTrades(userId, mode);
      setTrades(tradesData);
    } catch (err) {
      // console.error('Error loading trades:', err);
      setTrades([]);
    }
  };

  const updatingTrades = useRef(false);

  // WebSocket
  useEffect(() => {
    if (!user?.ID) return;

    if (!ws.current) {
      ws.current = new WebSocket(API_URL);

      ws.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === "TRADE_UPDATED") {
          if (updatingTrades.current) return;

          updatingTrades.current = true;

          try {
            const tradesData = await tradeManager.loadTrades(user.ID, tradeMode);
            setTrades([...tradesData]);
          } catch (err) {
            console.error("Error updating trades:", err);
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
  }, [user, tradeMode]);

  const handleTradeModeChange = (mode) => {
    localStorage.setItem('tradeMode', mode);
    setTradeMode(mode);
  };

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