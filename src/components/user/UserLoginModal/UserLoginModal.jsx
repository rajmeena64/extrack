// src/components/user/UserLoginModal/UserLoginModal.jsx
import React, { useState, useEffect } from 'react';
import './UserLoginModal.css';

import { API_URL } from "../../../utils/constants";

function UserLoginModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'signup', 'forgot'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
    forgotEmail: '',
    currency: 'USD',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editData, setEditData] = useState({});




  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem("accessToken");
    
    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        // Auto switch to logged in state
        const loginForm = document.getElementById('loginForm');
        const logoutSection = document.getElementById('logoutSection');
        if (loginForm) loginForm.style.display = 'none';
        if (logoutSection) logoutSection.style.display = 'block';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  // ESC key se close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ✅ LOGIN API CALL
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const loginData = {
      email: loginMethod === 'email' ? formData.email : null,
      phone: loginMethod === 'phone' ? formData.phone : null,
      password: formData.password
    };

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.accessToken);
        
        const userData = {
          ID: data.user.ID,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          phone: data.user.phone,
          accountType: data.user.accountType || 'manual',
          preferred_currency: data.user.preferred_currency || 'USD'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        
        alert(`Welcome back ${data.user.firstName}!`);
        onClose();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGNUP API CALL
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    setLoading(true);
    
    const signupData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phoneNumber,
      password: formData.password,
      preferred_currency: formData.currency
    };

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.accessToken);
        
        const userData = {
          ID: data.user.ID,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          phone: data.user.phone,
          accountType: 'manual',
          preferred_currency: data.user.preferred_currency || formData.currency
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        
        alert(`Welcome ${formData.firstName} ${formData.lastName}!`);
        onClose();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FORGOT PASSWORD API CALL
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.forgotEmail }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Password reset link sent to your email!');
        setActiveTab('login');
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('⚠️ Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGOUT
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setActiveTab('login');
      window.alert('Logged out successfully!');
    }
  };

  // ✅ EDIT PROFILE
  const handleEditProfile = () => {
    if (currentUser) {
      setEditData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: currentUser.phone,
        currency: currentUser.preferred_currency || 'USD'
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateProfile = async () => {
    const accessToken = localStorage.getItem('accessToken');
    
    const updatedData = {
      firstName: editData.firstName,
      lastName: editData.lastName,
      email: editData.email,
      phone: editData.phone,
      preferred_currency: editData.currency
    };

    try {
      const response = await fetch(`${API_URL}/api/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = {
          ...currentUser,
          ...updatedData
        };
        
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        alert('Profile updated successfully!');
        setIsEditModalOpen(false);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  // ✅ DELETE ACCOUNT
  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAccount = async (password) => {
    const accessToken = localStorage.getItem('accessToken');
    
    try {
      const response = await fetch(`${API_URL}/api/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert('Account deleted successfully!');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
        setActiveTab('login');
        setIsDeleteModalOpen(false);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Network error');
    }
  };

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'USC', label: 'US Cents (USC)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'INR', label: 'Indian Rupee (INR)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'CHF', label: 'Swiss Franc (CHF)' }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <div className="header-left">
            <div className="logo">
              <i className="fas fa-chart-line"></i>
              <div className="logo-text">
                <span className="pip">PIP</span><span className="x"> Trade</span>
                <span className="trade"> Trade</span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            {currentUser && (
              <a href="../index.html" className="dashboard-btn">
                <i className="fas fa-tachometer-alt"></i>
                <span>Dashboard</span>
              </a>
            )}
            
            {currentUser && (
              <div className="user-profile-section">
                <button className="settings-gear" onClick={handleEditProfile}>
                  <i className="fas fa-user-circle"></i>
                </button>
              </div>
            )}
            
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="modal-body">
          <div className={`login-wrapper ${activeTab === 'signup' ? 'signup-active' : ''}`}>

            {/* RIGHT SIDE - FORMS */}
            <div className="form-section">
              <div className="form-container">
                
                {/* LOGIN FORM */}
                {!currentUser && activeTab === 'login' && (
                  <form id="loginForm" onSubmit={handleLoginSubmit}>
                    <div className="form-header">
                      <h2>Welcome Back</h2>
                      <p>Sign in to your trading account</p>
                    </div>
                    
                    <div className="login-options">
                      <button 
                        type="button" 
                        className={`login-option-btn ${loginMethod === 'email' ? 'active' : ''}`}
                        onClick={() => setLoginMethod('email')}
                      >
                        Email
                      </button>
                      <button 
                        type="button" 
                        className={`login-option-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                        onClick={() => setLoginMethod('phone')}
                      >
                        Phone
                      </button>
                    </div>
                    
                    {loginMethod === 'email' && (
                      <div className="form-group">
                        <label>Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    )}
                    
                    {loginMethod === 'phone' && (
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Password</label>
                      <div className="password-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Enter your password"
                          required
                        />
                        <button 
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                        </button>
                      </div>
                    </div>
                    
                    <div className="forgot-link">
                      <button 
                        type="button"
                        onClick={() => setActiveTab('forgot')}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                    
                    <div className="switch-text">
                      Don't have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('signup')}
                      >
                        Sign up
                      </button>
                    </div>
                  </form>
                )}                           {/* SIGNUP FORM */}
                {!currentUser && activeTab === 'signup' && (
                  <form id="signupForm" onSubmit={handleSignupSubmit}>
                    <div className="form-header">
                      <h2>Create Account</h2>
                      <p>Sign up for your trading account</p>
                    </div>
                    
                    <div className="name-fields">
                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="First name"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Last name"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Preferred Currency</label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="currency-select form-input"
                        required
                      >
                        {currencies.map(currency => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Password</label>
                      <div className="password-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="Create a password"
                          required
                        />
                        <button 
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                        </button>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Confirm your password"
                        required
                      />
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                    
                    <div className="switch-text">
                      Already have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('login')}
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {!currentUser && activeTab === 'forgot' && (
                  <form id="forgotPasswordForm" onSubmit={handleForgotSubmit}>
                    <div className="form-header">
                      <h2>Reset Password</h2>
                      <p>Enter your email to reset password</p>
                    </div>
                    
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="forgotEmail"
                        value={formData.forgotEmail}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    
                    <button type="submit" className="login-btn" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    
                    <div className="switch-text">
                      Remember your password?{' '}
                      <button 
                        type="button"
                        onClick={() => setActiveTab('login')}
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                )}

                {/* LOGGED IN SECTION */}
                {currentUser && (
                  <div id="logoutSection" className="logout-section">
                    <h2>Welcome to <span className="pip">PIP</span><span className="x">X</span></h2>
                    
                    <div className="user-info">
                      <p style={{ fontWeight: 600, marginBottom: '10px' }}>
                        {currentUser.firstName} {currentUser.lastName} ({currentUser.email})
                      </p>
                      <div className="account-type-badge">
                        {currentUser.accountType || 'manual'} Account
                      </div>
                    </div>

                    <div className="account-switcher">
                      <h3>Switch Account Type</h3>
                      <div className="account-buttons">
                        <button className={`account-btn ${currentUser.accountType === 'manual' ? 'active' : ''}`}>
                          <i className="fas fa-hand-paper"></i>
                          Manual
                        </button>
                        <button className={`account-btn ${currentUser.accountType === 'api' ? 'active' : ''}`}>
                          <i className="fas fa-code"></i>
                          API
                        </button>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button className="action-btn primary" onClick={() => window.location.href = '../index.html'}>
                        <i className="fas fa-tachometer-alt"></i>
                        Go to Dashboard
                      </button>
                      <button className="action-btn secondary" onClick={handleEditProfile}>
                        <i className="fas fa-user-edit"></i>
                        Edit Profile
                      </button>
                      <button className="action-btn danger" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <p>
            © 2024 PIPX Trade. All rights reserved. | 
            <a href="#"> Privacy Policy</a> | 
            <a href="#"> Terms of Service</a>
          </p>
        </div>

        {/* EDIT PROFILE MODAL */}
        {isEditModalOpen && (
          <div className="edit-modal">
            <div className="edit-content">
              <div className="edit-header">
                <h3><i className="fas fa-user-edit"></i> Edit Profile</h3>
                <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="edit-body">
                <div className="name-fields">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={editData.firstName}
                      onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={editData.lastName}
                      onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Preferred Currency</label>
                  <select
                    value={editData.currency}
                    onChange={(e) => setEditData({...editData, currency: e.target.value})}
                    className="currency-select"
                    required
                  >
                    {currencies.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="modal-actions">
                  <button className="save-btn" onClick={handleUpdateProfile}>
                    Save Changes
                  </button>
                  <button className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ACCOUNT MODAL */}
        {isDeleteModalOpen && (
          <div className="delete-modal">
            <div className="delete-content">
              <div className="delete-header">
                <i className="fas fa-exclamation-triangle"></i>
                <h3>Delete Account</h3>
              </div>
              
              <div className="delete-body">
                <p>This action cannot be undone. All your data will be permanently deleted.</p>
                <p>Are you sure you want to delete your account?</p>
                
                <div className="password-confirm">
                  <label>Enter your password to confirm:</label>
                  <input
                    type="password"
                    id="deletePassword"
                    className="form-input"
                    placeholder="Your password"
                  />
                </div>
              </div>
              
              <div className="delete-actions">
                <button className="btn-cancel" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-delete" 
                  onClick={() => {
                    const password = document.getElementById('deletePassword').value;
                    if (password) {
                      confirmDeleteAccount(password);
                    } else {
                      alert('Please enter your password');
                    }
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserLoginModal;