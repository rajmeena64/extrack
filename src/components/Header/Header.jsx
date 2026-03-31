import React, { useState, useEffect, useRef } from 'react';
import UserLoginModal from '../user/UserLoginModal/UserLoginModal';
import Profile from './profile';
import './Header.css';

function Header({ tradeMode, setTradeMode }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false); // ✅ NEW
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768); // ✅ NEW

  const filterRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

  const modes = [
    { value: 'all', label: 'All Trades' },
    { value: 'manual', label: 'Manual Trades' },
    { value: 'api', label: 'API Trades' }
  ];

  const currentLabel =
    modes.find(m => m.value === tradeMode)?.label || 'All Trades';

  /* ---------- MOBILE DETECT ---------- */
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setCollapsed(false); // desktop pe auto open
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ---------- OUTSIDE CLICK (FILTER ONLY) ---------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen]);

  /* ---------- ESC CLOSE PROFILE ---------- */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };

    if (profileOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => document.removeEventListener('keydown', handleEsc);
  }, [profileOpen]);

  return (
    <>
      <header className="dashboard-header">

        {/* LEFT */}
        <div className="header-left">
          <h1>Dashboard</h1>
        </div>

        {/* CENTER */}
        <div className="header-center">
          <input
            type="text"
            placeholder="Search"
            className="header-search"
          />
          <span className="shortcut">⌘ F</span>
        </div>

        {/* COLLAPSE BUTTON (Mobile Only) */}
        {isMobile && (
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(prev => !prev)}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        )}

        {/* RIGHT */}
        {(!isMobile || !collapsed) && (
          <div className="header-right">

            {/* TRADE FILTER */}
            <div className="trade-filter-wrapper" ref={filterRef}>
              <button
                className="header-btn"
                onClick={() => setFilterOpen(prev => !prev)}
              >
                {currentLabel} ▾
              </button>

              {filterOpen && (
                <div className="trade-filter-menu">
                  {modes.map(mode => (
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

            <button className="header-btn primary">Export CSV</button>

            {/* USER */}
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
                <span className="user-name">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
              </div>
            ) : (
              <div
                className="header-user"
                onClick={() => setShowLoginModal(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar">Ur</div>
                <span className="user-name">Login</span>
              </div>
            )}

          </div>
        )}
      </header>

      {/* PROFILE OVERLAY */}
      {profileOpen && (
        <div className="profile-overlay">
          <Profile
            user={currentUser}
            onClose={() => setProfileOpen(false)}
          />
        </div>
      )}

      <UserLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}

export default Header;
