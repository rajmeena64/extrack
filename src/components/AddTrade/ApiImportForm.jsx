import React, { useState, useEffect, useCallback } from 'react';
import LegacyIcon from '../Common/LegacyIcon';
import api from '../../utils/serve';
import { useAuth } from '../../context/AuthContext';

const BROKER_ICONS = [
  { key: 'exness', label: 'Exness', src: '/assets/broker/exness image.svg' },
  { key: 'xm', label: 'XM', src: '/assets/broker/xm.svg' },
  { key: 'vantage', label: 'Vantage', src: '/assets/broker/vantage.svg' }
];

const BROKER_OPTIONS = [
  { value: 'icmarkets', label: 'IC Markets' },
  { value: 'exness', label: 'Exness' },
  { value: 'pepperstone', label: 'Pepperstone' },
  { value: 'fxtm', label: 'FXTM' },
  { value: 'xm', label: 'XM' },
  { value: 'vantage', label: 'Vantage' },
  { value: 'fbs', label: 'FBS' },
  { value: 'octafx', label: 'OctaFX' },
  { value: 'hfm', label: 'HFM' },
  { value: 'roboforex', label: 'RoboForex' },
  { value: 'other', label: 'Other Broker' }
];

const getBrokerIcon = (brokerName = '') => {
  const normalizedBroker = brokerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BROKER_ICONS.find(({ key, label }) => (
    normalizedBroker.includes(key) || normalizedBroker.includes(label.toLowerCase())
  ));
};

const getBrokerOption = (brokerName = '') => {
  const normalizedBroker = brokerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BROKER_OPTIONS.find(({ value, label }) => {
    const normalizedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedBroker === normalizedValue
      || normalizedBroker === normalizedLabel
      || normalizedBroker.includes(normalizedValue)
      || normalizedBroker.includes(normalizedLabel);
  });
};

const getBrokerLabel = (brokerName = '') => {
  const brokerOption = getBrokerOption(brokerName);
  return brokerOption?.label || brokerName || 'MT5 Broker';
};

