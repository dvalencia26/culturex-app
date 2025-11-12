import { useNavigate } from 'react-router-dom';

/**
 * CityButton Component
 * 
 * Reusable button component for displaying city navigation links
 * Used in CountryPage to show cities with posts
 * 
 * Props:
 * - city: City object with { id, name, slug, post_count }
 * - countryCode: Country code for navigation
 * - variant: 'default' | 'compact' | 'featured'
 * - showPostCount: boolean to display post count
 */

const CityButton = ({ 
  city, 
  countryCode, 
  variant = 'default', 
  showPostCount = true,
  className = '' 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/countries/${countryCode}/${city.slug}`);
  };

  const variants = {
    default: 'bg-[var(--color-white)] border border-[var(--border-color-line)] px-4 py-2 rounded-pill hover:bg-[var(--color-background-snow)] hover:border-[var(--primary-color-royal)] transition-colors font-medium shadow-sm',
    compact: 'bg-[var(--color-white)] border border-[var(--border-color-line)] px-3 py-1.5 rounded-pill hover:bg-[var(--color-background-snow)] hover:border-[var(--primary-color-royal)] transition-colors text-sm font-medium shadow-sm',
    featured: 'bg-gradient-to-r from-[var(--primary-color-royal)] to-[var(--primary-color-royal-600)] text-[var(--color-white)] px-6 py-3 rounded-pill hover:from-[var(--primary-color-royal-600)] hover:to-[var(--primary-color-royal)] transition-all duration-200 font-semibold shadow-md transform hover:scale-105'
  };

  return (
    <button
      onClick={handleClick}
      className={`${variants[variant]} ${className} flex items-center space-x-2`}
      title={`Explore ${city.name}`}
    >
      <span>📍</span>
      <span>{city.name}</span>
      {showPostCount && city.post_count > 0 && (
        <span className={`
          ${variant === 'featured' 
            ? 'bg-[var(--color-white)] text-[var(--primary-color-royal)]' 
            : 'bg-[var(--primary-color-royal)] text-[var(--color-white)]'
          } px-2 py-0.5 rounded-full text-xs font-semibold
        `}>
          {city.post_count}
        </span>
      )}
    </button>
  );
};

export default CityButton;