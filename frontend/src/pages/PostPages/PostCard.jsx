import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getFlagEmoji } from '../../utils/countryUtils';
import { MapPin, Flag, Globe, ChevronRight } from 'lucide-react';

/**
 * PostCard Component
 * 
 * Reusable component for displaying post preview
 * Used in: CountryPage, CityPage, GlobalPage, User Profile, Search Results
 * 
 * Props:
 * - post: Post object with all fields from PostSerializer
 * - showLocationBadge: boolean (default: true) - Show location badge
 */

const PostCard = ({ post, showLocationBadge = true }) => {
  const navigate = useNavigate();

  const handleReadMore = () => {
    navigate(`/profile/${post.author_username}/posts/${post.slug}`);
  };

  // Get location badge based on post scope
  const getLocationBadge = () => {
    if (!showLocationBadge) return null;

    if (post.location_scope === 'city' && post.city_name) {
      return (
        <span className="flex items-center gap-1 bg-[var(--color-gold)] text-[var(--color-white)] px-3 py-1 rounded-pill text-sm font-medium">
          <MapPin className="w-3.5 h-3.5" /> {post.city_name}
        </span>
      );
    }
    
    if (post.location_scope === 'country' && post.country_name) {
      const flagEmoji = post.country_code ? getFlagEmoji(post.country_code) : <Flag className="w-3.5 h-3.5" />;
      return (
        <span className="flex items-center gap-1 bg-[var(--primary-color-royal)] text-[var(--color-white)] px-3 py-1 rounded-pill text-sm font-medium">
          {flagEmoji} {post.country_name}
        </span>
      );
    }
    
    if (post.location_scope === 'none') {
      return (
        <span className="flex items-center gap-1 bg-[var(--secondary-color-orchid)] text-[var(--color-white)] px-3 py-1 rounded-pill text-sm font-medium">
          <Globe className="w-3.5 h-3.5" /> Global
        </span>
      );
    }

    return null;
  };

  return (
    <div className="bg-[var(--color-white)] rounded-card shadow-card p-6 hover:shadow-lg transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Author Avatar */}
          {post.author_profile_image ? (
            <img
              src={post.author_profile_image}
              alt={post.author_username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-[var(--primary-color-royal)] rounded-full flex items-center justify-center text-[var(--color-white)] font-semibold">
              {post.author_full_name?.[0]?.toUpperCase() || post.author_username?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          
          {/* Author Info */}
          <div>
            <h3 className="font-semibold text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] transition-colors cursor-pointer"
                onClick={() => navigate(`/profile/${post.author_username}`)}>
              @{post.author_username}
            </h3>
            <p className="text-sm text-[var(--text-color-ink-400)]">
              {dayjs(post.created_at).format('MMM D, YYYY')}
            </p>
          </div>
        </div>
        
        {/* Location Badge */}
        {getLocationBadge()}
      </div>

      {/* Post Content */}
      <div className="cursor-pointer" onClick={handleReadMore}>
        <h2 className="text-xl font-bold text-[var(--text-color-ink)] mb-3 font-editorial hover:text-[var(--primary-color-royal)] transition-colors">
          {post.title}
        </h2>
        <p className="text-[var(--text-color-ink-400)] leading-relaxed mb-4">
          {post.content.length > 300 
            ? `${post.content.substring(0, 300)}...` 
            : post.content
          }
        </p>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color-line)]">
        <button
          onClick={handleReadMore}
          className="text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
        >
          Read More <ChevronRight className="w-4 h-4 inline-block" />
        </button>
      </div>
    </div>
  );
};

export default PostCard;
