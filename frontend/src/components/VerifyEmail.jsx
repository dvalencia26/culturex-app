import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [website, setWebsite] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();
  const { verifyEmail, resendOtp, isLoading } = useAuth();

  useEffect(() => {
    const savedEmail = localStorage.getItem('pendingEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || otp.length !== 6) {
      return; 
    }
    
    const result = await verifyEmail({ otp, email });
    if (result.success) {
      localStorage.removeItem('pendingEmail');
      navigate('/login');
    } else if (result.error) {
      const errorMessage = result.error.toLowerCase();
      if (errorMessage.includes('too many attempts') || errorMessage.includes('expired')) {
        setIsLocked(true);
      }
    }
  };

  const handleResend = async () => {
    setResendStatus('');
    if (!email) {
      setResendStatus('Please enter your email address first.');
      return;
    }

    const result = await resendOtp({ email, website });
    if (result.success) {
      setResendStatus('A new verification code has been sent.');
      setIsLocked(false);
    } else {
      setResendStatus(result.error || 'Unable to resend code right now.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        <h1 className="text-[var(--primary-color-royal)] text-center mb-6 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Verify Your Email</h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
          <div className="w-full max-w-md">
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="off"
              tabIndex="-1"
              className="hidden"
              aria-hidden="true"
            />
            <p className="text-[var(--text-color-ink)] block mb-3 text-lg text-center">
              Please ensure your email is correct.
            </p>
            <div className="w-full rounded-input border border-[var(--border-color-line)] bg-[var(--color-background-snow)] px-4 py-3 text-[var(--text-color-ink-400)] text-center text-base mb-6">
              {email || 'Email not available'}
            </div>

            <p className="text-[var(--text-color-ink)] block mb-4 text-lg text-center">
              Enter the 6-digit Verification Code
            </p>
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
          </div>

          <button 
            type="submit"
            disabled={isLoading || otp.length !== 6 || !email || isLocked}
            className="w-full max-w-md mt-4 py-4 bg-[var(--color-gold)] text-[var(--text-color-ink)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--color-gold-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[var(--text-color-ink-400)] mb-4">Didn't receive the code?</p>
          <button 
            className="text-[var(--secondary-color-orchid)] hover:text-[var(--secondary-color-orchid-600)] transition-colors duration-200 font-semibold underline underline-offset-2"
            onClick={handleResend}
            disabled={isLoading}
          >
            Resend Code
          </button>
          {resendStatus && (
            <p className="mt-3 text-sm text-[var(--text-color-ink-400)]">{resendStatus}</p>
          )}
        </div>

        <div className="mt-10 text-center">
          <Link 
            to="/signup" 
            className="text-[var(--secondary-color-orchid)] hover:text-[var(--secondary-color-orchid-600)] transition-colors duration-200 font-semibold underline underline-offset-2 block mb-6"
          >
            Not your email? Go back to signup
          </Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail