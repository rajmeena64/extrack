import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  CircleUserRound,
  EllipsisVertical,
  Plus,
  RefreshCw,
  Rocket,
  Search,
} from '../../icons/lucideIcons';
import { CalendarIcon, CurrencyIcon, FilterIcon } from '../../icons/interfaceIcons';
import './Header.css';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../Layout/PageHeader';
import { DASHBOARD_CURRENCIES, getCurrencyMeta } from '../../utils/Currency';
import { getTradeDisplayDate, getTradeDisplayTime } from '../../utils/tradeTime';
import { getGoogleProfilePicture } from '../../utils/userAvatar';

const UserLoginModal = lazy(() => import('../user/UserLoginModal/UserLoginModal'));
const Profile = lazy(() => import('./profile'));
const DateRangePicker = lazy(() => import('../Common/DateRangePicker'));

const formatDateLabel = (value) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(value));

function Header({
  tradeMode,
  setTradeMode,
  trades = [],
  dateRange,
  setDateRange,
  currencyCode = 'USD',
  defaultCurrencyCode = 'USD',
  onCurrencyChange,
  mt5Accounts = [],
  syncJobs = {},
  handleSyncNow,
}) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileActionPanel, setMobileActionPanel] = useState(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const filterRef = useRef(null);
  const currencyRef = useRef(null);
  const datePickerRef = useRef(null);
  const mobileActionsRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const navigate = useNavigate();

  const { user: currentUser } = useAuth();
  const googleProfilePicture = getGoogleProfilePicture(currentUser);

  const primaryAccount = mt5Accounts?.[0];
  const syncJob = primaryAccount ? syncJobs[primaryAccount.id] : null;
  const isSyncing = syncJob && !['success', 'failed'].includes(syncJob.status);

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
  const hasPopupOpen = filterOpen || datePickerOpen || currencyOpen || mobileActionsOpen;
  const hasActiveDateRange = Boolean(dateRange?.from && dateRange?.to);
  const shouldHideHeader = isHeaderHidden && !hasPopupOpen && !profileOpen && !showLoginModal;
  const profileName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim();
  const profileInitials = `${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`.trim() || 'U';

  const latestTradeDate = useMemo(() => {
    if (!Array.isArray(trades) || trades.length === 0) {
      return null;
    }

    const sortedTrades = [...trades].sort(
      (left, right) => getTradeDisplayTime(right) - getTradeDisplayTime(left)
    );

    return getTradeDisplayDate(sortedTrades[0]);
  }, [trades]);

  const latestTradeLabel = useMemo(() => {
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
  }, [latestTradeDate]);

  const compactLatestTradeLabel = useMemo(() => {
    if (!latestTradeDate) {
      return 'No imports yet';
    }

    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(latestTradeDate);
  }, [latestTradeDate]);

  const dateRangeLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${formatDateLabel(dateRange.from)} - ${formatDateLabel(dateRange.to)}`;
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
      if (mobileActionsOpen && mobileActionsRef.current && !mobileActionsRef.current.contains(event.target)) {
        setMobileActionsOpen(false);
        setMobileActionPanel(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currencyOpen, datePickerOpen, filterOpen, mobileActionsOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setMobileActionsOpen(false);
        setMobileActionPanel(null);
      }
    };

    if (profileOpen || mobileActionsOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileActionsOpen, profileOpen]);

  useEffect(() => {
    document.body.classList.toggle('dashboard-popup-open', hasPopupOpen);

    return () => {
      document.body.classList.remove('dashboard-popup-open');
    };
  }, [hasPopupOpen]);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');

    const getScrollY = () => Math.max(window.scrollY || 0, mainContent?.scrollTop || 0);

    const handleScroll = () => {
      if (hasPopupOpen || profileOpen || showLoginModal) {
        lastScrollYRef.current = getScrollY();
        return;
      }

      const currentScrollY = getScrollY();
      const previousScrollY = lastScrollYRef.current;
      const delta = currentScrollY - previousScrollY;

      if (currentScrollY <= 8) {
        setIsHeaderHidden(false);
      } else if (delta > 4) {
        setIsHeaderHidden(true);
      } else if (delta < -4) {
        setIsHeaderHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = getScrollY();

    window.addEventListener('scroll', handleScroll, { passive: true });
    mainContent?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainContent?.removeEventListener('scroll', handleScroll);
    };
  }, [hasPopupOpen, profileOpen, showLoginModal]);

  return (
    <>
      {hasPopupOpen && (
        <div
          className="dashboard-popup-overlay"
          onClick={() => {
            setFilterOpen(false);
            setDatePickerOpen(false);
            setCurrencyOpen(false);
            setMobileActionsOpen(false);
            setMobileActionPanel(null);
          }}
        />
      )}

      <PageHeader
        title="Dashboard"
        eyebrow="Welcome back"
        className={`dashboard-header ${shouldHideHeader ? 'dashboard-header--collapsed' : ''}`}
        actions={(
          <div className="dashboard-toolbar">
          <div className="dashboard-toolbar__controls">
            {isMobile && (
              <div className="mobile-dashboard-actions" ref={mobileActionsRef}>
                <button
                  className={`mobile-dashboard-actions__trigger ${mobileActionsOpen ? 'is-open' : ''}`}
                  type="button"
                  aria-label="Open dashboard actions"
                  aria-haspopup="menu"
                  aria-expanded={mobileActionsOpen}
                  onClick={() => {
                    setMobileActionsOpen((previous) => !previous);
                    setMobileActionPanel(null);
                    setDatePickerOpen(false);
                    setFilterOpen(false);
                    setCurrencyOpen(false);
                  }}
                >
                  <EllipsisVertical size={20} aria-hidden="true" />
                </button>

                {mobileActionsOpen && (
                  <div className="mobile-dashboard-actions__menu" role="menu">
                    <div className="mobile-dashboard-actions__group">
                      <button
                        className="mobile-dashboard-actions__item"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMobileActionsOpen(false);
                          setMobileActionPanel(null);
                          setDatePickerOpen(true);
                          setFilterOpen(false);
                          setCurrencyOpen(false);
                        }}
                      >
                        <span className="mobile-dashboard-actions__icon"><CalendarIcon size={17} aria-hidden="true" /></span>
                        <span>
                          <strong>Date range</strong>
                          <small>{dateRangeLabel}</small>
                        </span>
                      </button>
                    </div>

                    <div className="mobile-dashboard-actions__group">
                      <button
                        className="mobile-dashboard-actions__item"
                        type="button"
                        role="menuitem"
                        aria-expanded={mobileActionPanel === 'trades'}
                        onClick={() => setMobileActionPanel((current) => current === 'trades' ? null : 'trades')}
                      >
                        <span className="mobile-dashboard-actions__icon"><FilterIcon size={17} aria-hidden="true" /></span>
                        <span>
                          <strong>Trade mode</strong>
                          <small>{currentLabel}</small>
                        </span>
                        <ChevronDown className="mobile-dashboard-actions__chevron" size={16} aria-hidden="true" />
                      </button>
                      {mobileActionPanel === 'trades' && (
                        <div className="mobile-dashboard-actions__panel mobile-filter-options">
                          {modes.map((mode) => (
                            <button
                              key={mode.value}
                              className={`mobile-filter-option ${tradeMode === mode.value ? 'active' : ''}`}
                              type="button"
                              onClick={() => setTradeMode(mode.value)}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mobile-dashboard-actions__group">
                      <button
                        className="mobile-dashboard-actions__item"
                        type="button"
                        role="menuitem"
                        aria-expanded={mobileActionPanel === 'currency'}
                        onClick={() => setMobileActionPanel((current) => current === 'currency' ? null : 'currency')}
                      >
                        <span className="mobile-dashboard-actions__icon"><CurrencyIcon size={17} aria-hidden="true" /></span>
                        <span>
                          <strong>Currency</strong>
                          <small>{selectedCurrency.code} - {selectedCurrency.shortLabel}</small>
                        </span>
                        <img
                          src={selectedCurrency.flag}
                          alt=""
                          className="mobile-dashboard-actions__currency-flag"
                          aria-hidden="true"
                        />
                        <ChevronDown className="mobile-dashboard-actions__chevron" size={16} aria-hidden="true" />
                      </button>
                      {mobileActionPanel === 'currency' && (
                        <div className="mobile-dashboard-actions__panel mobile-filter-options mobile-filter-options--currency">
                          {DASHBOARD_CURRENCIES.map((currency) => (
                            <button
                              key={currency.code}
                              className={`mobile-filter-option ${selectedCurrency.code === currency.code ? 'active' : ''}`}
                              type="button"
                              onClick={() => onCurrencyChange?.(currency.code)}
                            >
                              <img src={currency.flag} alt="" aria-hidden="true" />
                              <span>{currency.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mobile-dashboard-actions__group">
                      <button
                        className="mobile-dashboard-actions__item"
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMobileActionsOpen(false);
                          setMobileActionPanel(null);
                          if (currentUser) setProfileOpen(true);
                          else setShowLoginModal(true);
                        }}
                      >
                        <span className="mobile-dashboard-actions__icon mobile-dashboard-actions__icon--avatar">
                          {currentUser ? (
                            <>
                              <span className="mobile-dashboard-actions__avatar-fallback" aria-hidden="true">
                                {profileInitials}
                              </span>
                              {googleProfilePicture && (
                                <img
                                  src={googleProfilePicture}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  onError={(event) => { event.currentTarget.hidden = true; }}
                                />
                              )}
                            </>
                          ) : (
                            <CircleUserRound size={17} aria-hidden="true" />
                          )}
                        </span>
                        <span>
                          <strong>{currentUser ? 'Profile' : 'Sign in'}</strong>
                          <small>{currentUser ? profileName : 'Access your account'}</small>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className={`toolbar-date-range ${
                filterOpen || currencyOpen ? 'toolbar-control--dimmed' : ''
              } ${datePickerOpen ? 'toolbar-control--active' : ''}`}
              ref={datePickerRef}
            >
              <button
                className={`toolbar-chip ${datePickerOpen ? 'toolbar-chip--active' : ''}`}
                type="button"
                aria-label={`Date range: ${dateRangeLabel}`}
                onClick={() => setDatePickerOpen((prev) => !prev)}
                onMouseDown={() => {
                  setFilterOpen(false);
                  setCurrencyOpen(false);
                }}
              >
                <CalendarIcon size={15} aria-hidden="true" />
                <span className="toolbar-chip__text">
                  {isMobile && hasActiveDateRange ? dateRangeLabel : isMobile ? 'All time' : dateRangeLabel}
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {datePickerOpen && (
                <div className="toolbar-date-range__panel">
                  <Suspense fallback={null}>
                    <DateRangePicker
                      value={dateRange}
                      onChange={(range) => {
                        setDateRange?.({
                          from: range?.from,
                          to: range?.to,
                        });
                      }}
                      numberOfMonths={isMobile ? 1 : 2}
                    />
                  </Suspense>
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
                className={`toolbar-chip ${filterOpen ? 'toolbar-chip--active' : ''}`}
                type="button"
                aria-label={`Trade filter: ${currentLabel}`}
                onClick={() => {
                  setFilterOpen((prev) => !prev);
                  setDatePickerOpen(false);
                  setCurrencyOpen(false);
                }}
              >
                <FilterIcon size={15} aria-hidden="true" />
                <span className="toolbar-chip__text">
                  {isMobile ? compactTradeLabel : currentLabel}
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {filterOpen && (
                <div className="trade-filter-menu" role="menu">
                  {modes.map((mode) => (
                    <button
                      key={mode.value}
                      className={`filter-menu-item ${tradeMode === mode.value ? 'active' : ''}`}
                      onClick={() => {
                        setTradeMode(mode.value);
                        setFilterOpen(false);
                      }}
                      role="menuitem"
                    >
                      {mode.label}
                    </button>
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
                aria-label={`Dashboard currency: ${selectedCurrency.label}`}
                onClick={() => {
                  setCurrencyOpen((prev) => !prev);
                  setDatePickerOpen(false);
                  setFilterOpen(false);
                }}
                title={`Dashboard currency: ${selectedCurrency.label}`}
              >
                <img
                  src={selectedCurrency.flag}
                  alt=""
                  className="toolbar-chip__flag"
                  aria-hidden="true"
                />
                <span className="toolbar-chip__text">
                  {isMobile ? selectedCurrency.code : `${selectedCurrency.symbol} ${selectedCurrency.code}`}
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {currencyOpen && (
                <div className="currency-filter-menu" role="menu">
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
                      role="menuitem"
                    >
                      <img src={currency.flag} alt="" className="currency-menu-item__flag" aria-hidden="true" />
                      <span className="currency-menu-item__text">
                        <strong>{currency.code}</strong>
                        <small>{currency.shortLabel}</small>
                      </span>
                      <span className="currency-menu-item__symbol" aria-hidden="true">{currency.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isMobile && (
              <div className="dashboard-toolbar__search dashboard-toolbar__search--inline">
                <Search size={16} aria-hidden="true" />
                <input type="text" placeholder="Search" aria-label="Search trades" />
              </div>
            )}

            {!isMobile && (
              <button
                className={`toolbar-primary ${datePickerOpen || filterOpen || currencyOpen ? 'toolbar-primary--dimmed' : ''}`}
                type="button"
                onClick={() => navigate('/add-trade')}
              >
                <Plus size={16} aria-hidden="true" />
                <span className="toolbar-primary__text">Import trades</span>
              </button>
            )}

            {!isMobile && currentUser ? (
              <button
                className="header-user"
                type="button"
                aria-label="Open profile"
                onClick={() => setProfileOpen(true)}
              >
                <div className="user-avatar" aria-hidden="true">
                  {currentUser.firstName?.[0]}
                  {currentUser.lastName?.[0]}
                  {googleProfilePicture && (
                    <img
                      src={googleProfilePicture}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                    />
                  )}
                </div>
                <div className="header-user__text">
                  <span className="user-name">
                    {currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="user-role">Active account</span>
                </div>
              </button>
            ) : !isMobile ? (
              <button
                className="header-user"
                type="button"
                aria-label="Login"
                onClick={() => setShowLoginModal(true)}
              >
                <div className="user-avatar" aria-hidden="true">Ur</div>
                <div className="header-user__text">
                  <span className="user-name">Login</span>
                  <span className="user-role">Open your profile</span>
                </div>
              </button>
            ) : null}
          </div>
          </div>
        )}
      />

      <div className={`dashboard-header__daily-row ${shouldHideHeader ? 'dashboard-header__daily-row--collapsed' : ''}`}>
        <div className="dashboard-header__meta">
          <span className="dashboard-header__meta-pill">
            <RefreshCw size={14} aria-hidden="true" />
            {isMobile ? `Last import ${compactLatestTradeLabel}` : `Last import was made: ${latestTradeLabel}`}
          </span>
          {primaryAccount && (
            <button
              className={`header-sync-btn ${isSyncing ? 'is-syncing' : ''}`}
              type="button"
              onClick={() => handleSyncNow(primaryAccount)}
              disabled={isSyncing}
              title="Sync MT5 account now"
            >
              <RefreshCw size={12} className={isSyncing ? 'spin-anim' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}
        </div>

        <button className="start-day-btn" type="button" onClick={() => navigate('/day-review')}>
          <Rocket size={16} aria-hidden="true" />
          <span>Start my day</span>
        </button>
      </div>

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
