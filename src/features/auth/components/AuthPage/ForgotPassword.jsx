import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from "@/utils/common/constants";

const FORGOT_RESET_STORAGE_KEY = 'entrack:forgotReset';
const DEFAULT_RESET_RESEND_SECONDS = 60;
const inputCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-[13px] text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const labelCls = "mb-2 block text-[12px] font-[850] uppercase leading-[1.2] tracking-[0.12em] text-[var(--text-primary)]";
const submitBtnCls = "auth-submit-btn mt-3.5 min-h-[50px] w-full max-w-full rounded-xl border-0 bg-[var(--button-bg)] hover:enabled:bg-[var(--button-bg-hover)] p-3 text-[14px] font-[850] text-[var(--button-text)] shadow-[0_4px_24px_rgba(24,73,169,0.35)] cursor-pointer transition duration-200 ease-in-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
const getFetchUserError = (_response, data, fallbackMessage) => data?.error ?? data?.message ?? fallbackMessage;

function ForgotPassword({ onSwitchTab }) {
  const navigate = useNavigate();
  const [forgotStep, setForgotStep] = useState('email');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  const otpInputRefs = useRef([]);
  const [formData, setFormData] = useState({ forgotEmail: '', forgotOtp: '', resetPassword: '', resetConfirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORGOT_RESET_STORAGE_KEY) || '{}');
      if (!saved.email || !['otp', 'password'].includes(saved.step)) return;
      setForgotStep(saved.step);
      setResendCooldownUntil(Number(saved.resendCooldownUntil || 0));
      setFormData(prev => ({ ...prev, forgotEmail: saved.email }));
    } catch {
      sessionStorage.removeItem(FORGOT_RESET_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (forgotStep !== 'otp' || !resendCooldownUntil) return undefined;
    const updateCooldown = () => setResendCooldown(Math.max(0, Math.ceil((resendCooldownUntil - Date.now()) / 1000)));
    updateCooldown();
    const timerId = window.setInterval(updateCooldown, 1000);
    return () => window.clearInterval(timerId);
  }, [forgotStep, resendCooldownUntil]);

  useEffect(() => {
    if (forgotStep === 'otp') otpInputRefs.current[0]?.focus();
  }, [forgotStep]);

  useEffect(() => {
    if (forgotStep === 'email' || !formData.forgotEmail.trim()) return;
    sessionStorage.setItem(FORGOT_RESET_STORAGE_KEY, JSON.stringify({
      email: formData.forgotEmail.trim(), step: forgotStep, resendCooldownUntil
    }));
  }, [forgotStep, formData.forgotEmail, resendCooldownUntil]);

  const clearForgotResetFields = () => {
    setForgotStep('email');
    setResendCooldown(0);
    setResendCooldownUntil(0);
    sessionStorage.removeItem(FORGOT_RESET_STORAGE_KEY);
    setFormData(prev => ({ ...prev, forgotOtp: '', resetPassword: '', resetConfirmPassword: '' }));
  };

  const startResendCooldown = (seconds) => {
    const nextSeconds = Math.max(0, Number(seconds) || DEFAULT_RESET_RESEND_SECONDS);
    setResendCooldown(nextSeconds);
    setResendCooldownUntil(Date.now() + nextSeconds * 1000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'forgotOtp' ? String(value ?? '').replace(/\D/g, '').slice(0, 6) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    if (formError) setFormError('');
  };

  const updateForgotOtp = (nextOtp) => {
    setFormData(prev => ({ ...prev, forgotOtp: String(nextOtp ?? '').replace(/\D/g, '').slice(0, 6) }));
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = String(value ?? '').replace(/\D/g, '').slice(-1);
    const digits = formData.forgotOtp.padEnd(6, ' ').split('');
    digits[index] = digit || ' ';
    updateForgotOtp(digits.join('').replace(/\s/g, ''));
    if (digit && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key !== 'Backspace') return;
    if (formData.forgotOtp[index]) {
      const digits = formData.forgotOtp.padEnd(6, ' ').split('');
      digits[index] = ' ';
      updateForgotOtp(digits.join('').replace(/\s/g, ''));
      return;
    }
    if (index > 0) otpInputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    updateForgotOtp(pastedOtp);
    otpInputRefs.current[Math.min(pastedOtp.length, 5)]?.focus();
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.forgotEmail.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
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
        if (data.code === 'RESET_OTP_COOLDOWN') setFormError('Please wait before requesting another OTP.');
      } else {
        setFormError('Could not send reset OTP. Please try again.');
      }
    } catch {
      setFormError('Could not connect. Please try again.');
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
      const response = await fetch(`${API_URL}/api/v1/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.forgotEmail, otp: formData.forgotOtp }),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setForgotStep('password');
      } else {
        setFormError(getFetchUserError(response, data, 'Invalid or expired reset OTP.'));
      }
    } catch {
      setFormError('Could not connect. Please try again.');
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
      const payload = {
        email: formData.forgotEmail,
        otp: formData.forgotOtp,
        newPassword: formData.resetPassword,
        confirmPassword: formData.resetConfirmPassword
      };
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        alert('Password reset successful. Please sign in again.');
        clearForgotResetFields();
        onSwitchTab('login');
      } else {
        setFormError(getFetchUserError(response, data, 'Password reset failed. Please try again.'));
      }
    } catch {
      setFormError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0">
      {forgotStep === 'email' && (
        <form id="forgotPasswordForm" onSubmit={handleForgotSubmit} autoComplete="off" noValidate className="min-w-0">
          <div className="auth-form-header mb-6 min-w-0">
            <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Reset Password</h1>
            <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">Enter your email to receive a password reset OTP</p>
          </div>
          {formError && (
            <div className="auth-form-error relative z-3 mb-[18px] rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] text-[#9f1239] shadow-[0_12px_30px_rgba(159,18,57,0.10)]">{formError}</div>
          )}
          <div className="form-group mb-[18px] min-w-0">
            <label className={labelCls}>Email Address</label>
            <input type="email" name="forgotEmail" value={formData.forgotEmail} onChange={handleInputChange} className={inputCls} placeholder="Enter your email" autoComplete="off" required />
          </div>
          <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Sending...' : 'Send Reset OTP'}</button>
          <div className="switch-text mt-4 min-w-0 text-left text-[13px] leading-[1.4] text-[var(--text-secondary)]">
            Remember your password?{' '}
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={() => onSwitchTab('login')}>Sign in</button>
          </div>
        </form>
      )}

      {forgotStep === 'otp' && (
        <form id="verifyResetOtpForm" onSubmit={handleVerifyResetOtp} autoComplete="off" noValidate className="min-w-0">
          <div className="auth-form-header mb-6 min-w-0">
            <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Verify OTP</h1>
            <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">Enter the 6-digit OTP sent to your email</p>
          </div>
          {formError && (
            <div className="auth-form-error relative z-3 mb-[18px] rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] text-[#9f1239] shadow-[0_12px_30px_rgba(159,18,57,0.10)]">{formError}</div>
          )}
          <div className="form-group mb-[18px] min-w-0">
            <label className={labelCls}>Email Address</label>
            <input type="email" name="forgotEmail" value={formData.forgotEmail} onChange={handleInputChange} className={inputCls} autoComplete="off" required />
          </div>
          <div className="form-group mb-[18px] min-w-0">
            <label className={labelCls}>OTP</label>
            <div className="otp-digit-row grid w-full grid-cols-6 gap-2" onPaste={handleOtpPaste}>
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(element) => { otpInputRefs.current[index] = element; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={formData.forgotOtp[index] ?? ''}
                  onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  className="otp-digit-input aspect-square min-h-[44px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] text-center text-[20px] font-[850] text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]"
                  aria-label={`OTP digit ${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                />
              ))}
            </div>
          </div>
          <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Verifying...' : 'Verify OTP'}</button>
          <div className="switch-text mt-4 min-w-0 text-left text-[13px] leading-[1.4] text-[var(--text-secondary)]">
            {resendCooldown > 0 ? (
              <span>Resend OTP in {resendCooldown}s</span>
            ) : (
              <>Didn't get it? <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={handleForgotSubmit} disabled={loading}>Resend OTP</button></>
            )}
          </div>
          <div className="switch-text mt-4 min-w-0 text-left text-[13px] leading-[1.4] text-[var(--text-secondary)]">
            Wrong email? <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-[850] text-[var(--primary)] hover:underline" onClick={clearForgotResetFields}>Change email</button>
          </div>
        </form>
      )}

      {forgotStep === 'password' && (
        <form id="resetPasswordForm" onSubmit={handleResetPasswordSubmit} autoComplete="off" noValidate className="min-w-0">
          <div className="auth-form-header mb-6 min-w-0">
            <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Create New Password</h1>
            <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">Your OTP is verified. Choose a new password.</p>
          </div>
          {formError && (
            <div className="auth-form-error relative z-3 mb-[18px] rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] text-[#9f1239] shadow-[0_12px_30px_rgba(159,18,57,0.10)]">{formError}</div>
          )}
          <div className="form-group mb-[18px] min-w-0">
            <label className={labelCls}>New Password</label>
            <input type="password" name="resetPassword" value={formData.resetPassword} onChange={handleInputChange} className={inputCls} placeholder="Create a new password" minLength={12} maxLength={128} autoComplete="new-password" required />
          </div>
          <div className="form-group mb-[18px] min-w-0">
            <label className={labelCls}>Confirm Password</label>
            <input type="password" name="resetConfirmPassword" value={formData.resetConfirmPassword} onChange={handleInputChange} className={inputCls} placeholder="Confirm new password" minLength={12} maxLength={128} autoComplete="new-password" required />
          </div>
          <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Saving...' : 'Reset Password'}</button>
        </form>
      )}
    </div>
  );
}

export default ForgotPassword;
