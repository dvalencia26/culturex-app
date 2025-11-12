import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PostForm } from '../components/PostForm';
import CountryButton from '../components/ui/CountryButton';
import postService from '../services/postService';
import { toast } from 'sonner';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPostForm, setShowPostForm] = useState(false);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Load countries with posts
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await postService.getCountriesWithPosts();
        setCountries(response.countries || []);
      } catch (error) {
        console.error('Error loading countries:', error);
        toast.error('Failed to load countries');
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  const handlePostSuccess = (post) => {
    console.log('Post created successfully:', post);
    toast.success('Post created successfully!');
    setShowPostForm(false); // Hide form after successful creation
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <h1 className="text-4xl font-bold text-center mb-6 text-[var(--primary-color-royal)] font-editorial tracking-wide">
          Explore Cultural Destinations
        </h1>
        <p className="mt-4 text-lg text-[var(--text-color-ink-400)] text-center max-w-2xl mx-auto leading-relaxed">
          Connect with people and cultures from around the world
        </p>

        {/* Show Create Post Section for Logged-in Users */}
        {user && (
          <div className="mt-12 max-w-4xl mx-auto">
            {!showPostForm ? (
              /* Create Post Button */
              <div className="text-center mb-8">
                <button
                  onClick={() => setShowPostForm(true)}
                  className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-8 py-3 rounded-input text-lg font-semibold hover:bg-[var(--primary-color-royal-600)] shadow-card transition-all duration-200 ease-[var(--ease-snappy)]"
                >
                  Share Your Travel Experience
                </button>
                <p className="mt-2 text-sm text-[var(--text-color-ink-400)]">
                  Create a post about your recent Travel adventures!
                </p>
              </div>
            ) : (
              /* Post Form */
              <div className="bg-[var(--color-white)] rounded-lg shadow-card p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-[var(--primary-color-royal)] font-editorial">
                    Create New Post
                  </h2>
                  <button
                    onClick={() => setShowPostForm(false)}
                    className="text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors"
                    aria-label="Close form"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <PostForm onSuccess={handlePostSuccess} showTitle={false} />
              </div>
            )}
          </div>
        )}

        {/* Countries with Posts Section */}
        <div className="mt-16 max-w-6xl mx-auto">
          
          {/* Global Posts Button */}
          <div className="text-center mb-8">
            <button
              onClick={() => navigate('/global-posts')}
              className="bg-[var(--secondary-color-orchid)] text-[var(--color-white)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--secondary-color-orchid-600)] transition-colors shadow-card"
            >
              🌍 View Global Posts
            </button>
          </div>
          
          {loadingCountries ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : countries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {countries.map((country) => (
                <CountryButton
                  key={country.code}
                  countryCode={country.code}
                  countryName={country.name}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[var(--text-color-ink-400)]">
                No countries with posts available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home