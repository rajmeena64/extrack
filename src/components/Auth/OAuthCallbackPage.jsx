import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import api from '../../utils/serve';
import './AuthPages.css';

const oauthErrorMessages = {
  account_conflict: 'This Google account is already linked to a different Entrack account.',
  cancelled: 'Google sign-in was cancelled.',
  email_missing: 'Google did not return an email address for this account.',
  email_not_verified: 'Your Google email address is not verified.',
  google_callback_failed: 'Google sign-in could not be completed. Please try again.',
  google_not_configured: 'Google sign-in is not configured yet.',
  invalid_callback: 'Google returned an invalid sign-in response.',
  invalid_profile: 'Google returned an incomplete profile.',
  oauth_migration_required: 'Google sign-in database migration has not been applied yet.',
};

function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [status, setStatus] = useState({ type: 'info', message: 'Signing you in...' });

  const code = searchParams.get('code');
  const oauthError = searchParams.get('oauth_error');
  const errorMessage = useMemo(() => (
    oauthErrorMessages[oauthError] || 'Google sign-in could not be completed.'
  ), [oauthError]);

  useEffect(() => {
    let isMounted = true;

    const exchangeCode = async () => {
      if (oauthError) {
        setStatus({ type: 'error', message: errorMessage });
        return;
      }

      if (!code) {
        setStatus({ type: 'error', message: 'Google sign-in code is missing.' });
        return;
      }

      try {
        const { data } = await api.post('/auth/oauth/exchange', { code });
        const user = data?.data?.user || data?.user;
        const accessToken = data?.data?.accessToken;

        if (!data?.success || !user || !accessToken) {
          throw new Error(data?.message || 'OAuth exchange failed');
        }

        localStorage.setItem('accessToken', accessToken);
        setUser(user);
        window.history.replaceState(null, '', '/dashboard');

        if (isMounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        if (!isMounted) return;
        setStatus({
          type: 'error',
          message: error?.response?.data?.message || 'Google sign-in failed. Please try again.',
        });
      }
    };

    exchangeCode();

    return () => {
      isMounted = false;
    };
  }, [code, errorMessage, navigate, oauthError, setUser]);

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>{status.type === 'error' ? 'Google sign-in failed' : 'Google sign-in'}</h1>
        <p className={`auth-status auth-status--${status.type === 'error' ? 'error' : 'success'}`}>
          {status.message}
        </p>
        {status.type === 'error' && <Link to="/">Back to sign in</Link>}
      </section>
    </main>
  );
}

export default OAuthCallbackPage;
