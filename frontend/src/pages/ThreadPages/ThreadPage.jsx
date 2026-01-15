import { useState, useEffect, use } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { ThreadFilters } from '../../components/ThreadComponents';
import FilterPills from '../../components/ui/FilterPills';
import ThreadCard from './ThreadCard';
import { threadService } from '../../services/threadService';
import Loader from '../../components/Loader';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';


const ThreadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Thread data state
  const [threads, setThreads] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filter options state
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Active filter state coming from the URL params
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('subcategory') || '');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false); // For delayed loader display
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Load popular countries (for CountryFilter)
  const [popularCountries, setPopularCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);


  useEffect(() => {
    const loadPopularCountries = async () => {
      setLoadingCountries(true);
      try {
        const result = await threadService.getPopularCountries(5);
        if (result.success) {
          setPopularCountries(result.data || []);
        } else {
          console.error('Error loading popular countries:', result.error);
        }
      } catch (error) {
        console.error('Error loading popular countries:', error);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadPopularCountries();
  }, []);

  //Load categories on mount 
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await threadService.getAllCategories();
        if (result.success) {
          setCategories(result.data || []);
        } else {
          console.error('Error loading categories:', result.error);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []); // run once on mount

  // Load subcategories when category changes
  useEffect(() => {
    const loadSubcategories = async () => {
      // Clear subcategories if no category selected
      if (!selectedCategory) {
        setSubcategories([]);
        return;
      }

      setLoadingSubcategories(true);
      try {
        const result = await threadService.getSubcategories(selectedCategory);
        if (result.success) {
          setSubcategories(result.data || []);
        } else {
          console.error('Error loading subcategories:', result.error);
          setSubcategories([]);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
        setSubcategories([]);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    loadSubcategories();
  }, [selectedCategory]); // Runs when selectedCategory changes

  // Load threads when any filter changes
  useEffect(() => {
    const loadThreads = async () => {
      setLoading(true);

      // Delay showing loader to prevent small black flash on quick loads
      const loaderTimer = setTimeout(() => {
        setShowLoading(true);
      }, 200); // 200ms delay

      try {
        // Build filter object for API call
        const filters = {
          limit: 50
        };
        // Add active filters
        if (selectedCountry) filters.country = selectedCountry.toUpperCase();
        if (selectedCategory) filters.category = selectedCategory;
        if (selectedSubcategory) filters.subcategory = selectedSubcategory;

        // Fetch threads from backend
        const result = await threadService.getAllThreads(filters);

        if (result.success) {
          setThreads(result.data.threads || []);
          setTotalCount(result.data.total_count || 0);
          setHasMore(result.data.has_more || false);
        } else {
          toast.error(result.error || 'Failed to load threads');
          setThreads([]);
          setTotalCount(0);
        }
      } catch (error) {
        console.error('Error loading threads:', error);
        toast.error('Failed to load threads');
        setThreads([]);
        setTotalCount(0);
      } finally {
        clearTimeout(loaderTimer);
        setLoading(false);
        setShowLoading(false);
      }
    };

    loadThreads();
  }, [selectedCountry, selectedCategory, selectedSubcategory]); // Runs when any filter changes

  //Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    
    // Add active filters to URL
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    
    // Update URL without triggering page reload
    setSearchParams(params, { replace: true });
  }, [selectedCountry, selectedCategory, selectedSubcategory, setSearchParams]);


  /**
   * Handle country filter change
   * @param {string} countryCode - ISO country code or empty string to clear
   */
  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  const handleCategoryChange = (categorySlug) => {
    setSelectedCategory(categorySlug);
    // Clear subcategory when category changes
    if (categorySlug !== selectedCategory) {
      setSelectedSubcategory('');
    }
  };

  const handleSubcategoryChange = (subcategoryId) => {
    setSelectedSubcategory(subcategoryId);
  };

  // Clear all active filters
  const handleClearFilters = () => {
    setSelectedCountry('');
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  // Remove individual filter (from FilterPills)
  const handleRemoveFilter = (filterType) => {
    switch (filterType) {
      case 'country':
        setSelectedCountry('');
        break;
      case 'category':
        setSelectedCategory('');
        setSelectedSubcategory(''); // Clear dependent filter
        break;
      case 'subcategory':
        setSelectedSubcategory('');
        break;
      default:
        break;
    }
  };

  // Go to thread page that cointains the form to create a new thread
  const handleCreateThread = () => {
    navigate('/create-thread');
  };


  const getActiveFilterData = () => {
    const filterData = {};

    if (selectedCountry) {
      const country = popularCountries.find(c => c.code === selectedCountry);
      filterData.country = selectedCountry;
      filterData.countryName = country ? country.name : selectedCountry;
    }

    if (selectedCategory) {
      const category = categories.find(c => c.slug === selectedCategory);
      filterData.category = selectedCategory;
      filterData.categoryName = category ? category.name : selectedCategory;
    }

    if (selectedSubcategory) {
      const subcategory = subcategories.find(s => s.id === parseInt(selectedSubcategory));
      filterData.subcategory = selectedSubcategory;
      filterData.subcategoryName = subcategory ? subcategory.name : selectedSubcategory;
    }

    return filterData;
  };


  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial mb-4">
              Discussion Threads
            </h1>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto">
              Join conversations about travel, culture, and experiences around the world.
            </p>
          </div>

          {/* Thread Button */}
          {user && (
            <div className="flex justify-end mb-6">
              <button
                onClick={handleCreateThread}
                className="flex items-center gap-2 bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
              >
                <MessageSquare className="w-5 h-5" /> Start a Discussion
              </button>
            </div>
          )}

          {/* Main Content: Sidebar + Thread List */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar with Filters */}
            <div className="lg:col-span-1">
              <ThreadFilters
                categories={categories}
                subcategories={subcategories}
                selectedCountry={selectedCountry}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                onCountryChange={handleCountryChange}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={handleSubcategoryChange}
                onClearFilters={handleClearFilters}
                popularCountries={popularCountries}
                loadingCountries={loadingCountries}
                loadingCategories={loadingCategories}
                loadingSubcategories={loadingSubcategories}
              />
            </div>

            {/* Thread List */}
            <div className="lg:col-span-3">
              
              {/* Active Filter Pills */}
              <FilterPills
                filters={getActiveFilterData()}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearFilters}
              />

              {/* Thread Count */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-[var(--text-color-ink)]">
                  {totalCount} {totalCount === 1 ? 'Discussion' : 'Discussions'}
                </h2>
              </div>

              {/* Loading State */}
              {showLoading && threads.length === 0 ? (
                <Loader message='Loading...' />
              
              ) : threads.length > 0 ? (
                /* Thread Cards */
                <div className="space-y-6">
                  {threads.map((thread) => (
                    <ThreadCard 
                      key={thread.id} 
                      thread={thread} 
                      showLocationBadge={!selectedCountry} // Hide country badge if filtering by country
                      showCategory={true}
                    />
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="text-center pt-6">
                      <button
                        onClick={() => {/* Pagination needs to be implemented */}}
                        className="bg-white border border-[var(--border-color-line)] text-[var(--text-color-ink)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--color-background-snow)] transition-colors"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12 bg-white rounded-card shadow-card">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                    No discussions found
                  </h3>
                  <p className="text-[var(--text-color-ink-400)] mb-8">
                    {(selectedCountry || selectedCategory || selectedSubcategory)
                      ? 'Try adjusting your filters to find more discussions.'
                      : 'Be the first to start a discussion!'}
                  </p>
                  
                  {(selectedCountry || selectedCategory || selectedSubcategory) ? (
                    <button
                      onClick={handleClearFilters}
                      className="text-[var(--primary-color-royal)] hover:underline font-semibold"
                    >
                      Clear Filters
                    </button>
                  ) : user ? (
                    <button
                      onClick={handleCreateThread}
                      className="bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
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
      </div>
    </div>
  );
};

export default ThreadPage;
