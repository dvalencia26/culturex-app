import { useState, useEffect } from 'react';
import postService from '../../services/postService';
import SearchDropdown from '../ui/SearchDropdown';
import SimpleDropdown from '../ui/SimpleDropdown';
import { normalizeSlug } from '../../utils/countryUtils';

/*
LocationSelector Component manage all location state and API interactions.
Makes the api calls to load countries and cities based on location scope.
Handles debounced search for cities.
Clears selections appropriately when location scope or country changes.
Uses SearchDropdown for searchable country and city selection.
And, simple dropdown for country selection when location scope is 'country'.
*/ 

const LocationSelector = ({ 
  locationScope, 
  selectedCountry, 
  selectedCity, 
  onCountryChange, 
  onCityChange,
  errors 
}) => {
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [citySearchTerm, setCitySearchTerm] = useState('');

  // Load countries when location scope changes
  useEffect(() => {
    const loadCountries = async () => {
      if (locationScope === 'country' || locationScope === 'city') {
        setLoadingCountries(true);
        try {
          const response = await postService.getCountriesForPosts(locationScope);
          setCountries(response.countries || []);
        } catch (error) {
          console.error('Error loading countries:', error);
          setCountries([]);
        } finally {
          setLoadingCountries(false);
        }
      } else {
        setCountries([]);
      }
    };

    loadCountries();
  }, [locationScope]); 

  // Load cities when country or search changes (for city scope only)
  useEffect(() => {
    const loadCities = async () => {
      if (locationScope === 'city' && selectedCountry) {
        setLoadingCities(true);
        try {
          const response = await postService.getCitiesByCountry(selectedCountry, {
            search: citySearchTerm,
            limit: 100
          });
          setCities(response.cities || []);
        } catch (error) {
          console.error('Error loading cities:', error);
          setCities([]);
        } finally {
          setLoadingCities(false);
        }
      } else if (locationScope !== 'city') {
        setCities([]);
      }
    };

    // Debounce search only if there's a search term, otherwise load immediately
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const delay = citySearchTerm.length > 0 ? 500 : 0; // No delay for initial load
    const timeout = setTimeout(() => {
      loadCities();
    }, delay); 
    
    setSearchTimeout(timeout);
    
    return () => clearTimeout(timeout);
  }, [locationScope, selectedCountry, citySearchTerm]); // Load cities when country or search term changes

  // Clear selections when location scope changes
  useEffect(() => {
    if (locationScope === 'none') {
      onCountryChange('');
      onCityChange('');
      setCitySearchTerm('');
    } else if (locationScope === 'country') {
      onCityChange('');
      setCitySearchTerm('');
    }
  }, [locationScope, onCountryChange, onCityChange]);

  // Reset city search when country changes to trigger initial load of new cities
  useEffect(() => {
    if (locationScope === 'city' && selectedCountry) {
      setCitySearchTerm(''); // Reset search term to trigger initial load
      setCities([]); // Clear cities when country changes
    }
  }, [selectedCountry, locationScope]);

  // Handle city search term changes (for debounced API calls)
  // Normalizes search to remove accents for better matching
  const handleCitySearch = (searchTerm) => {
    const normalizedSearch = normalizeSlug(searchTerm);
    setCitySearchTerm(normalizedSearch);
  };

  // Don't render anything if location scope is 'none'
  if (locationScope === 'none') {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Country Selector */}
      {(locationScope === 'country' || locationScope === 'city') && (
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country *
          </label>
          
          {/* Searchable dropdown for country-specific posts */}
          {locationScope === 'country' ? (
            <SearchDropdown
              options={countries}
              value={selectedCountry}
              onSelect={(value) => onCountryChange(value)}
              placeholder="Search for a country..."
              error={!!errors?.primary_country}
              getOptionLabel={(country) => country.name}
              getOptionValue={(country) => country.code}
              emptyMessage="No countries found"
              loadingMessage="Loading countries..."
            />
          ) : (
            /* Simple dropdown for city-specific posts (only 5 countries) */
            <SimpleDropdown
              options={countries}
              value={selectedCountry}
              onSelect={(value) => onCountryChange(value)}
              placeholder="Select a country"
              loading={loadingCountries}
              error={!!errors?.primary_country}
              getOptionLabel={(country) => country.name}
              getOptionValue={(country) => country.code}
              loadingMessage="Loading countries..."
            />
          )}
          
          {errors?.primary_country && (
            <p className="mt-1 text-sm text-red-600">{errors.primary_country.message}</p>
          )}
        </div>
      )}

      {/* City Selector */}
      {locationScope === 'city' && (
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <SearchDropdown
            key={`city-${selectedCountry}`} // Force reset when country changes
            options={cities}
            value={selectedCity}
            onSelect={(value, option) => {
              onCityChange(value);
            }}
            // Handle search term changes by just passing to debounced handler
            onSearchChange={(searchTerm) => {
              handleCitySearch(searchTerm);
            }}
            placeholder="Search for a city..."
            disabled={!selectedCountry}
            error={!!errors?.primary_city}
            getOptionLabel={(city) => city.name}
            getOptionValue={(city) => city.id}
            emptyMessage="No cities found"
            loadingMessage="Loading cities..."
          />
          
          {errors?.primary_city && (
            <p className="mt-1 text-sm text-red-600">{errors.primary_city.message}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSelector;