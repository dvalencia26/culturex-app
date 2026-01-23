import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronDown, SquarePen, MessageSquare, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createDropdownRef = useRef(null); // UseRef helps with the dropdown click outside detection

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target)) {
        setIsCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <Link 
              to="/threads" 
              className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
            >
              Discussion
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Create button Dropdown */}
                <div className="relative" ref={createDropdownRef}>
                  <button
                    onClick={() => setIsCreateOpen(!isCreateOpen)}
                    className="flex items-center gap-1 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                  >
                    Create
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCreateOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isCreateOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-[var(--color-white)] rounded-lg shadow-card border border-[var(--border-color-line)] py-2 z-50">
                      <Link
                        to="/create-post"
                        onClick={() => setIsCreateOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-color-ink)] hover:bg-[var(--color-background-snow)] hover:text-[var(--primary-color-royal)] transition-colors"
                      >
                        <SquarePen className="w-4 h-4" />
                        New Blog
                      </Link>
                      <Link
                        to="/create-thread"
                        onClick={() => setIsCreateOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-color-ink)] hover:bg-[var(--color-background-snow)] hover:text-[var(--primary-color-royal)] transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        New Discussion
                      </Link>
                    </div>
                  )}
                </div>

                <Link 
                  to={`/profile/${user?.username || user?.id}`}
                  className="text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] px-3 py-2 text-sm font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Profile
                </Link>
                <span className="text-[var(--text-color-ink-400)] text-sm font-medium">
                  Welcome, @{user?.username || user.first_name || user.email}
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
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
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
              <Link
                to="/threads"
                className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                onClick={() => setIsMenuOpen(false)}
              >
                Discussion
              </Link>
              
              {user ? (
                <>
                  <div className="border-b border-[var(--border-color-line)] pb-2 mb-2">
                    <div className="px-3 py-1 text-xs font-semibold text-[var(--text-color-ink-400)] uppercase">
                      Create
                    </div>
                    <Link
                      to="/create-post"
                      className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      New Blog
                    </Link>
                    <Link
                      to="/create-thread"
                      className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      New Discussion
                    </Link>
                  </div>
                  
                  <Link
                    to={`/profile/${user?.username || user?.id}`}
                    className="block px-3 py-2 text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] text-base font-medium transition-all duration-200 ease-[var(--ease-snappy)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="px-3 py-2 text-[var(--text-color-ink-400)] text-sm font-medium">
                    Welcome, @{user?.username || user.first_name || user.email}
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