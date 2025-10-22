import { useState, useEffect, useRef } from 'react';

/*
SearchDropdown Component
Renders and manages UI interactions
Allows custom option label/value extraction via props.
*/

const SearchDropdown = ({
  options = [],
  value = '',
  onSelect,
  placeholder = 'Search...',
  loading = false,
  searchable = true,
  disabled = false,
  error = false,
  className = '',
  getOptionLabel = (option) => option.name || option.label || option,
  getOptionValue = (option) => option.id || option.value || option,
  renderOption = null,
  emptyMessage = 'No results found',
  loadingMessage = 'Loading...',
  onSearchChange = null, // handle search changes externally
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef(null); // Reference to the dropdown container
  const inputRef = useRef(null); // Reference to the input element

  // Filter options based on search term
  const filteredOptions = searchable && searchTerm.length > 0
    ? options.filter(option =>
        getOptionLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Handle option selection
  const handleSelect = (option) => {
    const optionValue = getOptionValue(option); // Value of the selected option. Example: country code
    const optionLabel = getOptionLabel(option); // Label of the selected option. Example: country name
    
    setSelectedLabel(optionLabel);
    setSearchTerm(optionLabel);
    setIsOpen(false);
    
    if (onSelect) {
      onSelect(optionValue, option); // Pass both value and full option object
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearchTerm(inputValue);
    setIsOpen(true); // Always open when typing
    
    // Call external search handler if provided, this is useful for async searches
    if (onSearchChange) {
      onSearchChange(inputValue);
    }
    
    // Clear selection if user clears input
    if (inputValue === '') {
      setSelectedLabel('');
      if (onSelect) {
        onSelect('', null);
      }
    }
  };

  // Handle input focus
  const handleFocus = () => {
    if (searchable && !disabled) {
      setIsOpen(searchTerm.length > 0 || options.length > 0);
    }
  };

  // Handle click outside to close dropdown (Event Listener). It detects clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search term when value prop changes (for controlled components)
  useEffect(() => {
    // When parent changes (value prop), internal state must update
    if (value) {
      const selectedOption = options.find(option => getOptionValue(option) == value); 
      if (selectedOption) {
        const label = getOptionLabel(selectedOption);
        setSelectedLabel(label);
        // Only set search term if it's different to avoid clearing user input
        if (searchTerm !== label) {
          setSearchTerm(label);
        }
      }
    } else if (!searchTerm) { // Only clear if search term is empty
      setSelectedLabel('');
      setSearchTerm('');
    }
  }, [value, options.length]); // Only depend on value and options length this prevent excessive resets since options may change frequently

  // Reset search state when options change completely (but preserve user input)
  useEffect(() => {
    if (!value && !searchTerm) {
      setSelectedLabel('');
      setIsOpen(false);
    }
  }, [options.length, value, searchTerm]);

  // Default option renderer
  const defaultRenderOption = (option) => (
    <div className="font-medium text-gray-900">
      {getOptionLabel(option)}
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={disabled ? 'Please select a country first' : placeholder}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
      />

      {/* Dropdown Results */}
      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>{loadingMessage}</span>
              </div>
            </div>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={getOptionValue(option)}
                onClick={() => handleSelect(option)}
                className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ease-in-out"
              >
                {renderOption ? renderOption(option) : defaultRenderOption(option)}
              </div>
            ))
          ) : searchTerm.length > 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">{emptyMessage}</div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">Start typing to search</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;