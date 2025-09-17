import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-[var(--color-white)] shadow-card border-b border-[var(--border-color-line)] font-ui">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] transition-all duration-200 ease-[var(--ease-snappy)] font-editorial">
              CultureX
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
            >
              Home
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile" 
                  className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Profile
                </Link>
                <span className="text-[var(--text-color-ink-400)] text-sm font-medium">
                  Welcome, {user.first_name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-4 py-2 rounded-input text-sm font-semibold hover:bg-[var(--primary-color-royal-600)] shadow-card transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-4 py-2 rounded-input text-sm font-semibold hover:bg-[var(--primary-color-royal-600)] shadow-card transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] focus:outline-none focus:text-[var(--primary-color-royal)] transition-all duration-200 ease-[var(--ease-snappy)]"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[var(--color-background-snow)] border-t border-[var(--border-color-line)]">
              <Link
                to="/"
                className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              
              {user ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="px-3 py-2 text-[var(--text-color-ink-400)] text-sm font-medium">
                    Welcome, {user.first_name || user.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] text-base font-semibold transition-all duration-200 ease-[var(--ease-snappy)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;