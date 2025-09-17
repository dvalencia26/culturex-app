import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { setNewPassword, isLoading } = useAuth();
  const { uidb64, token } = useParams(); 
  const [newResetPassword, setNewResetPassword] = useState({
    password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setNewResetPassword({...newResetPassword, [e.target.name]: e.target.value});
    
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!newResetPassword.password) {
      newErrors.password = 'Password is required';
    } else if (newResetPassword.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (!newResetPassword.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password';
    } else if (newResetPassword.password !== newResetPassword.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const data = {
    'password': newResetPassword.password,
    'confirm_password': newResetPassword.confirm_password,
    'uidb64': uidb64, 
    'token': token
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const response = await setNewPassword(data);
    if (response.success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        <h1 className="text-[var(--primary-color-royal)] text-center mb-4 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Reset Your Password</h1>
        <p className="text-[var(--text-color-ink-400)] text-center mb-8 text-lg leading-relaxed max-w-md">
          Enter your new password below to complete the reset process.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-7">
          <div>
            <label htmlFor="password" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">New Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              value={newResetPassword.password}
              onChange={handleChange}
              className={`w-full p-3 border-2 rounded-input focus:outline-none focus:ring-2 bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200 ${
                errors.password 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-[var(--border-color-line)] focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)]'
              }`}
              placeholder="Enter new password"
              disabled={isLoading}
              required 
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="confirm_password" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Confirm New Password</label>
            <input 
              type="password" 
              id="confirm_password" 
              name="confirm_password"
              value={newResetPassword.confirm_password}
              onChange={handleChange}
              className={`w-full p-3 border-2 rounded-input focus:outline-none focus:ring-2 bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200 ${
                errors.confirm_password 
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                  : 'border-[var(--border-color-line)] focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)]'
              }`}
              placeholder="Confirm new password"
              disabled={isLoading}
              required
            />
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 py-4 bg-[var(--color-gold)] text-[var(--text-color-ink)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--color-gold-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword;
