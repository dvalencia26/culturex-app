import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchBar Component with debounce + manual trigger by button or Enter key
 * Used for filtering posts, threads, and other content lists
 * 
 * Features:
 * - Debounced search (500ms after user stops typing)
 * - Manual trigger via search icon button or Enter key
 * - Clear button to reset search
 * - Loading state indicator
 */

const SearchBar = ({
  value = '',
  onSearch,
  placeholder = 'Search...',
  loading = false,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const inputRef = useRef(null);

  // Sync internal state with prop value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Called by debounce (Enter key, or button click)
  const triggerSearch = (term) => {
    if (onSearch) {
      onSearch(term);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for debounced search (500ms)
    const timeout = setTimeout(() => {
      triggerSearch(newValue);
    }, 500);

    setDebounceTimeout(timeout);
  };

  // Handle Enter key press for immediate search
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      // Clear debounce timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      // Trigger search immediately
      triggerSearch(searchTerm);
    }
  };

  // Handle manual search button click
  const handleSearchClick = () => {
    // Clear debounce timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    triggerSearch(searchTerm);
  };

  const handleClear = () => {
    setSearchTerm('');
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    triggerSearch('');
    inputRef.current?.focus();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return (
    <div className={`relative ${className}`}>
      {/* Search Icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-color-ink-400)]">
        <Search className="w-5 h-5" />
      </div>

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="w-full pl-10 pr-24 py-3 border border-[var(--border-color-line)] rounded-input focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-transparent transition-all"
      />

      {/* Right Side Controls */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Loading Indicator */}
        {loading && (
          <div className="w-5 h-5 border-2 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
        )}

        {/* Clear Button */}
        {searchTerm && !loading && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-[var(--color-background-snow)] rounded-full transition-colors"
            title="Clear search"
          >
            <X className="w-5 h-5 text-[var(--text-color-ink-400)]" />
          </button>
        )}

        {/* Search Button */}
        <button
          onClick={handleSearchClick}
          disabled={loading}
          className="bg-[var(--primary-color-royal)] text-white px-4 py-1.5 rounded-input font-medium hover:bg-[var(--primary-color-royal-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Search (or press Enter)"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
