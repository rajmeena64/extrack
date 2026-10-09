import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Code2, Hand, LayoutDashboard, LogOut, NotebookPen, Trash2, TriangleAlert, X } from 'lucide-react';
import { DropdownSelect as CustomSelect } from "@/components/ui";
import { API_URL } from "@/utils/common/constants";
import { useAuth } from '@/context/AuthContext';
import { useAppDialog } from '@/context/AppDialogContext';
import { clearClientStorage } from '@/utils/storage/clientStorage';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import VerificationPending from './VerificationPending';

const currencies = [
  { value: 'USD', label: 'US Dollar (USD)' }, { value: 'USC', label: 'US Cents (USC)' },
  { value: 'EUR', label: 'Euro (EUR)' }, { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' }, { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' }, { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' }
];
const labelCls = "mb-2 block text-[12px] font-[850] uppercase leading-[1.2] tracking-[0.12em] text-[var(--text-primary)]";
const inputCls = "form-input min-h-[48px] w-full max-w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-3.5 py-[13px] text-[14px] leading-[1.25] text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(24,73,169,0.18)]";
const digitsOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 15);
const toPhoneCredential = (value) => {
  const digits = digitsOnly(value);
  return digits ? `+${digits}` : '';
};
const getFetchUserError = (_response, data, fallbackMessage) => data?.error ?? data?.message ?? fallbackMessage;

