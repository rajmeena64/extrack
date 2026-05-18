import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  Plus,
  RefreshCw,
  Rocket,
  Search,
} from 'lucide-react';
import './Header.css';
import DateRangePicker from '../Common/DateRangePicker';
import { useAuth } from '../../context/AuthContext';
import { DASHBOARD_CURRENCIES, getCurrencyMeta } from '../../utils/Currency';
import { getTradeDisplayDate, getTradeDisplayTime } from '../../utils/tradeTime';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));
const Profile = lazy(() => import('./profile'));

function Header({
  tradeMode,
  setTradeMode,
  trades = [],
  dateRange,
  setDateRange,
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
}) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const filterRef = useRef(null);
  const currencyRef = useRef(null);
  const datePickerRef = useRef(null);
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();

  const modes = [
    { value: 'all', label: 'All Trades' },
    { value: 'manual', label: 'Manual Trades' },
    { value: 'api', label: 'Sync Trades' },
  ];

  const currentLabel =
    modes.find((mode) => mode.value === tradeMode)?.label || 'All Trades';
  const compactTradeLabel = tradeMode === 'manual' ? 'Manual' : tradeMode === 'api' ? 'Sync' : 'Trades';
  const selectedCurrency = getCurrencyMeta(currencyCode);
  const defaultCurrency = getCurrencyMeta(defaultCurrencyCode);
  const hasPopupOpen = filterOpen || datePickerOpen || currencyOpen;

  const latestTradeLabel = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return 'No imports yet';
    }

    const sortedTrades = [...trades].sort(
      (left, right) => getTradeDisplayTime(right) - getTradeDisplayTime(left)
    );

    const latestTradeDate = getTradeDisplayDate(sortedTrades[0]);
    if (!latestTradeDate) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(latestTradeDate);
  }, [trades]);

  const compactLatestTradeLabel = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return 'No imports yet';
    }

    const sortedTrades = [...trades].sort(
      (left, right) => getTradeDisplayTime(right) - getTradeDisplayTime(left)
    );

    const latestTradeDate = getTradeDisplayDate(sortedTrades[0]);
    if (!latestTradeDate) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(latestTradeDate);
  }, [trades]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(new Date(dateRange.from), 'dd MMM yyyy')} - ${format(
        new Date(dateRange.to),
        'dd MMM yyyy'
      )}`;
    }

    return 'All time';
  }, [dateRange]);

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
      if (datePickerOpen && datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setDatePickerOpen(false);
      }
      if (currencyOpen && currencyRef.current && !currencyRef.current.contains(event.target)) {
        setCurrencyOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currencyOpen, datePickerOpen, filterOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    if (profileOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => document.removeEventListener('keydown', handleEsc);
  }, [profileOpen]);

  useEffect(() => {
    document.body.classList.toggle('dashboard-popup-open', hasPopupOpen);

    return () => {
      document.body.classList.remove('dashboard-popup-open');
    };
  }, [hasPopupOpen]);

  return (
    <>
      {hasPopupOpen && (
        <div
          className="dashboard-popup-overlay"
          onClick={() => {
            setFilterOpen(false);
            setDatePickerOpen(false);
            setCurrencyOpen(false);
          }}
        />
      )}

      <header className="dashboard-header">
        <div className="dashboard-header__hero">
          <div className="dashboard-header__title-row">
            <div className="dashboard-header__headline">
              <span className="dashboard-header__eyebrow">Welcome back</span>
              <h1 className="app-page-title">Dashboard</h1>
            </div>

            <div className="dashboard-header__top-actions">
              {isMobile && (currentUser ? (
                <div
                  className="header-user header-user--hero"
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
                  className="header-user header-user--hero"
                  onClick={() => setShowLoginModal(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="user-avatar">Ur</div>
                  <div className="header-user__text">
                    <span className="user-name">Login</span>
                    <span className="user-role">Open your profile</span>
                  </div>
                </div>
              ))}
              {isMobile && (
                <button
                  className="header-user header-user--hero header-action-btn--import"
                  type="button"
                  onClick={() => navigate('/add-trade')}
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={20} color="#ffffff" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__controls">
            <div
              className={`toolbar-date-range ${
                filterOpen || currencyOpen ? 'toolbar-control--dimmed' : ''
              } ${datePickerOpen ? 'toolbar-control--active' : ''}`}
              ref={datePickerRef}
            >
              <button
                className={`toolbar-chip ${datePickerOpen ? 'toolbar-chip--active' : ''}`}
                type="button"
                onClick={() => setDatePickerOpen((prev) => !prev)}
                onMouseDown={() => {
                  setFilterOpen(false);
                  setCurrencyOpen(false);
                }}
              >
                <CalendarRange size={15} />
                <span className="toolbar-chip__text">
                  {isMobile ? 'All Time' : dateRangeLabel}
                </span>
                <ChevronDown size={15} />
              </button>

              {datePickerOpen && (
                <div className="toolbar-date-range__panel">
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange?.({
                        from: range?.from,
                        to: range?.to,
                      });
                    }}
                  />
                </div>
              )}
            </div>

            <div
              className={`trade-filter-wrapper ${
                datePickerOpen || currencyOpen ? 'toolbar-control--dimmed' : ''
              } ${filterOpen ? 'toolbar-control--active' : ''}`}
              ref={filterRef}
            >
              <button
                className="toolbar-chip"
                type="button"
                onClick={() => {
                  setFilterOpen((prev) => !prev);
                  setDatePickerOpen(false);
                  setCurrencyOpen(false);
                }}
              >
                <span className="toolbar-chip__text">
                  {isMobile ? compactTradeLabel : currentLabel}
                </span>
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

            <div
              className={`currency-filter-wrapper ${
                datePickerOpen || filterOpen ? 'toolbar-control--dimmed' : ''
              } ${currencyOpen ? 'toolbar-control--active' : ''}`}
              ref={currencyRef}
            >
              <button
                className={`toolbar-chip currency-chip ${currencyOpen ? 'toolbar-chip--active' : ''}`}
                type="button"
                onClick={() => {
                  setCurrencyOpen((prev) => !prev);
                  setDatePickerOpen(false);
                  setFilterOpen(false);
                }}
                title={`Dashboard currency: ${selectedCurrency.label}`}
              >
                <CircleDollarSign size={15} />
                <span className="toolbar-chip__text">
                  {isMobile ? selectedCurrency.code : `${selectedCurrency.symbol} ${selectedCurrency.code}`}
                </span>
                <ChevronDown size={15} />
              </button>

              {currencyOpen && (
                <div className="currency-filter-menu">
                  <div className="currency-filter-menu__eyebrow">
                    Default from MT5: {defaultCurrency.code}
                  </div>
                  {DASHBOARD_CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      className={`currency-menu-item ${selectedCurrency.code === currency.code ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        onCurrencyChange?.(currency.code);
                        setCurrencyOpen(false);
                      }}
                    >
                      <img src={currency.flag} alt="" className="currency-menu-item__flag" />
                      <span className="currency-menu-item__text">
                        <strong>{currency.code}</strong>
                        <small>{currency.shortLabel}</small>
                      </span>
                      <span className="currency-menu-item__symbol">{currency.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="dashboard-toolbar__search dashboard-toolbar__search--inline">
                <Search size={16} />
                <input type="text" placeholder="Search" />
              </div>
            )}

            {!isMobile && (
              <button
                className={`toolbar-primary ${datePickerOpen || filterOpen || currencyOpen ? 'toolbar-primary--dimmed' : ''}`}
                type="button"
                onClick={() => navigate('/add-trade')}
              >
                <Plus size={16} />
                <span className="toolbar-primary__text">Import trades</span>
              </button>
            )}

            {!isMobile && currentUser ? (
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
            ) : !isMobile ? (
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
            ) : null}
          </div>
        </div>

        <div className="dashboard-header__daily-row">
          <div className="dashboard-header__meta">
            <span className="dashboard-header__meta-pill">
              <RefreshCw size={14} />
              {isMobile ? `Last import ${compactLatestTradeLabel}` : `Last import was made: ${latestTradeLabel}`}
            </span>
          </div>

          <button className="start-day-btn" type="button" onClick={() => navigate('/day-review')}>
            <Rocket size={16} />
            <span>Start my day</span>
          </button>
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
