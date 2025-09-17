import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const { requestPasswordReset, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email) {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setEmail(''); // Clear form on success
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        
        <h1 className="text-[var(--primary-color-royal)] text-center mb-4 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Reset Password</h1>
        <p className="text-[var(--text-color-ink-400)] text-center mb-8 text-lg leading-relaxed max-w-md">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-7">
          <div>
            <label htmlFor="email" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color-orchid)] focus:border-[var(--secondary-color-orchid)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200"
              placeholder="Enter your email address"
              disabled={isLoading}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email}
            className="w-full mt-4 py-4 bg-[var(--secondary-color-orchid)] text-[var(--color-white)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--secondary-color-orchid-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] transition-colors duration-200 font-medium">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
