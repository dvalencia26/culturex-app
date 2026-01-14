import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { threadService } from '../../services/threadService';
import { toast } from 'sonner';
import ThreadCard from './ThreadCard';
import { getFlagEmoji } from '../../utils/countryUtils';
import { MessageSquare } from 'lucide-react';

/**
 * CountryThreadPage Component: 
 * Displays threads related to a specific country with category filtering
 * URL: /countries/{country-code}/threads
 * Breadcrumb navigation: Home → Country → Threads
 */

const CountryThreadPage = () => {
  const { countryCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [threads, setThreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [countryName, setCountryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await threadService.getAllCategories();
        if (result.success) {
          setCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Load threads for country
  useEffect(() => {
    const loadThreads = async () => {
      if (!countryCode) return;
      
      setLoading(true);
      
      try {
        const filters = {
          limit: 50
        };

        // Add category filter if selected
        if (selectedCategory !== 'all') {
          filters.category = selectedCategory;
        }

        const result = await threadService.getThreadsByCountry(countryCode.toUpperCase(), filters);

        if (result.success) {
          setThreads(result.data.threads || []);
          setTotalCount(result.data.total_count || 0);
          setHasMore(result.data.has_more || false);
          
          // Extract country name from first thread
          const firstThread = result.data.threads?.[0];
          if (firstThread?.country_name) {
            setCountryName(firstThread.country_name);
          } else {
            // Fallback to country code in case no threads found
            setCountryName(countryCode.toUpperCase());
          }
        } else {
          toast.error(result.error || 'Failed to load threads');
          setCountryName(countryCode.toUpperCase());
        }

      } catch (error) {
        console.error('Error loading threads:', error);
        toast.error('Failed to load threads');
        setCountryName(countryCode.toUpperCase());
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, [countryCode, selectedCategory]);

  const handleCategoryChange = (categorySlug) => {
    setSelectedCategory(categorySlug);
  };

  const handleCreateThread = () => {
    // Navigate to thread creation form with pre-selected country
    navigate(`/threads/new?country=${countryCode.toUpperCase()}`);
  };

  if (loading && threads.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
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
                {countryName} Discussions
              </h1>
            </div>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto">
              Join the conversation. Create your own discussion threads!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate(`/countries/${countryCode}`)}
              className="text-[var(--primary-color-royal)] hover:underline font-medium"
            >
              ← Back to {countryName}
            </button>

            {user && (
              <button
                onClick={handleCreateThread}
                className="flex items-center gap-2 bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
              >
                <MessageSquare className="w-5 h-5" /> Start a Discussion
              </button>
            )}
          </div>

          {/* Category Filter */}
          {!loadingCategories && categories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[var(--text-color-ink)] mb-4">
                Filter by Category
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-5 py-2.5 rounded-pill font-medium transition-all duration-200 ${
                    selectedCategory === 'all'
                      ? 'bg-[var(--primary-color-royal)] text-white shadow-md hover:bg-[var(--primary-color-royal-600)]'
                      : 'bg-white text-[var(--text-color-ink)] border-2 border-[var(--border-color-line)] hover:border-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal)]'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`px-5 py-2.5 rounded-pill font-medium transition-all duration-200 ${
                      selectedCategory === category.slug
                        ? 'bg-[var(--primary-color-royal)] text-white shadow-md hover:bg-[var(--primary-color-royal-600)]'
                        : 'bg-white text-[var(--text-color-ink)] border-2 border-[var(--border-color-line)] hover:border-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal)]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Threads */}
          {threads.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-[var(--text-color-ink-400)]">
                  {totalCount} {totalCount === 1 ? 'discussion' : 'discussions'} about {countryName}
                  {selectedCategory !== 'all' && ` in ${categories.find(c => c.slug === selectedCategory)?.name}`}
                </p>
              </div>

              {threads.map((thread) => (
                <ThreadCard 
                  key={thread.id} 
                  thread={thread} 
                  showLocationBadge={false}
                  showCategory={true}
                />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={() => {/* Implement pagination */}}
                    className="bg-white border border-[var(--color-border-sand)] text-[var(--text-color-ink)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--color-background-cream)] transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* No Threads Found Empty State*/
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <MessageSquare className="w-16 h-16 text-[var(--text-color-ink-400)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                No discussions about {countryName} yet
                {selectedCategory !== 'all' && ` in ${categories.find(c => c.slug === selectedCategory)?.name}`}
              </h3>
              <p className="text-[var(--text-color-ink-400)] mb-8">
                Be the first to start a conversation about {countryName}!
              </p>
              
              {user ? (
                <button
                  onClick={handleCreateThread}
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
                >
                  Start a Discussion
                </button>
              ) : (
                <p className="text-[var(--text-color-ink-400)]">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-[var(--primary-color-royal)] hover:underline"
                  >
                    Log in
                  </button>
                  {' '}to start a discussion
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryThreadPage;
