import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';
import { useAppDialog } from '@/context/AppDialogContext';
import api from '@/utils/common/serve';
import { DropdownSelect as CustomSelect } from "@/components/ui";
const currencies = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'USC', label: 'US Cents (USC)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
];

const digitsOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 15);
const toPhoneCredential = (value) => {
  const digits = digitsOnly(value);
  return digits ? `+${digits}` : null;
};

const inputClass = 'profile-onboarding__input min-h-[50px] w-full border-0 rounded-xl bg-[#f4f5f7] text-[#101214] px-[14px] py-[13px] text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] focus:outline-none focus:shadow-[0_0_0_4px_rgba(229,255,61,0.28),inset_0_0_0_1px_rgba(15,23,42,0.16)]';
const labelClass = 'grid gap-2 text-[#15191f] text-xs font-[850]';

function ProfileOnboardingPage() {
  const { user, setUser } = useAuth();
  const { notify } = useAppDialog();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => ({
    firstName: user?.profileComplete ? (user.firstName || '') : '',
    lastName: user?.profileComplete ? (user.lastName || '') : '',
    phone: digitsOnly(user?.phone),
    currency: user?.preferred_currency ?? 'USD',
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const displayEmail = useMemo(() => user?.email || 'your account', [user?.email]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: name === 'phone' ? digitsOnly(value) : value,
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: toPhoneCredential(formData.phone),
        preferred_currency: formData.currency,
      });

      const updatedUser = data?.user ?? data?.data?.user ?? null;
      if (!data?.success || !updatedUser) {
        throw new Error('Could not save profile.');
      }

      setUser(updatedUser);
      notify('Profile saved successfully', 'success');
      navigate('/dashboard', { replace: true });
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="profile-onboarding min-h-screen grid place-items-center p-[28px] max-[760px]:p-0 bg-[#f5f6f8] text-[#101214]">
      <section className="profile-onboarding__panel w-[min(960px,100%)] min-h-[620px] max-[760px]:min-h-screen grid grid-cols-[minmax(260px,0.72fr)_minmax(340px,1fr)] max-[760px]:grid-cols-1 overflow-hidden border border-[rgba(15,23,42,0.08)] rounded-[28px] max-[760px]:rounded-none bg-white shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
        <div className="profile-onboarding__brand grid content-end p-[42px] max-[760px]:p-[28px] max-[760px]:min-h-[160px] bg-[linear-gradient(145deg,rgba(229,255,61,0.18),transparent_34%),linear-gradient(145deg,#111111,#25282d)] text-white text-[42px] max-[760px]:text-[34px] leading-none font-black tracking-normal">Entrack</div>

        <form className="profile-onboarding__form grid content-center gap-[18px] p-[clamp(30px,5vw,58px)]" onSubmit={handleSubmit}>
          <header className="mb-2">
            <p className="m-0 mb-3 text-[rgba(15,23,42,0.56)] text-[13px] font-bold">{displayEmail}</p>
            <h1 className="m-0 text-[#101214] text-[clamp(30px,4vw,42px)] leading-none font-black tracking-normal">Finish your profile</h1>
            <span className="block mt-3 text-sm leading-[1.55] text-[rgba(15,23,42,0.62)]">Just a few details before your dashboard opens.</span>
          </header>

          {error && <div className="profile-onboarding__error px-[14px] py-3 rounded-xl bg-[#fff0f0] text-[#9b1c1c] text-[13px] font-bold">{error}</div>}

          <div className="profile-onboarding__grid grid grid-cols-2 max-[760px]:grid-cols-1 gap-[14px]">
            <label className={labelClass}>
              First name
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Raj"
                autoComplete="given-name"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Last name
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Sharma"
                autoComplete="family-name"
                required
                className={inputClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Phone number
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="919876543210"
              autoComplete="tel"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Preferred currency
            <CustomSelect
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="profile-onboarding__select min-h-[50px] w-full border-0 rounded-xl bg-[#f4f5f7] text-[#101214] px-[14px] py-[13px] text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] hover:shadow-[0_0_0_4px_rgba(88,212,126,0.14),inset_0_0_0_1px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_rgba(88,212,126,0.14),inset_0_0_0_1px_rgba(15,23,42,0.16)]"
              options={currencies}
            />
          </label>

          <button type="submit" disabled={loading} className="profile-onboarding__submit min-h-[52px] mt-2 border-0 rounded-xl bg-[#111111] text-white text-sm font-black cursor-pointer shadow-[0_18px_42px_rgba(0,0,0,0.18)] disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Saving...' : 'Continue to dashboard'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ProfileOnboardingPage;
