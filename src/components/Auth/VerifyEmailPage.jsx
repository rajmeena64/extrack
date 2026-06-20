import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import Logo from '../Common/Logo';
import { API_URL } from '../../utils/constants';
import './AuthPages.css';

function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [state, setState] = useState({
    loading: true,
    status: 'info',
    message: 'Verifying your email...',
  });

  useEffect(() => {
    let isCurrent = true;

    const verify = async () => {
      if (!token) {
        setState({ loading: false, status: 'error', message: 'Verification link is missing a token.' });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (!isCurrent) return;
        setState({
          loading: false,
          status: data.success ? 'success' : 'error',
          message: data.message || (data.success ? 'Email verified.' : 'Verification failed.'),
        });
      } catch {
        if (isCurrent) {
          setState({ loading: false, status: 'error', message: 'Could not verify email. Please try again.' });
        }
      }
    };

    verify();
    return () => {
      isCurrent = false;
    };
  }, [token]);

  return (
    <main className="auth-route">
      <section className="auth-panel">
        <Logo />
        <h1>Email verification</h1>
        <p className={`auth-status auth-status--${state.status}`}>{state.message}</p>
        {!state.loading && <Link to="/">Back to sign in</Link>}
      </section>
    </main>
  );
}

export default VerifyEmailPage;