function ApiImportForm({ setSelectedMT5AccountId }) {
  const { user } = useAuth();
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showBrokerMenu, setShowBrokerMenu] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({
    icon: 'fas fa-circle status-disconnected',
    text: 'Not Connected'
  });
  const [formData, setFormData] = useState({
    broker: '',
    loginId: '',
    server: '',
    password: '',
    customServer: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    accountId: null,
    accountName: ''
  });

  const loadConnectedAccounts = useCallback(async () => {
    try {
      if (!user?.ID) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const { data: result } = await api.get('/get-mt5-accounts');
      
      if (result.success && result.accounts && result.accounts.length > 0) {
        setAccounts(result.accounts);
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.ID]);

  // Load connected accounts
  useEffect(() => {
    loadConnectedAccounts();
  }, [loadConnectedAccounts]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleBrokerSelect = (brokerValue) => {
    setFormData(prev => ({
      ...prev,
      broker: brokerValue
    }));
    setShowBrokerMenu(false);
  };

  const connectMT5API = async () => {
    const { broker, loginId, server, password, customServer } = formData;
    
    if (!user?.ID) {
      alert('Please login first!');
      window.location.href = '/login';
      return;
    }
    
    let finalServer = server;
    if (server === 'custom') {
      finalServer = customServer.trim();
      if (!finalServer) {
        alert('Please enter custom server name');
        return;
      }
    }
    
    if (!broker || !loginId || !finalServer || !password) {
      alert('Please fill all required fields');
      return;
    }
    
    setConnectionStatus({
      icon: 'fas fa-circle status-connecting',
      text: 'Connecting...'
    });
    
    try {
      const { data: saveResult } = await api.post('/save-mt5-account', {
        broker_name: broker,
        account_id: loginId,
        server_name: finalServer,
        investor_password: password
      });
      
      if (!saveResult.success) {
        throw new Error('Failed to save credentials: ' + saveResult.error);
      }
      
      setConnectionStatus({
        icon: 'fas fa-circle status-connected',
        text: 'Connected to MT5'
      });
      
      alert('✅ Account saved successfully!');
      
      // Reload accounts after connection
      setTimeout(() => {
        loadConnectedAccounts();
        setShowConnectionForm(false);
      }, 1000);
      
    } catch (error) {
      setConnectionStatus({
        icon: 'fas fa-circle status-disconnected',
        text: 'Error'
      });
      alert('❌ Error: ' + error.message);
    }
  };

  // Show delete confirmation dialog
  const confirmDelete = (accountId, accountName) => {
    setDeleteConfirmation({
      show: true,
      accountId,
      accountName
    });
  };

  // Close delete confirmation
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      show: false,
      accountId: null,
      accountName: ''
    });
  };

  // Actual delete function
  const deleteAccount = async () => {
    const { accountId } = deleteConfirmation;
    
    if (!accountId) return;
    
    try {
      if (!user?.ID) {
        alert('Please login first!');
        return;
      }
      
      const { data: accountsResult } = await api.get('/get-mt5-accounts');
      
      if (!accountsResult.success) {
        throw new Error('Failed to fetch accounts');
      }
      
      const account = accountsResult.accounts.find(acc => acc.account_id === accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }
      
      // Delete using database ID
      const { data: result } = await api.delete(`/delete-mt5-account/${account.id}`);
      
      if (result.success) {
        alert('✅ Account deleted successfully');
        loadConnectedAccounts();
        closeDeleteConfirmation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert('❌ Error deleting account: ' + error.message);
      closeDeleteConfirmation();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const renderBrokerLogo = (brokerName) => {
    const brokerIcon = getBrokerIcon(brokerName);

    if (!brokerIcon) {
      return (
        <span className="broker-logo broker-logo--fallback" aria-hidden="true">
          {(brokerName || 'MT5').slice(0, 2).toUpperCase()}
        </span>
      );
    }

    return (
      <span className="broker-logo">
        <img src={brokerIcon.src} alt={`${brokerIcon.label} broker`} />
      </span>
    );
  };

  const renderBrokerOptionIcon = (brokerName) => (
    <span className="broker-option-icon">
      {renderBrokerLogo(brokerName)}
    </span>
  );

  const selectedBrokerOption = getBrokerOption(formData.broker);

  return (
    <div className="form-container api-section">
      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="modal" style={{display: 'flex'}}>
          <div className="modal-content">
            <h3>Delete Account</h3>
            <p>
              Are you sure you want to delete account <strong>{deleteConfirmation.accountName}</strong>?
            </p>
            <p className="warning-text">
              ⚠️ This will also delete all trades imported from this account!
              <br />
              This action cannot be undone!
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={closeDeleteConfirmation}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={deleteAccount}
              >
                <LegacyIcon className="fas fa-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-layout">
        {/* Left Side - Connected Accounts & Connection Form */}
        <div className="api-card">
          {showConnectionForm ? (
            <div className="connection-form" id="connectionForm">
              <div className="sync-panel-head">
                <div>
                  <div className="section-title">
                    <LegacyIcon className="fas fa-plug" />
                    Connect New MT5 Account
                  </div>
                  <p className="sync-panel-copy">Keep your journal updated by linking an MT5 investor account.</p>
                </div>
                <div className="api-status" id="apiStatus">
                  <LegacyIcon className={connectionStatus.icon} />
                  <span>{connectionStatus.text}</span>
                </div>
              </div>

              <div className="connection-fields">
                {/* Broker Selection */}
                <div className="form-group form-group--broker">
                  <label htmlFor="broker" className="required">
                    Broker Name
                  </label>
                  <div
                    className="broker-picker"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setShowBrokerMenu(false);
                      }
                    }}
                  >
                    <button
                      id="broker"
                      type="button"
                      className={`broker-picker__trigger ${!formData.broker ? 'is-placeholder' : ''}`}
                      aria-haspopup="listbox"
                      aria-expanded={showBrokerMenu}
                      onClick={() => setShowBrokerMenu(prev => !prev)}
                    >
                      {formData.broker ? (
                        renderBrokerOptionIcon(formData.broker)
                      ) : (
                        <span className="broker-logo broker-logo--fallback" aria-hidden="true">MT</span>
                      )}
                      <span>{selectedBrokerOption?.label || 'Select your MT5 Broker'}</span>
                      <LegacyIcon className="fas fa-chevron-down" />
                    </button>

                    {showBrokerMenu && (
                      <div className="broker-picker__menu" role="listbox" aria-label="Broker Name">
                        {BROKER_OPTIONS.map((broker) => (
                          <button
                            type="button"
                            key={broker.value}
                            className={`broker-picker__option ${formData.broker === broker.value ? 'is-selected' : ''}`}
                            role="option"
                            aria-selected={formData.broker === broker.value}
                            onClick={() => handleBrokerSelect(broker.value)}
                          >
                            {renderBrokerOptionIcon(broker.value)}
                            <span>{broker.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              
                {/* Account ID */}
                <div className="form-group">
                  <label htmlFor="loginId" className="required">
                    MT5 Account ID
                  </label>
                  <input 
                    type="number" 
                    id="loginId" 
                    value={formData.loginId}
                    onChange={handleInputChange}
                    placeholder="Account Number" 
                    required 
                  />
                </div>
              
                {/* Server Name */}
                <div className="form-group">
                  <label htmlFor="server" className="required">
                    Server Name
                  </label>
                  <select 
                    id="server" 
                    value={formData.server}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Server</option>
                    <option value="ICMarkets-MT5-1">ICMarkets-MT5-1</option>
                    <option value="ICMarkets-MT5-2">ICMarkets-MT5-2</option>
                    <option value="ICMarkets-MT5-Demo">ICMarkets-MT5-Demo</option>
                    <option value="Exness-MT5Real">Exness-MT5Real</option>
                    <option value="Exness-MT5Trial">Exness-MT5Trial</option>
                    <option value="Pepperstone-MT5">Pepperstone-MT5</option>
                    <option value="FXTM-MT5">FXTM-MT5</option>
                    <option value="XM-2-MT5">XM-2-MT5</option>
                    <option value="FBS-MT5">FBS-MT5</option>
                    <option value="OctaFX-MT5">OctaFX-MT5</option>
                    <option value="MetaQuotes-Demo">MetaQuotes-Demo</option>
                    <option value="custom">Other / Custom Server</option>
                  </select>
                  
                  {/* Custom Server Input */}
                  {formData.server === 'custom' && (
                    <input 
                      className="custom-server-input"
                      type="text" 
                      id="customServer" 
                      value={formData.customServer}
                      onChange={handleInputChange}
                      placeholder="Enter your custom server name" 
                    />
                  )}
                </div>
              
                {/* Investor Password */}
                <div className="form-group">
                  <label htmlFor="password" className="required">
                    Investor Password
                  </label>
                  <div className="password-input-group">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      id="password" 
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Investor Password" 
                      required 
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <LegacyIcon className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                    </button>
                  </div>
                  <small className="hint">Use Investor Password, not Master Password.</small>
                </div>
              </div>

              {/* Connection Buttons */}
              <div className="connection-buttons">
                <button className="btn btn-secondary" onClick={() => setShowConnectionForm(false)}>
                  <LegacyIcon className="fas fa-times" /> Cancel
                </button>
                <button className="btn btn-success" onClick={connectMT5API}>
                  <LegacyIcon className="fas fa-plug" /> Connect Account
                </button>
              </div>
            </div>
          ) : (
            <div className="connected-accounts-section">
              <div className="sync-panel-head">
                <div>
                  <div className="section-title">
                    <LegacyIcon className="fas fa-link" />
                    Connected Accounts
                  </div>
                  <p className="sync-panel-copy">Manage accounts used for trade sync.</p>
                </div>
                <span className="account-count-pill">{accounts.length} linked</span>
              </div>
              
              <div className="accounts-list" id="accountsList">
                {loading ? (
                  <div className="loading-accounts">
                    <LegacyIcon className="fas fa-spinner fa-spin" />
                    Loading connected accounts...
                  </div>
                ) : accounts.length > 0 ? (
                  accounts.map(account => (
                    <div key={account.id} className="account-item" data-account-id={account.account_id}>
                      <div className="account-header">
                        <div className="account-info">
                          {renderBrokerLogo(account.broker_name)}
                          <div className="account-title-block">
                            <span className="account-name">{getBrokerLabel(account.broker_name)}</span>
                            <span className="account-id">ID {account.account_id}</span>
                          </div>
                        </div>
                        <span className={`account-status-pill ${account.connection_status === 'connected' ? 'is-connected' : 'is-disconnected'}`}>
                          <LegacyIcon className="fas fa-check-circle" />
                          {account.connection_status || 'disconnected'}
                        </span>
                        <div className="account-actions">
                          <button 
                            className="btn-icon delete" 
                            onClick={() => confirmDelete(account.account_id, account.broker_name)} 
                            title="Delete Account"
                          >
                            <LegacyIcon className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                      <div className="account-details">
                        <div className="detail-item">
                          <span className="detail-label">Server:</span>
                          <span className="detail-value">{account.server_name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Password:</span>
                          <span className="detail-value password-field">••••••••</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Status:</span>
                          <span className={`detail-value ${account.connection_status === 'connected' ? 'status-connected' : 'status-disconnected'}`}>
                            {account.connection_status || ' connected'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Added:</span>
                          <span className="detail-value">{formatDate(account.created_at)}</span>
                        </div>
                        <button 
                          className="btn btn-warning"
                          onClick={() => setSelectedMT5AccountId(account.account_id)}
                        >
                          Change Password
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-accounts">
                    <LegacyIcon className="fas fa-plus-circle" />
                    No connected accounts found. Add your first MT5 account.
                  </div>
                )}
              </div>
              
              <div className="add-account-btn" onClick={() => setShowConnectionForm(true)}>
                <span className="broker-logo-stack" aria-hidden="true">
                  {BROKER_ICONS.map(broker => (
                    <span className="broker-logo broker-logo--stacked" key={broker.key}>
                      <img src={broker.src} alt="" />
                    </span>
                  ))}
                </span>
                <span>Add New MT5 Account</span>
                <LegacyIcon className="fas fa-plus-circle" />
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Warning Section */}
        <div className="form-card">
          <div className="section-title">
            <LegacyIcon className="fas fa-exclamation-triangle" />
            Important Information
          </div>
          
          <div className="warning-note">
            <LegacyIcon className="fas fa-exclamation-triangle" />
            <strong>Warning:</strong> Deleting an account will also delete all trades imported from that account.
          </div>
          
          <div className="info-box">
            <p><strong>Account Security:</strong></p>
            <ul>
              <li>Only Investor Password is stored (not Master Password)</li>
              <li>Passwords are encrypted in our database</li>
              <li>Your account credentials are secure</li>
              <li>We cannot execute trades on your behalf</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiImportForm;



