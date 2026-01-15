import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login, googleAuth, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Save location state so user can be redirected after login. Default is set to home page.
  const from = location.state?.from || '/';

  const [logindata, setLogindata] = useState({
    email: '',
    password: ''
  });

  const {email, password} = logindata;

  const handleChange = (e) => {
    setLogindata({...logindata, [e.target.name]: e.target.value});
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if email and password are not empty
    if (!email || !password) {
      return;
    }

    const result = await login(logindata);

    if (result.success) {
      navigate(from, { replace: true });
    }
  }

  const handleLoginWithGoogle = async (response) => {
    /* The token contains the user's identity and is used to authenticate with the backend */
    const token = response.credential; // Get the ID token from Google's response
    try {
      const result = await googleAuth(token); // using authService.googleAuth to send token to backend
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        console.log("Google auth failed:", result.error);
      }
    } catch (error) {
      console.error('Google login error:', error);
    }
  };

  // Sometimes the Google script may load after the component mounts, so we need to check periodically
  /* Global google - We're using the script from the index.html to handle Google Sign-In */
  const initializeGoogleSignIn = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_CLIENT_ID,
        callback: handleLoginWithGoogle
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-login-button"),
        { theme: "outline", size: "large", text:"signin_with", width: "240" , shape: "pill" }
      );
    } else {
      // If Google script isn't loaded yet, wait and try again
      setTimeout(initializeGoogleSignIn, 100);
    }
  };
  // Initialize Google Sign-In when component mounts
  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <div className="w-full max-w-xl bg-[var(--color-white)] rounded-card shadow-card p-12 border-2 border-[var(--border-color-line)] flex flex-col items-center">
        <h1 className="text-[var(--primary-color-royal)] text-center mb-10 tracking-wide text-4xl font-extrabold drop-shadow-lg font-editorial">Welcome Back</h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-7">
          {isLoading && <p className="text-[var(--text-color-ink)] text-center mb-4 font-medium">Logging in...</p>}
          <div>
            <label htmlFor="email" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              value={email}
              onChange={handleChange}
              className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
              required 
            />
          </div>
          
          <div>
            <label htmlFor="password" className="text-[var(--text-color-ink)] font-semibold block mb-2 text-lg">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              value={password}
              onChange={handleChange}
              className="w-full p-3 border-2 border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-[var(--primary-color-royal)] bg-[var(--color-white)] text-[var(--text-color-ink)] text-base transition-all duration-200" 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 py-4 bg-[var(--primary-color-royal)] text-[var(--color-white)] font-extrabold text-xl rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-[var(--ease-snappy)] tracking-wider"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/forget_password" className="text-[var(--secondary-color-orchid)] hover:text-[var(--secondary-color-orchid-600)] transition-colors duration-200 font-medium">
            Forgot your password?
          </Link>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-[var(--border-color-line)]"></div>
            <span className="text-[var(--text-color-ink-400)] text-sm font-medium">OR</span>
            <div className="flex-1 h-px bg-[var(--border-color-line)]"></div>
          </div>
          <div id="google-login-button" className="w-full"></div>
        </div>

        <div className="mt-8 text-center">
          <span className="text-[var(--text-color-ink-400)]">Don't have an account? </span>
          <Link to="/signup" className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] transition-colors duration-200 font-semibold">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login