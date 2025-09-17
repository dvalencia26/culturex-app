import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { verifyEmail, isLoading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      return; 
    }
    
    const result = await verifyEmail(otp);
    if (result.success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        <h1 className="text-[var(--primary-color-royal)] text-center mb-6 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Verify Your Email</h1>
        
        <p className="text-[var(--text-color-ink-400)] text-center mb-8 text-lg leading-relaxed max-w-md">
          We've sent a verification code to your email address. Please enter it below to verify your account.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            <label htmlFor="otp" className="text-[var(--text-color-ink)] font-semibold block mb-3 text-lg text-center">
              Enter Verification Code
            </label>
            <input 
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full p-4 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)] bg-[var(--color-ivory)] text-[var(--text-color-ink)] text-center text-2xl tracking-[0.3em] font-mono transition-all duration-200"
              maxLength="6"
              required
              placeholder="000000"
              disabled={isLoading}
            />
            <p className="text-[var(--text-color-ink-400)] text-sm text-center mt-2">
              Enter the 6-digit code from your email
            </p>
          </div>

          <button 
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full max-w-md mt-4 py-4 bg-[var(--color-gold)] text-[var(--text-color-ink)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--color-gold-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[var(--text-color-ink-400)] mb-4">Didn't receive the code?</p>
          <button 
            className="text-[var(--secondary-color-orchid)] hover:text-[var(--secondary-color-orchid-600)] transition-colors duration-200 font-semibold underline underline-offset-2"
            onClick={() => {/* Resend logic not implemented yet */}}
          >
            Resend Code
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] transition-colors duration-200 font-medium">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail