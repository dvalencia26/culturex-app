import { useState, useEffect } from 'react';
import { countryService } from '../../services/countryService';

const CountrySelector = ({ selectedCountry, onCountryChange, errors }) => {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCountries = async () => {
      setLoading(true);
      const result = await countryService.getAllCountries();
      if (result.success) {
        setCountries(result.data);
      }
      setLoading(false);
    };

    loadCountries();
  }, []);

  return (
    <div>
      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
        Related Country (Optional)
      </label>
      <select
        id="country"
        value={selectedCountry}
        onChange={(e) => onCountryChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Not country-specific</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.name}
          </option>
        ))}
      </select>
      {loading && (
        <p className="text-sm text-gray-500 mt-1">Loading countries...</p>
      )}
      {errors.country && (
        <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
      )}
    </div>
  );
};

export default CountrySelector;