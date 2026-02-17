import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CountryPreviewCard from '../components/ui/CountryPreviewCard';
import JoinCommunity from '../components/ui/JoinCommunity';
import Footer from '../components/ui/Footer';
import LatestPosts from '../components/LatestPosts';
//import CountryButton from '../components/ui/CountryButton';
import postService from '../services/postService';
import { toast } from 'sonner';
import banner from '../assets/banner.webp';
import { Users } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countryPreviews, setCountryPreviews] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Load countries with preview posts
  useEffect(() => {
    const loadCountryPreviews = async () => {
      setLoadingCountries(true);
      try {
        const response = await postService.getCountryPreviews(4);
        setCountryPreviews(response.countries || []);
      } catch (error) {
        console.error('Error loading country previews:', error);
        toast.error('Failed to load countries');
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountryPreviews();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      {/* Hero Banner Section */}
      <div className="relative h-[300px] md:h-[380px] lg:h-[450px] w-full overflow-hidden">
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-white)] font-editorial tracking-wide mb-4 drop-shadow-lg">
             Every route has a story
          </h1>
          <p className="text-base md:text-lg text-[var(--color-white)] max-w-2xl mx-auto leading-relaxed drop-shadow-md mb-6">
            Join a community of people documenting their travel experiences.
          </p>
          
          {/* Buttons Container */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            <button
              onClick={() => navigate('/global-posts')}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-[var(--color-white)] text-[var(--primary-color-royal)] font-bold text-base sm:text-lg rounded-input shadow-card hover:shadow-lg hover:scale-105 transition-all duration-200 ease-[var(--ease-snappy)] min-w-[160px] sm:min-w-[200px]"
            >
              Explore Blogs
            </button>
            <button
              onClick={() => navigate('/threads')}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-[var(--primary-color-royal)] text-[var(--color-white)] font-bold text-base sm:text-lg rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] hover:shadow-lg hover:scale-105 transition-all duration-200 ease-[var(--ease-snappy)] min-w-[160px] sm:min-w-[200px]"
            >
              Read Discussions
            </button>
          </div>
        </div>
      </div>

      <div className="pb-16 px-4">
        {/* Countries with Posts Section */}
        <div className="mt-16 max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="text-left mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] font-editorial mb-2">
              Trending Destinations
            </h2>
          </div>
          
          {loadingCountries ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : countryPreviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {countryPreviews.map((country) => (
                <CountryPreviewCard
                  key={country.countryCode}
                  countryCode={country.countryCode}
                  countryName={country.countryName}
                  previewPosts={country.previewPosts}
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

      {/* What is Our Routes Section */}
      <div className="bg-[var(--color-ivory)] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            {/* Question - Left Side */}
            <div className="lg:w-1/3 flex items-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] text-center font-editorial">
                What is Our Routes?
              </h2>
            </div>
            
            {/* Paragraph - Right Side */}
            <div className="lg:w-2/3">
              <p className="text-[var(--text-color-ink)] leading-relaxed mb-4 font-ui">
                Our Routes is a shared travel platform where people post their travels and experiences—like an Instagram-inspired space, but with the feeling of an open journal. It was created from the realization that every person holds a story, whether from their own life or from what they've learned through family and culture, and too many of those stories get lost simply because we don't know each other.
              </p>
              <p className="text-[var(--text-color-ink)] leading-relaxed">
                Our Routes gives you a place to save your experiences through travel stories and reflections, while also sharing practical tips, recommendations, and threads where questions and ideas can live openly. The goal is to help people connect with other travelers and cultures so they feel inspired, curious, and safe to explore more—because every route has a story worth sharing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Posts Section */}
      <LatestPosts />

      {/* Explore Profiles Section */}
      <div className="bg-[var(--color-ivory)] py-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-[var(--primary-color-royal)]/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-[var(--primary-color-royal)]" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] font-editorial mb-2">
              Find Travelers Like You 
            </h2>
            <p className="text-[var(--text-color-ink-400)] max-w-xl mb-4 md:mb-0">
              Connect with travelers from around the world.
            </p>
          </div>
          <button
            onClick={() => navigate('/people')}
            className="flex-shrink-0 px-8 py-3 bg-[var(--primary-color-royal)] text-white font-bold rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] hover:shadow-lg hover:scale-105 transition-all duration-200 ease-[var(--ease-snappy)]"
          >
            Explore Profiles
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Home