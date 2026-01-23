import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import CountryButton from '../components/ui/CountryButton';
import postService from '../services/postService';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';

/**
 * Countries Page Component
 * Displays a list of all countries that have published posts
 * Referenced in breadcrumbs navigation
 * 
 * Features:
 * - Grid of CountryButton components
 * - Breadcrumb navigation
 * - Loading state
 */

const Countries = () => {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await postService.getCountriesWithPosts();
        setCountries(response.countries || []);
      } catch (error) {
        console.error('Error loading countries:', error);
        toast.error('Failed to load countries');
      } finally {
        setLoading(false);
      }
    };

    loadCountries();
  }, []);

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
              <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
                Countries
              </h1>
            </div>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto">
              Explore travel blogs from countries around the world
            </p>
          </div>

          {/* Countries Grid */}
          {loading ? (
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
  );
};

export default Countries;