function AuthPage({ initialTab = 'login' }) {
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pendingEmail, setPendingEmail] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    } else {
      setActiveTab(initialTab);
    }
  }, [currentUser, initialTab, navigate]);

  const handleTabSwitch = (tab, data) => {
    setActiveTab(tab);
    if (data?.email) setPendingEmail(data.email);
    const route = tab === 'signup' ? '/signup' : tab === 'forgot' ? '/forgot-password' : tab === 'verification' ? '/verify-email-pending' : '/login';
    navigate(route, { replace: true });
  };

  const handleLogout = async () => {
    const shouldLogout = await confirm('Are you sure you want to logout?', { title: 'Logout', confirmText: 'Logout' });
    if (shouldLogout) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
      } catch (error) {
        void error;
      } finally {
        clearClientStorage();
        queryClient.clear();
        setUser(null);
        setActiveTab('login');
        window.dispatchEvent(new Event('auth:logout'));
        navigate('/login', { replace: true });
      }
    }
  };

  const handleEditProfile = () => {
    if (currentUser) {
      setEditData({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        phone: digitsOnly(currentUser.phone),
        currency: currentUser.preferred_currency ? currentUser.preferred_currency : 'USD'
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editData.firstName,
          lastName: editData.lastName,
          email: editData.email,
          phone: toPhoneCredential(editData.phone),
          preferred_currency: editData.currency
        }),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        alert('Profile updated successfully!');
        setIsEditModalOpen(false);
      } else {
        const msg = getFetchUserError(response, data, 'Could not update profile. Please try again.');
        alert(msg);
      }
    } catch {
      alert('Something went wrong. Please try again.');
    }
  };

  const handleDeleteAccount = () => { setIsDeleteModalOpen(true); };

  const confirmDeleteAccount = async (password) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        alert('Account deleted successfully!');
        clearClientStorage();
        queryClient.clear();
        setUser(null);
        setIsDeleteModalOpen(false);
        navigate('/');
      } else {
        const errMsg = getFetchUserError(response, data, 'Could not delete account. Incorrect password.');
        alert(errMsg);
      }
    } catch {
      alert('Could not delete account. Please try again.');
    }
  };

  return (
    <div className="user-login-page relative grid min-h-screen w-full lg:grid-cols-2 bg-[var(--bg-primary)]">
      <button className="auth-close-btn fixed top-5 right-5 z-20 grid h-9 w-9 place-items-center rounded-full border border-[var(--border-light)] bg-[var(--bg-secondary)] text-[22px] leading-none text-[var(--text-primary)] shadow-sm cursor-pointer transition hover:bg-[var(--bg-hover)] hover:-translate-y-px" onClick={() => navigate('/')} title="Back to home" aria-label="Close">×</button>
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-screen">
        <div className="flex items-center gap-2.5 cursor-pointer self-start" onClick={() => navigate('/')}>
          <div className="h-7 w-7 place-items-center">
            <img src="/assets/applogo/entrack_dna_light_icon.svg" alt="Entrack" className="h-full w-full object-contain" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">Entrack</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[380px] min-w-0">
            {!currentUser && activeTab === 'login' && <Login onSwitchTab={handleTabSwitch} />}
            {!currentUser && activeTab === 'signup' && <Signup onSwitchTab={handleTabSwitch} />}
            {!currentUser && activeTab === 'forgot' && <ForgotPassword onSwitchTab={handleTabSwitch} />}
            {!currentUser && activeTab === 'verification' && <VerificationPending email={pendingEmail} onSwitchTab={handleTabSwitch} />}

            {currentUser && (
              <div id="logoutSection" className="logout-section text-center min-w-0">
                <h2 className="text-xl font-bold text-[#111111]">Welcome to Entrack</h2>
                <div className="user-info mt-2">
                  <p className="mb-2.5 font-semibold text-slate-800">{currentUser.firstName} {currentUser.lastName} ({currentUser.email})</p>
                  <div className="account-type-badge mt-2 inline-block rounded-full bg-[#eef3ff] px-3.5 py-1.5 text-[13px] font-semibold text-[#4f7cff]">
                    {currentUser.accountType === 'api' ? 'Sync' : (currentUser.accountType ?? 'manual')} Account
                  </div>
                </div>
                <div className="account-switcher mt-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Switch Account Type</h3>
                  <div className="account-buttons flex justify-center gap-2">
                    <button className={`account-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${currentUser.accountType === 'manual' ? 'active border-[#4f7cff] bg-[#4f7cff] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                      <Hand className="w-4 h-4" />Manual
                    </button>
                    <button className={`account-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${currentUser.accountType === 'api' ? 'active border-[#4f7cff] bg-[#4f7cff] text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                      <Code2 className="w-4 h-4" />Sync
                    </button>
                  </div>
                </div>
                <div className="action-buttons mt-[22px] flex flex-col gap-2.5">
                  <button className="action-btn primary inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-[#4f7cff] p-3 text-sm font-semibold text-white cursor-pointer transition hover:bg-[#3d6bee]" onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="w-4 h-4" />Go to Dashboard
                  </button>
                  <button className="action-btn secondary inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-[#f1f1f1] p-3 text-sm font-semibold text-[#111111] cursor-pointer transition hover:bg-[#e4e4e4]" onClick={handleEditProfile}>
                    <NotebookPen className="w-4 h-4" />Edit Profile
                  </button>
                  <button className="action-btn danger inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-[#ff4d4f] p-3 text-sm font-semibold text-white cursor-pointer transition hover:bg-[#e03e40]" onClick={handleDeleteAccount}>
                    <Trash2 className="w-4 h-4" />Delete Account
                  </button>
                  <button className="action-btn danger inline-flex items-center justify-center gap-2 rounded-xl border-0 bg-[#ff4d4f] p-3 text-sm font-semibold text-white cursor-pointer transition hover:bg-[#e03e40]" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] self-start">
          © {new Date().getFullYear()} Entrack. All rights reserved.
        </div>
      </div>

      {!currentUser && (
        <div className="hidden lg:flex p-4 sm:p-6 lg:p-8 min-h-screen">
          <aside className="auth-showcase relative min-w-0 w-full h-full min-h-[600px] overflow-hidden rounded-[30px] p-[clamp(34px,4.6vw,64px)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_28px_80px_rgba(0,0,0,0.22)] bg-[linear-gradient(138deg,rgba(255,255,255,0.14),transparent_16%),radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(145deg,#050505_0%,#0b0d10_54%,#020203_100%)] before:pointer-events-none before:absolute before:inset-0 before:content-[''] before:bg-[linear-gradient(132deg,transparent_0_62%,rgba(185,255,225,0.12)_62.5%_64%,transparent_64.4%),linear-gradient(132deg,transparent_0_68%,rgba(91,124,250,0.22)_68.3%_68.8%,transparent_69.2%)] after:pointer-events-none after:absolute after:-right-[18%] after:-top-[18%] after:w-[54%] after:aspect-square after:rounded-full after:blur-[10px] after:content-[''] after:bg-[radial-gradient(circle,rgba(229,255,61,0.16),transparent_62%)] max-[920px]:min-h-[360px] max-[920px]:rounded-[24px] max-[920px]:-order-1 max-[600px]:min-h-[300px] max-[600px]:p-7" aria-label="Entrack product preview">
            <div className="auth-showcase__mark pointer-events-none absolute left-1/2 top-[38px] -translate-x-1/2 text-[clamp(180px,22vw,300px)] font-[950] leading-[0.8] tracking-[-0.12em] text-white/10 max-[600px]:text-[160px]" aria-hidden="true">E</div>
            <div className="auth-showcase__content relative z-2 min-w-0 max-w-[470px] mt-[min(22vh,150px)] max-[920px]:mt-[120px] max-[600px]:mt-[86px]">
              <span className="auth-showcase__eyebrow mb-[22px] block text-[14px] font-extrabold text-white/78">Entrack</span>
              <h2 className="text-[clamp(30px,3.6vw,44px)] font-[850] leading-none tracking-[-0.055em] [overflow-wrap:anywhere]">Welcome to Entrack</h2>
              <p className="mt-4 max-w-[440px] text-[14px] leading-[1.7] text-white/74">Review trades, replay decisions, and turn your trading history into a cleaner weekly improvement loop.</p>
              <p className="auth-showcase__small mt-4 max-w-[440px] text-[14px] leading-[1.7] !text-white/82">Join the workspace built for serious traders who want evidence, not guesswork.</p>
            </div>
            <div className="auth-showcase-card absolute bottom-[clamp(24px,4vw,46px)] left-[clamp(28px,5vw,64px)] right-[clamp(28px,5vw,72px)] z-2 min-w-0 min-h-[154px] grid content-center gap-3.5 rounded-[28px] bg-white/18 p-[26px_clamp(24px,4vw,42px)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_26px_54px_rgba(0,0,0,0.24)] backdrop-blur-[14px] max-[920px]:relative max-[920px]:inset-auto max-[920px]:mt-7 max-[600px]:hidden">
              <h3 className="max-w-[360px] text-white text-[clamp(22px,2.4vw,30px)] font-[850] leading-[1.05] tracking-[-0.055em] [overflow-wrap:anywhere]">Find your edge and protect it.</h3>
              <p className="max-w-[360px] text-white/78 text-[14px] leading-[1.6]">Keep journal notes, broker activity, analytics, and replay practice together.</p>
              <div className="auth-avatar-stack absolute bottom-[34px] right-[34px] flex items-center" aria-hidden="true">
                <span className="grid h-[34px] w-[34px] -ml-[9px] place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-[#5b7cfa] to-[#e5ff3d] text-[10px] font-[900] text-[#111111]">FX</span>
                <span className="grid h-[34px] w-[34px] -ml-[9px] place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-[#5b7cfa] to-[#e5ff3d] text-[10px] font-[900] text-[#111111]">CR</span>
                <span className="grid h-[34px] w-[34px] -ml-[9px] place-items-center rounded-full border-2 border-white/80 bg-gradient-to-br from-[#5b7cfa] to-[#e5ff3d] text-[10px] font-[900] text-[#111111]">IN</span>
                <strong className="grid h-[34px] w-[34px] -ml-[9px] place-items-center rounded-full border-2 border-white/80 bg-[#111111] text-[10px] font-[900] text-white">+2</strong>
              </div>
            </div>
          </aside>
        </div>
      )}

      {isEditModalOpen && (
        <div className="edit-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="edit-content w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="edit-header mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><NotebookPen className="w-4 h-4" /> Edit Profile</h3>
              <button className="close-modal cursor-pointer border-0 bg-transparent p-1 text-slate-400 hover:text-slate-700" onClick={() => setIsEditModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="edit-body">
              <div className="name-fields flex gap-3 max-[600px]:flex-col">
                <div className="form-group mb-[18px] min-w-0 flex-1">
                  <label className={labelCls}>First Name</label>
                  <input type="text" value={editData.firstName} onChange={(e) => setEditData({ ...editData, firstName: e.target.value })} className={inputCls} required />
                </div>
                <div className="form-group mb-[18px] min-w-0 flex-1">
                  <label className={labelCls}>Last Name</label>
                  <input type="text" value={editData.lastName} onChange={(e) => setEditData({ ...editData, lastName: e.target.value })} className={inputCls} required />
                </div>
              </div>
              <div className="form-group mb-[18px] min-w-0">
                <label className={labelCls}>Email</label>
                <input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className={inputCls} required />
              </div>
              <div className="form-group mb-[18px] min-w-0">
                <label className={labelCls}>Phone</label>
                <input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: digitsOnly(e.target.value) })} className={inputCls} inputMode="numeric" pattern="[0-9]*" required />
              </div>
              <div className="form-group mb-[18px] min-w-0">
                <label className={labelCls}>Preferred Currency</label>
                <CustomSelect value={editData.currency} onChange={(e) => setEditData({ ...editData, currency: e.target.value })} className="currency-select min-h-[48px] rounded-xl border-0 bg-white px-3.5 py-[13px] text-[14px] text-[#0f172a] shadow-[0_1px_0_rgba(15,23,42,0.04),inset_0_0_0_1px_rgba(15,23,42,0.04)] hover:shadow-[0_0_0_4px_rgba(88,212,126,0.14)] focus-visible:shadow-[0_0_0_4px_rgba(88,212,126,0.14)]" options={currencies} />
              </div>
              <div className="auth-profile-modal-actions mt-5 flex items-center justify-end gap-2.5">
                <button className="save-btn cursor-pointer rounded-xl border-0 bg-[#111111] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black" onClick={handleUpdateProfile}>Save Changes</button>
                <button className="cancel-btn cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="delete-modal fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="delete-content w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="delete-header mb-3 flex items-center gap-2 text-amber-600">
              <TriangleAlert className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Delete Account</h3>
            </div>
            <div className="delete-body text-sm text-slate-600">
              <p className="mb-2">This action cannot be undone. All your data will be permanently deleted.</p>
              <p className="mb-4 font-semibold text-slate-800">Are you sure you want to delete your account?</p>
              <div className="password-confirm">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">Enter your password to confirm:</label>
                <input type="password" id="deletePassword" className="form-input min-h-[44px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900" placeholder="Your password" autoComplete="new-password" />
              </div>
            </div>
            <div className="delete-actions mt-5 flex items-center justify-end gap-2.5">
              <button className="btn-cancel cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
              <button className="btn-delete cursor-pointer rounded-xl border-0 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700" onClick={() => {
                const password = document.getElementById('deletePassword')?.value;
                if (password) {
                  confirmDeleteAccount(password);
                } else {
                  alert('Please enter your password');
                }
              }}>Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthPage;
