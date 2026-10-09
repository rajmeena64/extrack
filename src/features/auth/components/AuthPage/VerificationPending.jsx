import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { API_URL } from '@/utils/common/constants';

const submitBtnCls = "auth-submit-btn mt-3.5 min-h-[50px] w-full max-w-full rounded-xl border-0 bg-[var(--button-bg)] hover:enabled:bg-[var(--button-bg-hover)] p-3 text-[14px] font-[850] text-[var(--button-text)] shadow-[0_4px_24px_rgba(24,73,169,0.35)] cursor-pointer transition duration-200 ease-in-out hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

function VerificationPending({ email, onSwitchTab }) {
  const [resending, setResending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'A fresh verification link has been sent to your email.' });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Could not resend verification email.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Connection failed. Please try again.' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="auth-form-header mb-6 min-w-0">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="auth-form-title text-[clamp(26px,2.8vw,32px)] font-[850] leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)]">Check Your Email</h1>
        <p className="auth-form-subtitle mt-2 text-[14px] leading-[1.5] text-[var(--text-secondary)]">
          We sent a verification link to <span className="font-bold text-[var(--text-primary)]">{email || 'your email'}</span>.
        </p>
      </div>
      {statusMsg.text && (
        <div className={`mb-4 rounded-xl px-3.5 py-3 text-[13px] font-extrabold leading-[1.45] shadow-sm ${statusMsg.type === 'success' ? 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]' : 'bg-[#fff1f2] text-[#9f1239] border border-red-700/16'}`}>
          {statusMsg.text}
        </div>
      )}
      <p className="mb-5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
        Click the link in the email to set your password and complete your registration. If you do not see the email, check your spam or junk folder.
      </p>
      <button type="button" className={submitBtnCls} onClick={handleResend} disabled={resending}>
        {resending ? 'Sending...' : 'Resend Verification Email'}
      </button>
      <div className="mt-4 flex items-center justify-between text-[13px] leading-[1.4] text-[var(--text-secondary)]">
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-[850] text-[var(--primary)] hover:underline" onClick={() => onSwitchTab('signup')}>
          Change email
        </button>
        <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-[850] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline" onClick={() => onSwitchTab('login')}>
          Sign in
        </button>
      </div>
    </div>
  );
}

export default VerificationPending;
