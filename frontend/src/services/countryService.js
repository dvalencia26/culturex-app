import axiosInstance from '../utils/axiosInstance';
import { getFlagEmoji } from '../utils/countryUtils';

// To avoid constant API calls, the data can be cached in-memory
let countriesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const countryService = {
  /**
   * Gets all countries with caching
   * Used in the LocationSelector (Posts), CountrySelector (Threads) components
   */
  getAllCountries: async (forceRefresh = false) => {
    if (
      !forceRefresh && 
      countriesCache && 
      cacheTimestamp && 
      Date.now() - cacheTimestamp < CACHE_DURATION
    ) {
      return { success: true, data: countriesCache }; // Return cached data
    }

    try {
      const response = await axiosInstance.get('/auth/countries/');

      const countriesData = response.data.countries || [];
      
      // include flag emoji to each country
      const countriesWithFlags = countriesData.map(country => ({
        ...country,
        flag: getFlagEmoji(country.code)
      }));

      // Cache the result
      countriesCache = countriesWithFlags;
      cacheTimestamp = Date.now();

      return { success: true, data: countriesWithFlags };
    } catch (error) {
      console.error('Error fetching countries:', error);
      return {
        success: false,
        error: 'Failed to fetch countries',
        data: countriesCache || [] 
      };
    }
  },

  getCountryByCode: async (code) => {
    const result = await countryService.getAllCountries();
    if (result.success) {
      return result.data.find(c => c.code === code) || null;
    }
    return null;
  },

  clearCache: () => {
    countriesCache = null;
    cacheTimestamp = null;
  }
};

export default countryService;