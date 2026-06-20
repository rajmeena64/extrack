import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Logo from '../Common/Logo';
import { API_URL } from '../../utils/constants';
import './AuthPages.css';

function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          newPassword: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      const data = await response.json();
      setStatus({
        type: data.success ? 'success' : 'error',
        message: data.message || (data.success ? 'Password reset successful.' : 'Password reset failed.'),
      });
    } catch {
      setStatus({ type: 'error', message: 'Could not reset password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-route">
      <section className="auth-panel">
        <Logo />
        <h1>Reset password</h1>
        <p>Choose a new password for your Entrack account.</p>

        {!token ? (
          <p className="auth-status auth-status--error">Reset link is missing a token.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        )}

        {status && (
          <p className={`auth-status auth-status--${status.type}`}>
            {status.message}
          </p>
        )}
        <Link to="/">Back to sign in</Link>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
