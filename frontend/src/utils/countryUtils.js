// Country Utilities: Handles country related operations
// with memoization for performance optimization
const flagEmojiCache = new Map();

/**
 * Get flag emoji for a given country code
 * 
 * @example
 * getFlagEmoji('US') // Returns '🇺🇸'
 * getFlagEmoji('invalid') // Returns '🌍'
 */
export const getFlagEmoji = (countryCode) => {
  // Validate input
  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) {
    return '🌍'; // Default globe emoji
  }

  // Normalize to uppercase for consistent caching
  const normalizedCode = countryCode.toUpperCase();

  // Check cache first
  if (flagEmojiCache.has(normalizedCode)) {
    return flagEmojiCache.get(normalizedCode);
  }

  // Regional indicator symbols are Unicode characters that combine to form flags
  // Each letter is offset by 127397 from its ASCII value
  const codePoints = normalizedCode
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  
  const flagEmoji = String.fromCodePoint(...codePoints);

  // Cache the result
  flagEmojiCache.set(normalizedCode, flagEmoji);

  return flagEmoji;
};

/**
 * Format city slug to display name
 * Converts 'sao-paulo' to 'Sao Paulo'
 * 
 * @param {string} slug - City slug (e.g., 'sao-paulo', 'new-york')
 * @returns {string} Formatted city name
 */
export const formatCityName = (slug) => {
  if (!slug) return '';
  
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Clear the flag emoji cache
 */
export const clearFlagCache = () => {
  flagEmojiCache.clear();
};

/**
 * Get the current size of the flag emoji cache
 */
export const getFlagCacheSize = () => {
  return flagEmojiCache.size;
};
