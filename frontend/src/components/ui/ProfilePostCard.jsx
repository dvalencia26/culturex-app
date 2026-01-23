import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * ProfilePostCard Component:
 * Post card with image, gradient overlay, title, and location.
 * Used in profile page post grid.
 */

const ProfilePostCard = ({ post }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/u/${post.author_username}/posts/${post.slug}`);
  };

  if (!post) return null;

  // Get thumbnail from API response
  const thumbnail = post.thumbnailUrl;
  const locationName = post.city_name || post.country_name;

  return (
    <button
      onClick={handleClick}
      className="relative aspect-[1/1] w-full overflow-hidden rounded-card bg-[var(--color-background-snow)] group focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:ring-offset-2"
    >
      {/* Post Image */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-background-snow)] to-[var(--border-color-line)]">
          <span className="text-[var(--text-color-ink-400)] text-sm">No image</span>
        </div>
      )}

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
        {/* Post Title */}
        <h3 className="text-white font-bold font-ui text-lg leading-tight mb-2 line-clamp-2">
          {post.title}
        </h3>

        {/* Location Pill */}
        {locationName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/20 backdrop-blur-sm">
            <MapPin className="w-3.5 h-3.5 text-[var(--color-gold)]" strokeWidth={2.5} />
            <span className="text-white text-xs font-medium">
              {locationName}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export default ProfilePostCard;
