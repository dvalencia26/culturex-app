import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import postService from '../../services/postService';
import { toast } from 'sonner';
import PostCard from './PostCard';
import { formatCityName, decodeSlug, normalizeSlug } from '../../utils/countryUtils';

/**
 * CityPage Component
 * 
 * Displays city-specific posts with comprehensive breadcrumb navigation
 * URL: /countries/{country-code}/{city-slug}
 * 
 * Features:
 * - Breadcrumb navigation: Home → Country → City
 * - City-specific posts only
 * - Navigation back to country or home
 * - Uses proper API calls for city posts
 * - Gets country/city names from API response
 */

const CityPage = () => {
  const { countryCode, citySlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [cityName, setCityName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [loading, setLoading] = useState(false);

  // Load city posts
  useEffect(() => {
    const loadCityPosts = async () => {
      if (!countryCode || !citySlug) return;
      
      setLoading(true);
      
      try {
        // Decode and normalize the citySlug to match backend storage
        // são-paulo to sao-paulo (backend format)
        const decodedCitySlug = decodeSlug(citySlug);
        const normalizedSlug = normalizeSlug(decodedCitySlug);
        
        // Use the proper city-specific API call
        const response = await postService.getPostsByCountry(countryCode.toUpperCase(), {
          citySlug: normalizedSlug,
          includeRelated: false, // Only city-specific posts
          limit: 50
        });

        if (response.success) {
          const posts = response.data.posts || [];
          setPosts(posts);
          
          // Extract city and country names from the API response
          const firstPost = posts[0];
          if (firstPost) {
            // Use the API-provided names (from PostSerializer)
            setCityName(firstPost.city_name || formatCityName(citySlug));
            setCountryName(firstPost.country_name || countryCode.toUpperCase());
          } else {
            // Fallback: try to get city name from getCitiesByCountry API
            try {
              const citiesResponse = await postService.getCitiesByCountry(countryCode.toUpperCase(), {
                limit: 100 // Get more cities to find the matching slug
              });
              
              const matchingCity = citiesResponse.cities?.find(city => 
                city.slug === citySlug || city.name.toLowerCase().replace(/\s+/g, '-') === citySlug
              );
              
              if (matchingCity) {
                setCityName(matchingCity.name);
                // Try to get country name from countries API
                try {
                  const countriesResponse = await postService.getCountriesWithPosts();
                  const matchingCountry = countriesResponse.countries?.find(country => 
                    country.code.toLowerCase() === countryCode.toLowerCase()
                  );
                  setCountryName(matchingCountry?.name || countryCode.toUpperCase());
                } catch (error) {
                  setCountryName(countryCode.toUpperCase());
                }
              } else {
                setCityName(formatCityName(citySlug));
                setCountryName(countryCode.toUpperCase());
              }
            } catch (error) {
              // Final fallback
              setCityName(formatCityName(citySlug));
              setCountryName(countryCode.toUpperCase());
            }
          }
        } else {
          toast.error(response.error || 'Failed to load posts');
          // Set fallback names on error
          setCityName(formatCityName(citySlug));
          setCountryName(countryCode.toUpperCase());
        }

      } catch (error) {
        console.error('Error loading city posts:', error);
        toast.error('Failed to load city posts');
        // Set fallback names
        setCityName(formatCityName(citySlug));
        setCountryName(countryCode.toUpperCase());
      } finally {
        setLoading(false);
      }
    };

    loadCityPosts();
  }, [countryCode, citySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumbs */}
            <div className="mb-6">
              <Breadcrumbs />
            </div>
            
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Breadcrumbs - Automatically shows: Home → Country → City */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <span className="text-4xl">📍</span>
              <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
                {cityName}
              </h1>
            </div>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto mb-4">
              Discover local experiences and hidden gems in {cityName}, {countryName}
            </p>
            
            {/* Navigation Options */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate(`/countries/${countryCode}`)}
                className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
              >
                ← Back to {countryName}
              </button>
              <span className="text-[var(--text-color-ink-400)]">|</span>
              <button
                onClick={() => navigate('/')}
                className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
              >
                All Countries
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-[var(--text-color-ink-400)]">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'} about {cityName}
                </p>
              </div>

              {posts.map((post) => (
                <PostCard key={post.id} post={post} showLocationBadge={true} />
              ))}
            </div>
          ) : (
            /* No Posts Found */
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                No posts about {cityName} yet
              </h3>
              <p className="text-[var(--text-color-ink-400)] mb-8">
                Be the first to share your experience about {cityName}!
              </p>
              
              {user && (
                <button
                  onClick={() => navigate('/')}
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
                >
                  Create a Post
                </button>
              )}
              
              <div className="mt-6">
                <button
                  onClick={() => navigate(`/countries/${countryCode}`)}
                  className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
                >
                  ← Explore other cities in {countryName}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityPage;
