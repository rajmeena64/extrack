// src/components/user/UserLoginModal/UserLoginModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import './UserLoginModal.css';
import LegacyIcon from '../../Common/LegacyIcon';
import Logo from '../../Common/Logo';
import CustomSelect from '../../Common/CustomSelect';

import { API_URL } from "../../../utils/constants";
import { useAuth } from '../../../context/AuthContext';
import { useAppDialog } from '../../../context/AppDialogContext';
import { clearClientStorage } from '../../../utils/clientStorage';

const FORGOT_RESET_STORAGE_KEY = 'entrack:forgotReset';
const DEFAULT_RESET_RESEND_SECONDS = 60;

function GoogleIcon() {
  return (
    <svg className="google-auth-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.26-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.58 2.68-3.9 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function UserLoginModal({ isOpen, onClose, initialTab = 'login' }) {
  const { user: currentUser, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'signup', 'forgot'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [forgotStep, setForgotStep] = useState('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  const otpInputRefs = useRef([]);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
    forgotEmail: '',
    forgotOtp: '',
    resetPassword: '',
    resetConfirmPassword: '',
    currency: 'USD',
    signupName: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const phoneLoginUnavailableMessage = 'Phone login is currently unavailable.';

  useEffect(() => {
    if (isOpen && !currentUser) {
      setActiveTab(initialTab);
    }
  }, [currentUser, initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || currentUser) return;

    try {
      const saved = JSON.parse(sessionStorage.getItem(FORGOT_RESET_STORAGE_KEY) || '{}');
      if (!saved.email || !['otp', 'password'].includes(saved.step)) return;

      setActiveTab('forgot');
      setForgotStep(saved.step);
      setResendCooldownUntil(Number(saved.resendCooldownUntil || 0));
      setFormData(prev => ({
        ...prev,
        forgotEmail: saved.email,
      }));
    } catch {
      sessionStorage.removeItem(FORGOT_RESET_STORAGE_KEY);
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    setFormError('');
  }, [activeTab, loginMethod]);

  useEffect(() => {
    if (forgotStep !== 'otp' || !resendCooldownUntil) return undefined;

    const updateCooldown = () => {
      setResendCooldown(Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000)));
    };

    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);

    return () => window.clearInterval(timerId);
  }, [forgotStep, resendCooldownUntil]);

  useEffect(() => {
    if (forgotStep === 'otp') {
      otpInputRefs.current[0]?.focus();
    }
  }, [forgotStep]);

  useEffect(() => {
    if (forgotStep === 'email' || !formData.forgotEmail.trim()) return;

    sessionStorage.setItem(FORGOT_RESET_STORAGE_KEY, JSON.stringify({
      email: formData.forgotEmail.trim(),
      step: forgotStep,
      resendCooldownUntil,
    }));
  }, [forgotStep, formData.forgotEmail, resendCooldownUntil]);

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
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = isOpen ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflowX = 'hidden';
      document.body.style.overflowY = 'auto';
    };
  }, [isOpen]);

  const digitsOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 15);
  const toPhoneCredential = (value) => {
    const digits = digitsOnly(value);
    return digits ? `+${digits}` : '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = ['phone'].includes(name)
      ? digitsOnly(value)
      : name === 'forgotOtp'
        ? String(value || '').replace(/\D/g, '').slice(0, 6)
        : value;
    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (formError) {
      setFormError('');
    }
  };

  const clearForgotResetFields = () => {
    setForgotStep('email');
    setResendCooldown(0);
    setResendCooldownUntil(0);
    sessionStorage.removeItem(FORGOT_RESET_STORAGE_KEY);
    setFormData(prev => ({
      ...prev,
      forgotOtp: '',
      resetPassword: '',
      resetConfirmPassword: '',
    }));
  };

  const startResendCooldown = (seconds) => {
    const nextSeconds = Math.max(0, Number(seconds) || DEFAULT_RESET_RESEND_SECONDS);
    const cooldownUntil = Date.now() + nextSeconds * 1000;
    setResendCooldown(nextSeconds);
    setResendCooldownUntil(cooldownUntil);
  };

  const updateForgotOtp = (nextOtp) => {
    setFormData(prev => ({
      ...prev,
      forgotOtp: String(nextOtp || '').replace(/\D/g, '').slice(0, 6),
    }));
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = String(value || '').replace(/\D/g, '').slice(-1);
    const digits = formData.forgotOtp.padEnd(6, ' ').split('');
    digits[index] = digit || ' ';
    updateForgotOtp(digits.join('').replace(/\s/g, ''));

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key !== 'Backspace') return;

    if (formData.forgotOtp[index]) {
      const digits = formData.forgotOtp.padEnd(6, ' ').split('');
      digits[index] = ' ';
      updateForgotOtp(digits.join('').replace(/\s/g, ''));
      return;
    }

    if (index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    updateForgotOtp(pastedOtp);

    const nextIndex = Math.min(pastedOtp.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // ✅ LOGIN API CALL
  const handleGoogleAuth = () => {
    if (!API_URL) {
      alert('Google sign-in is not configured yet.');
      return;
    }

    clearClientStorage();
    queryClient.clear();
    setUser(null);
    sessionStorage.setItem('entrack:oauthPending', 'true');
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handlePhoneLoginUnavailable = () => {
    setLoginMethod('email');
    setFormError(phoneLoginUnavailableMessage);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (loginMethod === 'phone') {
      setFormError(phoneLoginUnavailableMessage);
      return;
    }

    if (loginMethod === 'email' && !formData.email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (loginMethod === 'phone' && digitsOnly(formData.phone).length < 8) {
      setFormError('Please enter a valid phone number with country code.');
      return;
    }

    if (!formData.password) {
      setFormError('Please enter your password.');
      return;
    }

    setLoading(true);
    
    const loginData = loginMethod === 'email'
      ? { email: formData.email, password: formData.password }
      : { phone: toPhoneCredential(formData.phone), password: formData.password };

    try {
      clearClientStorage();
      queryClient.clear();
      setUser(null);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });

      const data = await response.json();

      const responseUser = data.data?.user || data.user;
      if (data.success && responseUser) {
        const accessToken = data.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }

        const userData = {
          ID: responseUser.ID,
          firstName: responseUser.firstName,
          lastName: responseUser.lastName,
          email: responseUser.email,
          phone: responseUser.phone,
          accountType: responseUser.accountType || 'manual',
          preferred_currency: responseUser.preferred_currency || 'USD',
          profileComplete: responseUser.profileComplete,
          profilePicture: responseUser.profilePicture,
          authProvider: responseUser.authProvider
        };
        
        setUser(userData);
        
        alert(`Welcome back ${responseUser.firstName || 'there'}!`);
        onClose();
      } else {
        setFormError(data.message || data.error || 'Sign in failed.');
      }
    } catch {
      setFormError('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIGNUP API CALL
  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    setFormError('');

    if (loginMethod === 'email' && !formData.email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!formData.password) {
      setFormError('Please create a password.');
      return;
    }

    if (formData.password.length < 12) {
      setFormError('Password must be at least 12 characters long.');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const signupData = {
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    try {
      clearClientStorage();
      queryClient.clear();
      setUser(null);

      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
        credentials: 'include'
      });

      const data = await response.json();

      const responseUser = data.data?.user || data.user;
      if (data.success && responseUser) {
        const accessToken = data.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken);
        }

        setUser(responseUser);
        onClose();
      } else if (data.success) {
        alert(data.message || 'Verification link sent to your email');
        setActiveTab('login');
      } else {
        setFormError(data.message || data.error || 'Signup failed.');
      }
    } catch {
      setFormError('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FORGOT PASSWORD API CALL
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.forgotEmail.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.forgotEmail }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        updateForgotOtp('');
        setForgotStep('otp');
        startResendCooldown(data.data?.resendAfterSeconds);
        if (data.code === 'RESET_OTP_COOLDOWN') {
          setFormError(data.message || 'Please wait before requesting another OTP.');
        }
      } else {
        setFormError(data.message || 'Could not send reset OTP.');
      }
    } catch {
      setFormError('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.forgotEmail.trim()) {
      setForgotStep('email');
      setFormError('Please enter your email address.');
      return;
    }

    if (!/^\d{6}$/.test(formData.forgotOtp)) {
      setFormError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.forgotEmail,
          otp: formData.forgotOtp,
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setForgotStep('password');
      } else {
        setFormError(data.message || 'Invalid or expired reset OTP.');
      }
    } catch {
      setFormError('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.resetPassword.length < 12) {
      setFormError('Password must be at least 12 characters long.');
      return;
    }

    if (formData.resetPassword !== formData.resetConfirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.forgotEmail,
          otp: formData.forgotOtp,
          newPassword: formData.resetPassword,
          confirmPassword: formData.resetConfirmPassword,
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || 'Password reset successful. Please login again.');
        clearForgotResetFields();
        setActiveTab('login');
      } else {
        setFormError(data.message || 'Password reset failed.');
      }
    } catch {
      setFormError('Network error. Check if server is running.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    const shouldLogout = await confirm('Are you sure you want to logout?', {
      title: 'Logout',
      confirmText: 'Logout',
    });

    if (shouldLogout) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch {
        // Local cleanup still runs if the network request fails.
      } finally {
        clearClientStorage();
        queryClient.clear();
        setUser(null);
        setActiveTab('login');
        window.dispatchEvent(new Event('auth:logout'));
        window.alert('Logged out successfully!');
      }
    }
  };

  // ✅ EDIT PROFILE
  const handleEditProfile = () => {
    if (currentUser) {
      setEditData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: digitsOnly(currentUser.phone),
        currency: currentUser.preferred_currency || 'USD'
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateProfile = async () => {
    const updatedData = {
      firstName: editData.firstName,
      lastName: editData.lastName,
      email: editData.email,
      phone: toPhoneCredential(editData.phone),
      preferred_currency: editData.currency
    };

    try {
      const response = await fetch(`${API_URL}/api/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        
        alert('Profile updated successfully!');
        setIsEditModalOpen(false);
      } else {
        alert('Error: ' + data.error);
      }
    } catch {
      alert('Network error');
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };
  const confirmDeleteAccount = async (password) => {
    try {
      const response = await fetch(`${API_URL}/api/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert('Account deleted successfully!');
        clearClientStorage();
        queryClient.clear();
        setUser(null);
        setActiveTab('login');
        setIsDeleteModalOpen(false);
        window.dispatchEvent(new Event('auth:logout'));
      } else {
        alert('Error: ' + data.error);
      }
    } catch {
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
    <div className="auth-modal-backdrop user-login-modal" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="auth-modal-header">
          <div className="header-left">
            <div className="logo">
              <Logo />
            </div>
          </div>
          
          <div className="header-right">
            {currentUser && (
              <a href="../index.html" className="dashboard-btn">
                <LegacyIcon className="fas fa-tachometer-alt" />
                <span>Dashboard</span>
              </a>
            )}
            
            {currentUser && (
              <div className="user-profile-section">
                <button className="settings-gear" onClick={handleEditProfile}>
                  <LegacyIcon className="fas fa-user-circle" />
                </button>
              </div>
            )}
            
            <button className="auth-close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="auth-modal-body">
          <div className={`login-wrapper ${activeTab === 'signup' ? 'signup-active' : ''}`}>

            {/* RIGHT SIDE - FORMS */}
            <div className="auth-form-section">
              <div className="auth-form-container">
                {!currentUser && (
                  <div className="auth-brand-block">
                    <div className="auth-brand-mark" aria-hidden="true">
                      <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="" />
                    </div>
                    <span>Entrack</span>
                  </div>
                )}
                
                {/* LOGIN FORM */}
                {!currentUser && activeTab === 'login' && (
                  <form id="loginForm" onSubmit={handleLoginSubmit} autoComplete="off" noValidate>
                    <div className="form-header">
                      <h2>Welcome Back</h2>
                      <p>Sign in to your trading account</p>
                    </div>

                    {formError && <div className="auth-form-error">{formError}</div>}
                    
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
                        onClick={handlePhoneLoginUnavailable}
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
                          autoComplete="off"
                          required
                        />
                      </div>
                    )}
                    
                    {loginMethod === 'phone' && (
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="form-input"
                          placeholder="919876543210"
                          autoComplete="off"
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
                          autoComplete="new-password"
                          required
                        />
                        <button 
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <LegacyIcon className={`fas fa-eye${showPassword ? '-slash' : ''}`} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="forgot-link">
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot');
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <div className="auth-divider"><span>or</span></div>

                    <button type="button" className="google-auth-btn" onClick={handleGoogleAuth}>
                      <span className="google-auth-mark" aria-hidden="true"><GoogleIcon /></span>
                      Continue with Google
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
                  <form id="signupForm" onSubmit={handleSignupSubmit} autoComplete="off" noValidate>
                    <div className="form-header">
                      <h2>Create Account</h2>
                      <p>Start with the essentials. We will ask for profile details next.</p>
                    </div>

                    {formError && <div className="auth-form-error">{formError}</div>}

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your email"
                        autoComplete="off"
                        required
                      />
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
                          minLength={12}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <LegacyIcon className={`fas fa-eye${showPassword ? '-slash' : ''}`} />
                        </button>
                      </div>
                    </div>

                        {formData.password && (
                          <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="form-input"
                              placeholder="Confirm your password"
                              minLength={12}
                              autoComplete="new-password"
                              required
                            />
                          </div>
                        )}

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                          {loading ? 'Creating Account...' : 'Create Account'}
                        </button>

                    <div className="auth-divider"><span>or</span></div>

                    <button type="button" className="google-auth-btn" onClick={handleGoogleAuth}>
                      <span className="google-auth-mark" aria-hidden="true"><GoogleIcon /></span>
                      Continue with Google
                    </button>
                    
                    <div className="switch-text">
                      Already have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => {
                          clearForgotResetFields();
                          setActiveTab('login');
                        }}
                      >
                        Sign in
                      </button>
                    </div>
                  </form>
                )}

                {/* FORGOT PASSWORD FORM */}
                {!currentUser && activeTab === 'forgot' && forgotStep === 'email' && (
                  <form id="forgotPasswordForm" onSubmit={handleForgotSubmit} autoComplete="off" noValidate>
                    <div className="form-header">
                      <h2>Reset Password</h2>
                      <p>Enter your email to receive a password reset OTP</p>
                    </div>

                    {formError && <div className="auth-form-error">{formError}</div>}
                    
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="forgotEmail"
                        value={formData.forgotEmail}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Enter your email"
                        autoComplete="off"
                        required
                      />
                    </div>
                    
                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Reset OTP'}
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

                {!currentUser && activeTab === 'forgot' && forgotStep === 'otp' && (
                  <form id="verifyResetOtpForm" onSubmit={handleVerifyResetOtp} autoComplete="off" noValidate>
                    <div className="form-header">
                      <h2>Verify OTP</h2>
                      <p>Enter the 6-digit OTP sent to your email</p>
                    </div>

                    {formError && <div className="auth-form-error">{formError}</div>}

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="forgotEmail"
                        value={formData.forgotEmail}
                        onChange={handleInputChange}
                        className="form-input"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>OTP</label>
                      <div className="otp-digit-row" onPaste={handleOtpPaste}>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <input
                            key={index}
                            ref={(element) => {
                              otpInputRefs.current[index] = element;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={formData.forgotOtp[index] || ''}
                            onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                            onKeyDown={(event) => handleOtpKeyDown(index, event)}
                            className="otp-digit-input"
                            aria-label={`OTP digit ${index + 1}`}
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          />
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>

                    <div className="switch-text">
                      {resendCooldown > 0 ? (
                        <span>Resend OTP in {resendCooldown}s</span>
                      ) : (
                        <>
                          Didn't get it?{' '}
                          <button type="button" onClick={handleForgotSubmit} disabled={loading}>
                            Resend OTP
                          </button>
                        </>
                      )}
                    </div>

                    <div className="switch-text">
                      Wrong email?{' '}
                      <button type="button" onClick={clearForgotResetFields}>
                        Change email
                      </button>
                    </div>
                  </form>
                )}

                {!currentUser && activeTab === 'forgot' && forgotStep === 'password' && (
                  <form id="resetPasswordForm" onSubmit={handleResetPasswordSubmit} autoComplete="off" noValidate>
                    <div className="form-header">
                      <h2>Create New Password</h2>
                      <p>Your OTP is verified. Choose a new password.</p>
                    </div>

                    {formError && <div className="auth-form-error">{formError}</div>}

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        name="resetPassword"
                        value={formData.resetPassword}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Create a new password"
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        name="resetConfirmPassword"
                        value={formData.resetConfirmPassword}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Confirm new password"
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                      {loading ? 'Saving...' : 'Reset Password'}
                    </button>
                  </form>
                )}

                {/* LOGGED IN SECTION */}
                {currentUser && (
                  <div id="logoutSection" className="logout-section">
                    <h2>Welcome to Entrack</h2>
                    
                    <div className="user-info">
                      <p style={{ fontWeight: 600, marginBottom: '10px' }}>
                        {currentUser.firstName} {currentUser.lastName} ({currentUser.email})
                      </p>
                      <div className="account-type-badge">
                        {currentUser.accountType === 'api' ? 'Sync' : (currentUser.accountType || 'manual')} Account
                      </div>
                    </div>

                    <div className="account-switcher">
                      <h3>Switch Account Type</h3>
                      <div className="account-buttons">
                        <button className={`account-btn ${currentUser.accountType === 'manual' ? 'active' : ''}`}>
                          <LegacyIcon className="fas fa-hand-paper" />
                          Manual
                        </button>
                        <button className={`account-btn ${currentUser.accountType === 'api' ? 'active' : ''}`}>
                          <LegacyIcon className="fas fa-code" />
                          Sync
                        </button>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button className="action-btn primary" onClick={() => window.location.href = '../index.html'}>
                        <LegacyIcon className="fas fa-tachometer-alt" />
                        Go to Dashboard
                      </button>
                      <button className="action-btn secondary" onClick={handleEditProfile}>
                        <LegacyIcon className="fas fa-user-edit" />
                        Edit Profile
                      </button>
                      <button className="action-btn danger" onClick={handleDeleteAccount}>
                        <LegacyIcon className="fas fa-trash-alt" />
                        Delete Account
                      </button>
                      <button className="action-btn danger" onClick={handleLogout}>
                        <LegacyIcon className="fas fa-sign-out-alt" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!currentUser && (
              <aside className="auth-showcase" aria-label="Entrack product preview">
                <div className="auth-showcase__mark" aria-hidden="true">E</div>
                <div className="auth-showcase__content">
                  <span className="auth-showcase__eyebrow">Entrack</span>
                  <h2>Welcome to Entrack</h2>
                  <p>
                    Review trades, replay decisions, and turn your trading history into a
                    cleaner weekly improvement loop.
                  </p>
                  <p className="auth-showcase__small">
                    Join the workspace built for serious traders who want evidence, not guesswork.
                  </p>
                </div>
                <div className="auth-showcase-card">
                  <h3>Find your edge and protect it.</h3>
                  <p>
                    Keep journal notes, broker activity, analytics, and replay practice together.
                  </p>
                  <div className="auth-avatar-stack" aria-hidden="true">
                    <span>FX</span>
                    <span>CR</span>
                    <span>IN</span>
                    <strong>+2</strong>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="auth-modal-footer">
          <p>
            © 2024 Entrack. All rights reserved. | 
            <a href="/privacy"> Privacy Policy</a> | 
            <a href="/terms"> Terms of Service</a>
          </p>
        </div>

        {/* EDIT PROFILE MODAL */}
        {isEditModalOpen && (
          <div className="edit-modal">
            <div className="edit-content">
              <div className="edit-header">
                <h3><LegacyIcon className="fas fa-user-edit" /> Edit Profile</h3>
                <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>
                  <LegacyIcon className="fas fa-times" />
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
                    onChange={(e) => setEditData({...editData, phone: digitsOnly(e.target.value)})}
                    className="form-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Preferred Currency</label>
                  <CustomSelect
                    value={editData.currency}
                    onChange={(e) => setEditData({...editData, currency: e.target.value})}
                    className="currency-select"
                    options={currencies}
                  />
                </div>
                
                <div className="auth-profile-modal-actions">
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
                <LegacyIcon className="fas fa-exclamation-triangle" />
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
                    autoComplete="new-password"
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

