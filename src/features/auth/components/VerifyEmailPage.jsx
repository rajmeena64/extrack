import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Logo from '@/components/Common/Logo/Logo';
import { API_URL } from '@/utils/common/constants';
import { useAuth } from '@/context/AuthContext';
import { clearClientStorage } from '@/utils/storage/clientStorage';

const inputCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-[13px] text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const inputPwCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] py-[13px] pl-3.5 pr-11 text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const labelCls = "mb-2 block text-[12px] font-[850] uppercase leading-[1.2] tracking-[0.12em] text-[var(--text-primary)]";
const submitBtnCls = "auth-submit-btn mt-3.5 min-h-[50px] w-full max-w-full rounded-xl border-0 bg-[var(--button-bg)] hover:enabled:bg-[var(--button-bg-hover)] p-3 text-[14px] font-[850] text-[var(--button-text)] shadow-[0_4px_24px_rgba(24,73,169,0.35)] cursor-pointer transition duration-200 ease-in-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [step, setStep] = useState('verifying');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isCurrent = true;
    if (!token) {
      setStep('error');
      setErrorMsg('Verification link is missing a token.');
      return;
    }
    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: 'include' });
        const data = await res.json();
        if (!isCurrent) return;
        if (data.code === 'PASSWORD_REQUIRED') {
          setEmail(data?.email ?? data?.data?.email ?? '');
          setStep('setup');
        } else if (data.success) {
          if (data.data?.user) {
            setUser(data.data.user);
            navigate('/dashboard', { replace: true });
          } else {
            setStep('done');
          }
        } else {
          setStep('error');
          setErrorMsg(data.message || 'Verification link is invalid or expired.');
        }
      } catch {
        if (isCurrent) {
          setStep('error');
          setErrorMsg('Could not verify token. Please try again.');
        }
      }
    };
    verifyToken();
    return () => { isCurrent = false; };
  }, [token, navigate, setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.password || formData.password.length < 12) {
      setErrorMsg('Password must be at least 12 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      clearClientStorage();
      const res = await fetch(`${API_URL}/api/v1/auth/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password, confirmPassword: formData.confirmPassword }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMsg(data.message || 'Registration failed.');
      }
    } catch {
      setErrorMsg('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-route flex min-h-screen items-center justify-center p-6 sm:p-8 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="auth-panel w-[min(420px,100%)] p-7 border border-[var(--border-light)] rounded-2xl bg-[var(--bg-card)] shadow-lg">
        <Logo />
        {step === 'verifying' && (
          <div className="mt-6 text-center">
            <p className="text-[15px] font-semibold text-[var(--text-secondary)]">Verifying your email link...</p>
          </div>
        )}
        {step === 'error' && (
          <div className="mt-6">
            <h1 className="text-[22px] font-extrabold text-[var(--heading)]">Verification Failed</h1>
            <p className="mt-2 rounded-xl bg-[#fff1f2] border border-red-700/16 p-3 text-[13px] font-extrabold text-[#9f1239]">{errorMsg}</p>
            <Link to="/signup" className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--button-bg)] font-extrabold text-[var(--button-text)] no-underline hover:bg-[var(--button-bg-hover)]">
              Back to Sign Up
            </Link>
          </div>
        )}
        {step === 'done' && (
          <div className="mt-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#ecfdf5] text-[#047857]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-[22px] font-extrabold text-[var(--heading)]">Email Verified</h1>
            <p className="mt-2 text-[14px] text-[var(--text-secondary)]">Your account is ready.</p>
            <Link to="/login" className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[var(--button-bg)] font-extrabold text-[var(--button-text)] no-underline hover:bg-[var(--button-bg-hover)]">
              Sign In
            </Link>
          </div>
        )}
        {step === 'setup' && (
          <form onSubmit={handleSubmit} autoComplete="off" className="mt-6">
            <h1 className="text-[22px] font-extrabold text-[var(--heading)]">Complete Your Account</h1>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Email verified: <span className="font-bold text-[var(--text-primary)]">{email}</span>
            </p>
            {errorMsg && (
              <div className="mt-3 rounded-xl border border-red-700/16 bg-[#fff1f2] px-3.5 py-2.5 text-[13px] font-extrabold text-[#9f1239]">{errorMsg}</div>
            )}
            <div className="mt-4">
              <label className={labelCls}>Choose Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className={inputPwCls} placeholder="At least 12 characters" minLength={12} required />
                <button type="button" className="absolute right-[13px] top-1/2 -translate-y-1/2 border-0 bg-transparent p-0 text-[var(--text-muted)] cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="mt-3.5">
              <label className={labelCls}>Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} className={inputCls} placeholder="Confirm your password" minLength={12} required />
            </div>
            <button type="submit" className={submitBtnCls} disabled={loading}>{loading ? 'Completing Setup...' : 'Complete & Launch'}</button>
          </form>
        )}
      </section>
    </main>
  );
}

export default VerifyEmailPage;
