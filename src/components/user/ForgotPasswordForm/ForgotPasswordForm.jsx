// src/components/user/ForgotPasswordForm/ForgotPasswordForm.jsx
import React, { useState } from 'react';
import './ForgotPasswordForm.css';

function ForgotPasswordForm({ onSwitch }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Connect with backend forgot password API
    console.log('Reset password request for:', email);
    alert(`Password reset link sent to ${email} (mock)`);
    // After sending reset link, switch to login
    onSwitch('login');
  };

  return (
    <form className="forgot-password-form" onSubmit={handleSubmit}>
      <p className="info-text">
        Enter your email address below and we'll send you a link to reset your password.
      </p>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="john@example.com"
        />
      </div>

      <button type="submit" className="submit-btn">Send Reset Link</button>

      <p className="switch-text">
        Remembered your password?{' '}
        <span className="link-text" onClick={() => onSwitch('login')}>
          Login
        </span>
      </p>
    </form>
  );
}

export default ForgotPasswordForm;
