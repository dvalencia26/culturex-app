import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import CityButton from '../../components/ui/CityButton';
import postService from '../../services/postService';
import { threadService } from '../../services/threadService';
import { toast } from 'sonner';
import PostCard from './PostCard';
import { getFlagEmoji } from '../../utils/countryUtils';

/**
 * CountryPage Component
 * 
 * Displays country-specific posts and city buttons for further navigation
 * URL: /countries/{country-code}
 * 
 * Features:
 * - Breadcrumb navigation: Home → Country
 * - City buttons for further navigation
 * - Country posts with optional related city posts
 */

const CountryPage = () => {
  const { countryCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [posts, setPosts] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryName, setCountryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [threadCount, setThreadCount] = useState(0);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Load country data
  useEffect(() => {
    const loadCountryData = async () => {
      if (!countryCode) return;
      
      setLoading(true);
      setLoadingCities(true);
      
      try {
        // Load country posts (with related city posts)
        const postsResponse = await postService.getPostsByCountry(countryCode.toUpperCase(), { 
          includeRelated: true,
          limit: 50 
        });

        if (postsResponse.success) {
          setPosts(postsResponse.data.posts || []);
          
          // Extract country name from API response (PostSerializer provides country_name)
          const firstPost = postsResponse.data.posts?.[0];
          if (firstPost?.country_name) {
            setCountryName(firstPost.country_name);
          } else {
            // Fallback: try to get country name from countries API
            try {
              const countriesResponse = await postService.getCountriesWithPosts();
              const matchingCountry = countriesResponse.countries?.find(country => 
                country.code.toLowerCase() === countryCode.toLowerCase()
              );
              setCountryName(matchingCountry?.name || countryCode.toUpperCase());
            } catch (error) {
              setCountryName(countryCode.toUpperCase());
            }
          }
        } else {
          toast.error(postsResponse.error || 'Failed to load posts');
          // Fallback country name
          try {
            const countriesResponse = await postService.getCountriesWithPosts();
            const matchingCountry = countriesResponse.countries?.find(country => 
              country.code.toLowerCase() === countryCode.toLowerCase()
            );
            setCountryName(matchingCountry?.name || countryCode.toUpperCase());
          } catch (error) {
            setCountryName(countryCode.toUpperCase());
          }
        }

        // Load cities with posts in this country
        try {
          const citiesResponse = await postService.getCitiesWithPostsByCountry(countryCode.toUpperCase());
          setCities(citiesResponse.cities || []);
        } catch (error) {
          console.error('Error loading cities:', error);
        }

      } catch (error) {
        console.error('Error loading country data:', error);
        toast.error('Failed to load country data');
        setCountryName(getCountryName(countryCode));
      } finally {
        setLoading(false);
        setLoadingCities(false);
      }
    };

    loadCountryData();
  }, [countryCode]);

  // Check if there are threads for this country
  useEffect(() => {
    const checkThreads = async () => {
      if (!countryCode) return;
      
      setLoadingThreads(true);
      try {
        const result = await threadService.getThreadsByCountry(countryCode.toUpperCase(), { 
          limit: 1 
        });
        
        if (result.success) {
          setThreadCount(result.data.total_count || 0);
        }
      } catch (error) {
        console.error('Error checking threads:', error);
      } finally {
        setLoadingThreads(false);
      }
    };

    checkThreads();
  }, [countryCode]);

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
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <span className="text-5xl">{getFlagEmoji(countryCode)}</span>
              <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
                {countryName}
              </h1>
            </div>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto">
              Explore travel experiences and cultural insights from {countryName}
            </p>
          </div>

          {/* Thread Navigation Buttons */}
          {!loadingThreads && (
            <div className="mb-8">
              {threadCount > 0 ? (
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => navigate(`/countries/${countryCode}/threads`)}
                    className="bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors flex items-center gap-2"
                  >
                    Go to Discussions ({threadCount})
                  </button>
                </div>
              ) : (
                <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-xl transition-shadow max-w-2xl mx-auto text-center">
                  <p className="text-[var(--text-color-ink-400)] mb-4">
                    Be the first to start a discussion!
                  </p>
                  <button
                    onClick={() => navigate('/create-thread')}
                    className="bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
                  >
                    Create a Discussion
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cities with Posts */}
          {cities.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-[var(--text-color-ink)] mb-4 text-center">
                Explore Cities in {countryName}
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {cities.map((city) => (
                  <CityButton
                    key={city.id}
                    city={city}
                    countryCode={countryCode}
                    variant="default"
                    showPostCount={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-[var(--text-color-ink-400)]">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'} about {countryName}
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
                No posts about {countryName} yet
              </h3>
              <p className="text-[var(--text-color-ink-400)] mb-8">
                Be the first to share your experience about {countryName}!
              </p>
              
              {user && (
                <button
                  onClick={() => navigate('/')}
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
                >
                  Create a Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryPage;
