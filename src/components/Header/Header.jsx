import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import './Header.css';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));
const Profile = lazy(() => import('./profile'));

function Header({ tradeMode, setTradeMode, trades = [] }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const filterRef = useRef(null);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

  const modes = [
    { value: 'all', label: 'All Trades' },
    { value: 'manual', label: 'Manual Trades' },
    { value: 'api', label: 'API Trades' },
  ];

  const currentLabel =
    modes.find((mode) => mode.value === tradeMode)?.label || 'All Trades';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const heroName = currentUser?.firstName || 'Trader';

  const latestTradeLabel = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return 'No imports yet';
    }

    const sortedTrades = [...trades].sort(
      (left, right) => new Date(right.timestamp) - new Date(left.timestamp)
    );

    const latestTrade = sortedTrades[0];
    if (!latestTrade?.timestamp) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(latestTrade.timestamp));
  }, [trades]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    if (profileOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => document.removeEventListener('keydown', handleEsc);
  }, [profileOpen]);

  return (
    <>
      <header className="dashboard-header">
        <div className="dashboard-header__hero">
          <div className="dashboard-header__title-row">
            <div>
              <h1>
                {greeting}, {heroName}!
              </h1>
            </div>

            <div className="dashboard-header__meta">
              <span className="dashboard-header__meta-pill">
                <RefreshCw size={14} />
                Last import was made: {latestTradeLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__search">
            <Search size={16} />
            <input type="text" placeholder="Search symbols, strategy, setup" />
          </div>

          <div className="dashboard-toolbar__controls">
            <button className="toolbar-chip" type="button">
              <SlidersHorizontal size={15} />
              Filters
            </button>

            <div className="trade-filter-wrapper" ref={filterRef}>
              <button
                className="toolbar-chip"
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
              >
                {currentLabel}
                <ChevronDown size={15} />
              </button>

              {filterOpen && (
                <div className="trade-filter-menu">
                  {modes.map((mode) => (
                    <div
                      key={mode.value}
                      className={`filter-menu-item ${tradeMode === mode.value ? 'active' : ''}`}
                      onClick={() => {
                        setTradeMode(mode.value);
                        setFilterOpen(false);
                      }}
                    >
                      {mode.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isMobile && (
              <button
                className="toolbar-chip"
                type="button"
                onClick={() => navigate('/add-trade')}
              >
                <Download size={15} />
                Import
              </button>
            )}

            <button
              className="toolbar-primary"
              type="button"
              onClick={() => navigate('/add-trade')}
            >
              <Plus size={16} />
              Import trades
            </button>

            {currentUser ? (
              <div
                className="header-user"
                style={{ cursor: 'pointer' }}
                onClick={() => setProfileOpen(true)}
              >
                <div className="user-avatar">
                  {currentUser.firstName?.[0]}
                  {currentUser.lastName?.[0]}
                </div>
                <div className="header-user__text">
                  <span className="user-name">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="user-role">Active account</span>
                </div>
              </div>
            ) : (
              <div
                className="header-user"
                onClick={() => setShowLoginModal(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar">Ur</div>
                <div className="header-user__text">
                  <span className="user-name">Login</span>
                  <span className="user-role">Open your profile</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {profileOpen && (
        <div className="profile-overlay">
          <Suspense fallback={null}>
            <Profile user={currentUser} onClose={() => setProfileOpen(false)} />
          </Suspense>
        </div>
      )}

      <Suspense fallback={null}>
        <UserLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </Suspense>
    </>
  );
}

export default Header;
