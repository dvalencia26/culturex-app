import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CountryButton from '../components/ui/CountryButton';
import postService from '../services/postService';
import { toast } from 'sonner';
import banner from '../assets/banner.webp';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      {/* Hero Banner Section */}
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px] w-full overflow-hidden">
        {/* Banner Image */}
        <img 
          src={banner} 
          alt="Viewpoint in Rio de Janeiro, Brazil" 
          className="absolute inset-0 w-full h-full object-cover object-[center_50%]"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary-color-royal)] to-[var(--secondary-color-orchid)] opacity-50"></div>
        
        {/* Text on top of banner */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-white)] font-editorial tracking-wide mb-6 drop-shadow-lg">
            Explore Cultural Destinations
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-white)] max-w-2xl mx-auto leading-relaxed drop-shadow-md mb-8">
            Connect with people and cultures from around the world
          </p>
          
          {/* Buttons Container */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <button
              onClick={() => navigate('/global-posts')}
              className="px-8 py-4 bg-[var(--color-white)] text-[var(--primary-color-royal)] font-bold text-lg rounded-input shadow-card hover:shadow-lg hover:scale-105 transition-all duration-200 ease-[var(--ease-snappy)] min-w-[200px]"
            >
              Explore Blogs
            </button>
            <button
              onClick={() => navigate('/threads')}
              className="px-8 py-4 bg-[var(--primary-color-royal)] text-[var(--color-white)] font-bold text-lg rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] hover:shadow-lg hover:scale-105 transition-all duration-200 ease-[var(--ease-snappy)] min-w-[200px]"
            >
              Join Threads
            </button>
          </div>
        </div>
      </div>

      <div className="pb-16 px-4">
        {/* Countries with Posts Section */}
        <div className="mt-16 max-w-6xl mx-auto">
          
          {/* Global Posts Button */}
          <div className="text-center mb-8">
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