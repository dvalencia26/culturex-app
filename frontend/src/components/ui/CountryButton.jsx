import { useNavigate } from 'react-router-dom';
import { getFlagEmoji } from '../../utils/countryUtils';

/**
 * CountryButton Component
 * 
 * A simple button component that displays a country with its flag emoji and name.
 * On click, navigates to a country-specific posts page.
 * 
 * Props:
 * - countryCode: String - ISO 2-letter country code (e.g., 'US', 'BR', 'EC')
 * - countryName: String - Full country name (e.g., 'United States', 'Brazil', 'Ecuador')
 */

const CountryButton = ({ countryCode, countryName }) => {
  const navigate = useNavigate();

  // Handle button click
  const handleClick = () => {
    navigate(`/countries/${countryCode.toLowerCase()}`);
  };

  if (!countryCode || !countryName) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="
        inline-flex items-center space-x-3 px-4 py-3 
        bg-[var(--color-white)] border border-[var(--border-color-line)] rounded-card 
        hover:bg-[var(--color-background-snow)] hover:border-[var(--primary-color-royal)] 
        focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:border-transparent
        transition-all duration-200 ease-[var(--ease-snappy)]
        shadow-card hover:shadow-card
        font-ui
      "
    >
      <span className="text-2xl">
        {getFlagEmoji(countryCode)}
      </span>
      
      <span className="text-[var(--text-color-ink)] font-medium">
        {countryName}
      </span>
    </button>
  );
};

export default CountryButton;
