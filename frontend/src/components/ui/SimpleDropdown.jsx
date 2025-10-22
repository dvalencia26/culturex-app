/*
SimpleDropdown Component
A basic dropdown/select component with loading and error states.
Allows custom option label/value extraction via props.
*/

const SimpleDropdown = ({
  options = [],
  value = '',
  onSelect,
  placeholder = 'Select an option',
  loading = false,
  disabled = false,
  error = false,
  className = '',
  getOptionLabel = (option) => option.name || option.label || option,
  getOptionValue = (option) => option.id || option.value || option,
  loadingMessage = 'Loading...',
}) => {
  const handleChange = (e) => {
    const selectedValue = e.target.value;
    
    if (onSelect) {
      if (selectedValue === '') {
        onSelect('', null);
      } else {
        const selectedOption = options.find(option => 
          getOptionValue(option).toString() === selectedValue
        );
        onSelect(selectedValue, selectedOption);
      }
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled || loading}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'} ${className}`}
    >
      <option value="">
        {loading ? loadingMessage : placeholder}
      </option>
      {!loading && options.map((option) => (
        <option key={getOptionValue(option)} value={getOptionValue(option)}>
          {getOptionLabel(option)}
        </option>
      ))}
    </select>
  );
};

export default SimpleDropdown;