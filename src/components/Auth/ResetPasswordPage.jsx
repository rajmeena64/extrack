import React from 'react';
import { Link } from 'react-router-dom';

import Logo from '../Common/Logo';
import './AuthPages.css';

function ResetPasswordPage() {
  return (
    <main className="auth-route">
      <section className="auth-panel">
        <Logo />
        <h1>Reset password</h1>
        <p>Request an OTP from the sign in screen. After OTP verification, the new password fields will appear there.</p>
        <Link to="/">Back to sign in</Link>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
