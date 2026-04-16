
// import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// import '@fontsource/roboto/400.css';
// import '@fontsource/roboto/500.css';
// import '@fontsource/roboto/700.css';

// import './styles/style.css';

// import Sidebar from './components/Sidebar/Sidebar';
// import Dashboard from './components/dashboard/dashboard';
// import { TradeManager } from './utils/tradeManager';
// import { API_URL } from './utils/constants';

// /* ---------------- PAGES ---------------- */
// import AddTrade from './components/AddTrade/AddTrade';
// import Analytics from './components/Analytics/Analytics';
// import TradeView from './components/Daily/TradeView';
// import ThatTrade from './components/Daily/ThatTrade/ThatTrade';

// function Profile() {
//   const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

//   return (
//     <div style={{ padding: '40px' }}>
//       <h1>User Profile</h1>
//       {currentUser ? (
//         <>
//           <p><strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}</p>
//           <p><strong>Email:</strong> {currentUser.email}</p>
//         </>
//       ) : (
//         <p>Please login</p>
//       )}
//     </div>
//   );
// }

// function App() {
//   const [user, setUser] = useState(null);
//   const [tradeMode, setTradeMode] = useState(() => localStorage.getItem('tradeMode') || 'all');

//   const tradeManager = useMemo(() => new TradeManager(), []);
//   const queryClient = useQueryClient();
//   const ws = useRef(null);
//   const updatingTrades = useRef(false);

//   // Load current user
//   useEffect(() => {
//     const currentUser = JSON.parse(localStorage.getItem('currentUser'));
//     setUser(currentUser);
//   }, []);

//   const tradesQuery = useQuery({
//     queryKey: ['trades', user?.ID, tradeMode],
//     enabled: Boolean(user?.ID),
//     queryFn: () => tradeManager.loadTrades(user.ID, tradeMode),
//     placeholderData: (previousData) => previousData,
//   });

//   // WebSocket
//   useEffect(() => {
//     if (!user?.ID) return;

//     if (!ws.current) {
//       ws.current = new WebSocket(API_URL);

//       ws.current.onmessage = async (event) => {
//         const msg = JSON.parse(event.data);

//         if (msg.type === 'TRADE_UPDATED') {
//           if (updatingTrades.current) return;

//           updatingTrades.current = true;

//           try {
//             await queryClient.invalidateQueries({
//               queryKey: ['trades', user.ID, tradeMode],
//             });
//           } catch (err) {
//             console.error('Error updating trades:', err);
//           } finally {
//             setTimeout(() => {
//               updatingTrades.current = false;
//             }, 100);
//           }
//         }
//       };
//     }

//     return () => {
//       if (ws.current) {
//         ws.current.close();
//         ws.current = null;
//       }
//     };
//   }, [user?.ID, tradeMode, queryClient]);

//   const handleTradeModeChange = (mode) => {
//     localStorage.setItem('tradeMode', mode);
//     setTradeMode(mode);
//   };

//   const trades = tradesQuery.data || [];

//   return (
//     <BrowserRouter>
//       <div className="dashboard">
//         <Sidebar />

//         <Routes>
//           <Route path="/" element={<Navigate to="/dashboard" />} />

//           <Route
//             path="/dashboard"
//             element={
//               <Dashboard
//                 tradeMode={tradeMode}
//                 setTradeMode={handleTradeModeChange}
//                 trades={trades}
//                 isLoading={trades.length === 0} 
//               />
//             }
//           />

//           <Route path="/add-trade" element={<AddTrade trades={trades} />} />
//           <Route path="/analytics" element={<Analytics />} />
//           <Route path="/profile" element={<Profile />} />
//           <Route path="/TradeView" element={<TradeView trades={trades} />} />
//           <Route path="/trade/:tradeId" element={<ThatTrade />} />
//         </Routes>
//       </div>
//     </BrowserRouter>
//   );
// }

// export default App;










import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './styles/app-shell.css';

import Sidebar from './components/Sidebar/Sidebar';
import { TradeManager } from './utils/tradeManager';
import { API_URL } from './utils/constants';
import { ThemeProvider } from './context/ThemeContext'; 


/* ---------------- LAZY LOADED PAGES ---------------- */
// These will load only when needed (Code Splitting)
const Dashboard = lazy(() => import('./components/dashboard/dashboard'));
const AddTrade = lazy(() => import('./components/AddTrade/AddTrade'));
const Analytics = lazy(() => import('./components/Analytics/Analytics'));
const TradeView = lazy(() => import('./components/Daily/TradeView'));
const ThatTrade = lazy(() => import('./components/Daily/ThatTrade/ThatTrade'));

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
    placeholderData: (previousData) => previousData,
  });

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
  const isTradesLoading =
    Boolean(user?.ID) &&
    tradesQuery.isPending &&
    !Array.isArray(tradesQuery.data);

  return (
    <BrowserRouter>
    <ThemeProvider>
      <div className="dashboard">
        <Sidebar />

        {/* Suspense shows loading screen while page loads */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />

            <Route
              path="/dashboard"
              element={
                <Dashboard
                  tradeMode={tradeMode}
                  setTradeMode={handleTradeModeChange}
                  trades={trades}
                  isLoading={isTradesLoading}
                />
              }
            />

            <Route path="/add-trade" element={<AddTrade trades={trades} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/TradeView" element={<TradeView trades={trades} />} />
            <Route path="/trade/:tradeId" element={<ThatTrade />} />
          </Routes>
        </Suspense>
      </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
