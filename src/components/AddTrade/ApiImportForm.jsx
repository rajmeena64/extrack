import React, { useState, useEffect } from 'react';

function ApiImportForm({ API_URL, setSelectedMT5AccountId }) {
  const [showConnectionForm, setShowConnectionForm] = useState(false);
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

  // Load connected accounts
  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/get-mt5-accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success && result.accounts && result.accounts.length > 0) {
        setAccounts(result.accounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const connectMT5API = async () => {
    const { broker, loginId, server, password, customServer } = formData;
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.ID) {
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const saveResponse = await fetch(`${API_URL}/api/save-mt5-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          broker_name: broker,
          account_id: loginId,
          server_name: finalServer,
          investor_password: password
        })
      });
      
      const saveResult = await saveResponse.json();
      
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
      console.error('Error:', error);
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
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      if (!token) {
        alert('Please login first!');
        return;
      }
      
      // Get all accounts to find the database ID
      const accountsResponse = await fetch(`${API_URL}/api/get-mt5-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const accountsResult = await accountsResponse.json();
      
      if (!accountsResult.success) {
        throw new Error('Failed to fetch accounts');
      }
      
      const account = accountsResult.accounts.find(acc => acc.account_id === accountId);
      
      if (!account) {
        throw new Error('Account not found');
      }
      
      // Delete using database ID
      const response = await fetch(`${API_URL}/api/delete-mt5-account/${account.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Account deleted successfully');
        loadConnectedAccounts();
        closeDeleteConfirmation();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      alert('❌ Error deleting account: ' + error.message);
      console.error(error);
      closeDeleteConfirmation();
    }
  };

  const toggleAccountPassword = (accountId) => {
    // Implement password toggle logic
    console.log('Toggle password for account:', accountId);
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
    } catch (e) {
      return 'Unknown';
    }
  };

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
                <i className="fas fa-trash"></i> Delete
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
              <div className="section-title">
                <i className="fas fa-plug"></i>
                Connect New MT5 Account
              </div>
              
              <div className="api-status" id="apiStatus">
                <i className={connectionStatus.icon}></i>
                <span>{connectionStatus.text}</span>
              </div>
              
              {/* Broker Selection */}
              <div className="form-group">
                <label htmlFor="broker" className="required">
                  Broker Name
                </label>
                <select 
                  id="broker" 
                  value={formData.broker} 
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select your MT5 Broker</option>
                  <option value="icmarkets">IC Markets</option>
                  <option value="exness">Exness</option>
                  <option value="pepperstone">Pepperstone</option>
                  <option value="fxtm">FXTM</option>
                  <option value="xm">XM</option>
                  <option value="fbs">FBS</option>
                  <option value="octafx">OctaFX</option>
                  <option value="hfm">HFM</option>
                  <option value="roboforex">RoboForex</option>
                  <option value="other">Other Broker</option>
                </select>
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
                  placeholder="Enter your MT5 Account Number" 
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
                  <div id="customServerContainer" style={{ marginTop: '10px' }}>
                    <input 
                      type="text" 
                      id="customServer" 
                      value={formData.customServer}
                      onChange={handleInputChange}
                      placeholder="Enter your custom server name" 
                    />
                  </div>
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
                    placeholder="Enter your MT5 Investor Password" 
                    required 
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
                <small className="hint">Note: Use Investor Password (not Master Password)</small>
              </div>

              {/* Connection Buttons */}
              <div className="connection-buttons">
                <button className="btn btn-secondary" onClick={() => setShowConnectionForm(false)}>
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button className="btn btn-success" onClick={connectMT5API}>
                  <i className="fas fa-plug"></i> Connect Account
                </button>
              </div>
            </div>
          ) : (
            <div className="connected-accounts-section">
              <div className="section-title">
                <i className="fas fa-link"></i>
                Connected Accounts
              </div>
              
              <div className="accounts-list" id="accountsList">
                {loading ? (
                  <div className="loading-accounts">
                    <i className="fas fa-spinner fa-spin"></i>
                    Loading connected accounts...
                  </div>
                ) : accounts.length > 0 ? (
                  accounts.map(account => (
                    <div key={account.id} className="account-item" data-account-id={account.account_id}>
                      <div className="account-header">
                        <div className="account-info">
                          <i className={`fas fa-check-circle ${account.connection_status === 'connected' ? 'status-connected' : 'status-disconnected'}`}></i>
                          <span className="account-name">{account.broker_name}</span>
                          <span className="account-id">ID: {account.account_id}</span>
                        </div>
                        <div className="account-actions">
                          <button className="btn-icon" onClick={() => toggleAccountPassword(account.account_id)} title="Show/Hide Password">
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            className="btn-icon delete" 
                            onClick={() => confirmDelete(account.account_id, account.broker_name)} 
                            title="Delete Account"
                          >
                            <i className="fas fa-trash"></i>
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
                    <i className="fas fa-plus-circle"></i>
                    No connected accounts found. Add your first MT5 account.
                  </div>
                )}
              </div>
              
              <div className="add-account-btn" onClick={() => setShowConnectionForm(true)}>
                <i className="fas fa-plus-circle"></i>
                Add New MT5 Account
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Warning Section */}
        <div className="form-card">
          <div className="section-title">
            <i className="fas fa-exclamation-triangle"></i>
            Important Information
          </div>
          
          <div className="warning-note">
            <i className="fas fa-exclamation-triangle"></i>
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