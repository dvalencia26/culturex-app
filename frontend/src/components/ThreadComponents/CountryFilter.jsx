import Loader from '../Loader';
import { getFlagEmoji } from '../../utils/countryUtils';

/*
 * CountryFilter Component: 
 * Shows top countries (Countries with most threads) based on popularCountries prop 
 */

const CountryFilter = ({ 
  selectedCountry = '', 
  onCountryChange,
  popularCountries: topCountries = [],
  loading = false
}) => {
  return (
    <div className="space-y-2">
      {/* All Countries button */}
      <button
        onClick={() => onCountryChange('')}
        className={`w-full text-left px-3 py-2 rounded-input transition-colors ${
          !selectedCountry
            ? 'bg-[var(--primary-color-royal)] text-white'
            : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
        }`}
      >
        All Countries
      </button>
      {/* Top Countries List */}
      { loading ? (
        <Loader 
        fullScreen={false}
        message="Loading Countries..." 
        size='small'
        overlay={false} />
      ) : (
        topCountries.map((country) => (
          <button
            key={country.code}
            onClick={() => onCountryChange(country.code)}
            className={`w-full text-left px-3 py-2 rounded-input transition-colors flex items-center gap-2 ${
              selectedCountry === country.code
              ? 'bg-[var(--primary-color-royal)] text-white'
              : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
          }`}
          >
            <span>{getFlagEmoji(country.code)}</span>
            <span>{country.name}</span>
          </button>
        ))
      )}
    </div>
  );
};

export default CountryFilter;
