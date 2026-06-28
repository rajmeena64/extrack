import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import api from '../../utils/serve';
import CustomSelect from '../Common/CustomSelect';
import { getUserSafeError } from '../../utils/safeErrors';
import './ProfileOnboardingPage.css';

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

function ProfileOnboardingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => ({
    firstName: user?.profileComplete ? (user.firstName || '') : '',
    lastName: user?.profileComplete ? (user.lastName || '') : '',
    phone: digitsOnly(user?.phone),
    currency: user?.preferred_currency || 'USD',
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

      const updatedUser = data?.data?.user || data?.user;
      if (!data?.success || !updatedUser) {
        throw new Error(data?.message || 'Could not save profile.');
      }

      setUser(updatedUser);
      navigate('/dashboard', { replace: true });
    } catch (saveError) {
      setError(getUserSafeError(saveError, 'Could not save profile. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="profile-onboarding">
      <section className="profile-onboarding__panel">
        <div className="profile-onboarding__brand">Entrack</div>

        <form className="profile-onboarding__form" onSubmit={handleSubmit}>
          <header>
            <p>{displayEmail}</p>
            <h1>Finish your profile</h1>
            <span>Just a few details before your dashboard opens.</span>
          </header>

          {error && <div className="profile-onboarding__error">{error}</div>}

          <div className="profile-onboarding__grid">
            <label>
              First name
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Raj"
                autoComplete="given-name"
                required
              />
            </label>

            <label>
              Last name
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Sharma"
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <label>
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
            />
          </label>

          <label>
            Preferred currency
            <CustomSelect
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="profile-onboarding__select"
              options={currencies}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Continue to dashboard'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ProfileOnboardingPage;
