import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Common/Logo/Logo';

function ResetPasswordPage() {
  return (
    <main className="auth-route min-h-screen p-6 sm:p-8 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="auth-panel w-[min(440px,100%)] m-0 p-7 border border-[var(--border-light)] rounded-lg bg-[var(--bg-card)] shadow-[var(--shadow-md)]">
        <Logo />
        <h1 className="mt-[18px] mb-2 text-[26px] font-bold text-[var(--heading)]">Reset password</h1>
        <p className="mb-[18px] text-[var(--text-secondary)] leading-[1.5]">Request an OTP from the sign in screen. After OTP verification, the new password fields will appear there.</p>
        <Link to="/" className="min-h-[42px] inline-flex items-center justify-center rounded-lg font-extrabold text-[var(--primary)] no-underline">Back to sign in</Link>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
