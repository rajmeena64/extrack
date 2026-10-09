import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import GoogleIcon from '@/icons/GoogleIcon';
import { API_URL } from "@/utils/common/constants";
import { useAuth } from '@/context/AuthContext';
import { clearClientStorage } from '@/utils/storage/clientStorage';

const inputCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-[13px] text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const inputPwCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] py-[13px] pl-3.5 pr-11 text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const labelCls = "mb-2 block text-[12px] font-[850] uppercase leading-[1.2] tracking-[0.12em] text-[var(--text-primary)]";
const submitBtnCls = "auth-submit-btn mt-3.5 min-h-[50px] w-full max-w-full rounded-xl border-0 bg-[var(--button-bg)] hover:enabled:bg-[var(--button-bg-hover)] p-3 text-[14px] font-[850] text-[var(--button-text)] shadow-[0_4px_24px_rgba(24,73,169,0.35)] cursor-pointer transition duration-200 ease-in-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
const getFetchUserError = (_response, data, fallbackMessage) => data?.error || data?.message || fallbackMessage;

function Login({ onSwitchTab }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const [loginMethod, setLoginMethod] = useState('email');
  const [formData, setFormData] = useState({ email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'phone' ? String(value || '').replace(/\D/g, '').slice(0, 15) : value }));
    if (formError) setFormError('');
  };

  const handleGoogleAuth = () => {
    if (!API_URL) return;
    clearClientStorage();
    queryClient.clear();
    setUser(null);
    sessionStorage.setItem('entrack:oauthPending', 'true');
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (loginMethod === 'phone') {
      setFormError('Phone login is currently unavailable.');
      return;
    }
    if (loginMethod === 'email' && !formData.email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setFormError('Please enter your password.');
      return;
    }
    setLoading(true);
    try {
      clearClientStorage();
      queryClient.clear();
      setUser(null);
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
        credentials: 'include'
      });
      const data = await response.json();
      const responseUser = data.data?.user ? data.data.user : data.user;
      if (data.success && responseUser) {
        setUser({
          ID: responseUser.ID,
          firstName: responseUser.firstName,
          lastName: responseUser.lastName,
          email: responseUser.email,
          phone: responseUser.phone,
          accountType: responseUser.accountType ? responseUser.accountType : 'manual',
          preferred_currency: responseUser.preferred_currency ? responseUser.preferred_currency : 'USD',
          profileComplete: responseUser.profileComplete,
          profilePicture: responseUser.profilePicture,
          authProvider: responseUser.authProvider
        });
        navigate('/dashboard');
      } else if (data.code === 'EMAIL_NOT_VERIFIED') {
        onSwitchTab('verification', { email: formData.email });
      } else {
        setFormError(getFetchUserError(response, data, 'Sign in failed.'));
      }
    } catch {
      setFormError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="loginForm" onSubmit={handleLoginSubmit} autoComplete="off" noValidate className="min-w-0">
      <div className="auth-form-header mb-6 min-w-0">
        <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Welcome Back</h1>
        <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">Sign in to your trading account</p>
      </div>
      {formError && (
        <div className="auth-form-error relative z-3 mb-[18px] rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] text-[#9f1239] shadow-[0_12px_30px_rgba(159,18,57,0.10)]">{formError}</div>
      )}
      <div className="login-options mb-4 flex min-w-0 gap-2.5 rounded-full bg-[var(--bg-secondary)] p-1 border border-[var(--border-light)] box-border">
        <button type="button" className={`login-option-btn min-h-10 min-w-0 flex-1 cursor-pointer rounded-full border-0 p-2.5 text-[13px] font-extrabold transition ${loginMethod === 'email' ? 'active bg-[var(--primary)] text-white shadow-[0_4px_14px_rgba(24,73,169,0.30)]' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} onClick={() => setLoginMethod('email')}>Email</button>
        <button type="button" className={`login-option-btn min-h-10 min-w-0 flex-1 cursor-pointer rounded-full border-0 p-2.5 text-[13px] font-extrabold transition ${loginMethod === 'phone' ? 'active bg-[var(--primary)] text-white shadow-[0_4px_14px_rgba(24,73,169,0.30)]' : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} onClick={() => { setLoginMethod('email'); setFormError('Phone login is currently unavailable.'); }}>Phone</button>
      </div>
      <div className="form-group mb-[18px] min-w-0">
        <label className={labelCls}>Email Address</label>
        <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={inputCls} placeholder="Enter your email" autoComplete="off" required />
      </div>
      <div className="form-group mb-[18px] min-w-0">
        <label className={labelCls}>Password</label>
        <div className="password-wrapper relative min-w-0">
          <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className={inputPwCls} placeholder="Enter your password" autoComplete="new-password" required />
          <button type="button" className="toggle-password absolute right-[13px] top-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-[var(--text-muted)] cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="forgot-link -mt-1.5 min-w-0 text-right">
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={() => onSwitchTab('forgot')}>Forgot Password?</button>
      </div>
      <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</button>
      <div className="auth-divider mt-[18px] flex min-w-0 items-center gap-3 text-[12px] font-extrabold uppercase text-[var(--text-muted)] before:h-px before:flex-1 before:bg-[var(--border-light)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--border-light)] after:content-['']"><span>or</span></div>
      <button type="button" className="google-auth-btn mt-3.5 inline-flex min-h-[48px] w-full max-w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 text-[14px] font-[850] text-[var(--text-primary)] shadow-sm cursor-pointer transition duration-200 ease-in-out hover:-translate-y-px hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]" onClick={handleGoogleAuth}>
        <span className="google-auth-mark inline-grid h-[22px] w-[22px] flex-[0_0_22px] place-items-center [&_.google-auth-icon]:block [&_.google-auth-icon]:h-[18px] [&_.google-auth-icon]:w-[18px]" aria-hidden="true"><GoogleIcon /></span>
        Continue with Google
      </button>
      <div className="switch-text mt-4 min-w-0 text-left text-[13px] leading-[1.4] text-[var(--text-secondary)]">
        Don't have an account?{' '}
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={() => onSwitchTab('signup')}>Sign up</button>
      </div>
    </form>
  );
}

export default Login;
