import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Logo from '@/components/Common/Logo/Logo';
import GoogleIcon from '@/icons/GoogleIcon';
import { API_URL } from '@/utils/common/constants';
import { useAuth } from '@/context/AuthContext';

const inputCls = "form-input min-h-[46px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-3 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]";
const inputPwCls = "form-input min-h-[46px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] py-3 pl-3.5 pr-11 text-[14px] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]";
const labelCls = "mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)]";
const submitBtnCls = "mt-4 min-h-[48px] w-full rounded-xl bg-[var(--button-bg)] p-3 text-[14px] font-bold text-[var(--button-text)] shadow-sm hover:bg-[var(--button-bg-hover)] cursor-pointer disabled:opacity-60";

function McpAuthorizePage() {
  const [params] = useSearchParams();
  const clientId = params.get('client_id') || '';
  const clientName = params.get('client_name') || (clientId === 'claude' ? 'Claude' : (clientId || 'AI Assistant'));
  const redirectUri = params.get('redirect_uri') || '';
  const state = params.get('state') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const errorParam = params.get('error') || '';

  const { user, isAuthLoading } = useAuth();
  const [switchAccount, setSwitchAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleAuth = () => {
    if (!API_URL) return;
    const returnUrl = `/oauth/authorize?${params.toString()}`;
    window.location.href = `${API_URL}/api/v1/auth/google?next=${encodeURIComponent(returnUrl)}`;
  };

  const isUserAuthenticated = Boolean(user && !switchAccount);

  return (
    <main className="auth-route flex min-h-screen items-center justify-center p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="auth-panel w-[min(420px,100%)] p-7 border border-[var(--border-light)] rounded-2xl bg-[var(--bg-card)] shadow-lg">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-[20px] font-extrabold text-[var(--heading)]">Connect with {clientName}</h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Authorize {clientName} to access your trading journal</p>
        </div>

        {errorParam && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[12px] font-semibold text-red-400 text-center">
            {decodeURIComponent(errorParam)}
          </div>
        )}

        <div className="mb-5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-3.5 text-[13px]">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] mb-2">
            <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
            Permissions Requested
          </div>
          <ul className="space-y-1 text-[12px] text-[var(--text-secondary)] list-disc pl-5">
            <li>View trade history and execution metrics</li>
            <li>Calculate win rate, profit factor and stats</li>
            <li>Read journal notes and day reviews</li>
          </ul>
        </div>

        {isAuthLoading ? (
          <div className="text-center py-6 text-[13px] text-[var(--text-secondary)]">Loading account details...</div>
        ) : isUserAuthenticated ? (
          <div>
            <div className="mb-5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-3.5">
              <div className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Signed In As</div>
              <div className="mt-1 text-[14px] font-bold text-[var(--text-primary)]">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
              </div>
              <div className="text-[12px] text-[var(--text-secondary)]">{user.email}</div>
            </div>

            <form method="POST" action={`${API_URL}/oauth/authorize`}>
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="client_name" value={clientName} />
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <input type="hidden" name="state" value={state} />
              <input type="hidden" name="code_challenge" value={codeChallenge} />
              <button type="submit" className={submitBtnCls}>Authorize {clientName}</button>
            </form>

            <button
              type="button"
              onClick={() => setSwitchAccount(true)}
              className="mt-3 w-full text-center text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
            >
              Sign in with different account
            </button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="mb-4 flex min-h-[46px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-2.5 text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--border-light)] cursor-pointer"
            >
              <GoogleIcon className="h-5 w-5" />
              Continue with Google
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-light)]" />
              </div>
              <span className="relative bg-[var(--bg-card)] px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Or sign in with email
              </span>
            </div>

            <form method="POST" action={`${API_URL}/oauth/authorize`}>
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="client_name" value={clientName} />
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <input type="hidden" name="state" value={state} />
              <input type="hidden" name="code_challenge" value={codeChallenge} />

              <div className="mb-3">
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="trader@example.com"
                  className={inputCls}
                />
              </div>

              <div className="mb-4">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className={inputPwCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 text-[var(--text-muted)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" className={submitBtnCls}>Log In &amp; Authorize</button>
            </form>

            {user && switchAccount && (
              <button
                type="button"
                onClick={() => setSwitchAccount(false)}
                className="mt-3 w-full text-center text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer bg-transparent border-0"
              >
                Back to {user.email}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default McpAuthorizePage;
