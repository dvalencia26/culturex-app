import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import authService from '../services/authService';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, googleAuth, isLoading } = useAuth();

  // Get the redirect path from location state, default to profile for new users 
  const from = location.state?.from || '/profile';
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password2: '',
    website: ''
  });
  const [formError, setFormError] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const handleSignupWithGoogle = async (response) => {
    console.log("Google Sign-In response:", response);
    const token = response.credential;
    
    try {
      const result = await googleAuth(token);
      
      if (result.success) {
        // Navigate to the redirect path after successful Google auth
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Google signup error:', error);
    }
  };
  
  useEffect(() => {
    /* Global google - We're using the script from the index.html to handle Google Sign-In */
    google.accounts.id.initialize({
      client_id: import.meta.env.VITE_CLIENT_ID,
      callback: handleSignupWithGoogle
    });
    google.accounts.id.renderButton(
      document.getElementById("google-signup-button"),
      { theme: "outline", size: "large", text:"signup_with", width: "240" , shape: "pill" }  // customization attributes
    );
  }, []);
      
  
  const {email, first_name, last_name, password, password2, website} = formData;

  useEffect(() => {
    let isActive = true;
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setEmailStatus('idle');
      return;
    }

    const emailPattern = /^\S+@\S+\.\S+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setEmailStatus('invalid');
      return;
    }

    setEmailStatus('checking');
    const timer = setTimeout(async () => {
      const result = await authService.checkEmailAvailability(normalizedEmail);
      if (!isActive) return;
      if (result.success) {
        setEmailStatus(result.data.available ? 'available' : 'taken');
      } else {
        setEmailStatus('error');
      }
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [email]);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (website) {
      return;
    }
    if (!email || !first_name || !last_name || !password || !password2) {
      toast.error('Please fill in all fields');
      return;
    }
    if (emailStatus === 'taken') {
      setFormError('This email is already in use. Try another one or log in.');
      return;
    }

    const result = await register(formData);
    
    if (result.success) {
      localStorage.setItem('pendingEmail', email);
      navigate('/otp/verify');
    } else if (result.error) {
      setFormError(result.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-2xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        <h1 className="text-[var(--primary-color-royal)] text-center mb-10 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Create Your Account</h1>
        <form className="w-full flex flex-col gap-7" onSubmit={handleSubmit}>
          <input
            type="text"
            name="website"
            value={website}
            onChange={handleChange}
            autoComplete="off"
            tabIndex="-1"
            className="hidden"
            aria-hidden="true"
          />
          <div>
            <label htmlFor="email" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={email} 
              onChange={handleChange} 
              required 
              className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
            />
            {emailStatus === 'checking' && (
              <p className="mt-2 text-sm text-[var(--text-color-ink-400)]">Checking email availability...</p>
            )}
            {emailStatus === 'available' && (
              <p className="mt-2 text-sm text-green-600">Email is available.</p>
            )}
            {emailStatus === 'taken' && (
              <p className="mt-2 text-sm text-red-600">This email is already in use.</p>
            )}
            {emailStatus === 'invalid' && (
              <p className="mt-2 text-sm text-red-600">Enter a valid email address.</p>
            )}
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <label htmlFor="first_name" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">First Name</label>
              <input 
                type="text" 
                id="first_name" 
                name="first_name" 
                value={first_name} 
                onChange={handleChange} 
                required 
                className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
              />
            </div>
            <div className="flex-1">
              <label htmlFor="last_name" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Last Name</label>
              <input 
                type="text" 
                id="last_name" 
                name="last_name" 
                value={last_name} 
                onChange={handleChange} 
                required 
                className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
              />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <label htmlFor="password" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  name="password" 
                  value={password} 
                  onChange={handleChange} 
                  required 
                  className="w-full p-3 pr-12 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color-orchid)] focus:border-[var(--secondary-color-orchid)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-sm text-[var(--text-color-ink-400)]">
                At least 8 characters.
              </p>
            </div>
            <div className="flex-1">
              <label htmlFor="password2" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Confirm Password</label>
              <div className="relative">
                <input 
                  type={showPassword2 ? 'text' : 'password'} 
                  id="password2" 
                  name="password2" 
                  value={password2} 
                  onChange={handleChange} 
                  required 
                  className="w-full p-3 pr-12 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--secondary-color-orchid)] focus:border-[var(--secondary-color-orchid)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors"
                  aria-label={showPassword2 ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showPassword2 ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-sm text-[var(--text-color-ink-400)]">
                Passwords must match.
              </p>
            </div>
          </div>
          {formError && (
            <div className="rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 py-4 bg-[var(--primary-color-royal)] text-[var(--color-white)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-8 flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-[var(--border-color-line)]"></div>
          <span className="text-[var(--text-color-ink-400)] text-sm font-medium">OR</span>
          <div className="flex-1 h-px bg-[var(--border-color-line)]"></div>
        </div>

        <div id="google-signup-button"></div>
          {/* Sign up with Google */}
   
        
        <div className="mt-8 text-center">
          <span className="text-[var(--text-color-ink-400)]">Already have an account? </span>
          <Link to="/login" className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] transition-colors duration-200 font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup
