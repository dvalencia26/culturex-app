import { useNavigate } from 'react-router-dom';
import { getFlagEmoji } from '../../utils/countryUtils';

/**
 * CountryPreviewCard Component: 
 * Displays a country with its flag, name, and a grid of post thumbnails.
 * Grid adjusts dynamically: 1 image = full width, 2 = 2 columns, 3-4 = 2x2 grid
 * previewPosts: Array - Posts with thumbnailUrl, slug, author_username
 */

const CountryPreviewCard = ({ countryCode, countryName, previewPosts = [] }) => {
  const navigate = useNavigate();

  // Handle click on country header
  const handleCountryClick = () => {
    navigate(`/countries/${countryCode.toLowerCase()}`);
  };

  // Handle click on a post thumbnail
  const handlePostClick = (post, e) => {
    e.stopPropagation();
    navigate(`/u/${post.author_username}/posts/${post.slug}`, {
      state: {
        countryCode,
        countryName,
        locationScope: 'country'
      }
    });
  };

  if (!countryCode || !countryName) {
    return null;
  }

  // Filter to only posts with thumbnails
  const postsWithImages = previewPosts.filter(post => post.thumbnailUrl);
  
  // If no images, don't render the card
  if (postsWithImages.length === 0) {
    return null;
  }

  // Determine grid layout based on number of images
  const getGridClasses = () => {
    switch (postsWithImages.length) {
      case 1:
        return 'grid-cols-1'; // Full width single image
      case 2:
        return 'grid-cols-2'; // Two columns
      default:
        return 'grid-cols-2'; // 2x2 grid for 3-4 images
    }
  };

  return (
    <div className="bg-[var(--color-white)] rounded-card shadow-card overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Country Header*/}
      <button
        onClick={handleCountryClick}
        className="w-full flex items-center justify-center gap-3 py-5 px-4 bg-[var(--color-cool)] hover:bg-[var(--border-color-line)] transition-colors duration-200"
      >
        {/* Flag */}
        <span className="text-4xl sm:text-5xl">
          {getFlagEmoji(countryCode)}
        </span>
        
        {/* Country Name */}
        <span className="text-[var(--text-color-ink)] font-bold font-ui text-xl sm:text-2xl tracking-tight">
          {countryName}
        </span>
      </button>

      {/* Thumbnail Grid */}
      <div className={`grid ${getGridClasses()} ${postsWithImages.length > 1 ? 'gap-2 p-2' : ''}`}>
        {postsWithImages.map((post) => (
          <button
            key={post.id}
            onClick={(e) => handlePostClick(post, e)}
            className={`${
              postsWithImages.length === 1 ? 'aspect-video' : 'aspect-square'
            } bg-[var(--color-background-snow)] relative overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--primary-color-royal)]`}
          >
            <img
              src={post.thumbnailUrl}
              alt={post.title || 'Post thumbnail'}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default CountryPreviewCard;
