import React, { useState } from 'react';
import GoogleIcon from '@/icons/GoogleIcon';
import { API_URL } from "@/utils/common/constants";
import { clearClientStorage } from '@/utils/storage/clientStorage';

const inputCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-[13px] text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const labelCls = "mb-2 block text-[12px] font-[850] uppercase leading-[1.2] tracking-[0.12em] text-[var(--text-primary)]";
const submitBtnCls = "auth-submit-btn mt-3.5 min-h-[50px] w-full max-w-full rounded-xl border-0 bg-[var(--button-bg)] hover:enabled:bg-[var(--button-bg-hover)] p-3 text-[14px] font-[850] text-[var(--button-text)] shadow-[0_4px_24px_rgba(24,73,169,0.35)] cursor-pointer transition duration-200 ease-in-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
const getFetchUserError = (_response, data, fallbackMessage) => data?.error || data?.message || fallbackMessage;

function Signup({ onSwitchTab }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const handleGoogleAuth = () => {
    if (!API_URL) return;
    clearClientStorage();
    sessionStorage.setItem('entrack:oauthPending', 'true');
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      clearClientStorage();
      const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        onSwitchTab('verification', { email: cleanEmail });
      } else if (data.code === 'USER_EXISTS') {
        setFormError('An account with this email already exists. Please sign in.');
      } else {
        setFormError(getFetchUserError(response, data, 'Signup failed.'));
      }
    } catch {
      setFormError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form id="signupForm" onSubmit={handleSignupSubmit} autoComplete="off" noValidate className="min-w-0">
      <div className="auth-form-header mb-6 min-w-0">
        <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Create Account</h1>
        <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">Enter your email to get started. We will verify your email first.</p>
      </div>
      {formError && (
        <div className="auth-form-error relative z-3 mb-[18px] rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] text-[#9f1239] shadow-[0_12px_30px_rgba(159,18,57,0.10)]">{formError}</div>
      )}
      <div className="form-group mb-[18px] min-w-0">
        <label className={labelCls}>Email Address</label>
        <input type="email" name="email" value={email} onChange={(e) => { setEmail(e.target.value); if (formError) setFormError(''); }} className={inputCls} placeholder="Enter your email" autoComplete="off" required />
      </div>
      <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Sending Verification...' : 'Continue with Email'}</button>
      <div className="auth-divider mt-[18px] flex min-w-0 items-center gap-3 text-[12px] font-extrabold uppercase text-[var(--text-muted)] before:h-px before:flex-1 before:bg-[var(--border-light)] before:content-[''] after:h-px after:flex-1 after:bg-[var(--border-light)] after:content-['']"><span>or</span></div>
      <button type="button" className="google-auth-btn mt-3.5 inline-flex min-h-[48px] w-full max-w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 text-[14px] font-[850] text-[var(--text-primary)] shadow-sm cursor-pointer transition duration-200 ease-in-out hover:-translate-y-px hover:border-[var(--border-medium)] hover:bg-[var(--bg-hover)]" onClick={handleGoogleAuth}>
        <span className="google-auth-mark inline-grid h-[22px] w-[22px] flex-[0_0_22px] place-items-center [&_.google-auth-icon]:block [&_.google-auth-icon]:h-[18px] [&_.google-auth-icon]:w-[18px]" aria-hidden="true"><GoogleIcon /></span>
        Continue with Google
      </button>
      <div className="switch-text mt-4 min-w-0 text-left text-[13px] leading-[1.4] text-[var(--text-secondary)]">
        Already have an account?{' '}
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={() => onSwitchTab('login')}>Sign in</button>
      </div>
    </form>
  );
}

export default Signup;
