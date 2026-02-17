import { useNavigate } from 'react-router-dom';
import { BadgeCheck } from 'lucide-react';

/**
 * UserCard Component:
 * Displays a user profile card with image, name, username, and social links.
 * Used in user search results grid.
 */

const UserCard = ({ user }) => {
  const navigate = useNavigate();

  if (!user) return null;

  const handleClick = () => {
    navigate(`/profile/${user.username}`);
  };

  const hasSocialLinks = user.instagram_url || user.twitter_url || user.facebook_url || user.tiktok_url;

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white rounded-card shadow-card p-6 hover:shadow-lg transition-all duration-200 ease-[var(--ease-snappy)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:ring-offset-2 text-center group"
    >
      {/* Profile Image */}
      <div className="flex justify-center mb-4">
        <div className="relative">
          {user.profile_image ? (
            <img
              src={user.profile_image}
              alt={user.full_name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border-2 border-[var(--border-color-line)] group-hover:border-[var(--primary-color-royal)] transition-colors"
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-gradient-to-br from-[var(--primary-color-royal)] to-[var(--secondary-color-orchid)] border-2 border-[var(--border-color-line)] group-hover:border-[var(--primary-color-royal)] flex items-center justify-center transition-colors">
              <span className="text-white text-4xl font-bold">
                {user.full_name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          {user.is_verified && (
            <div className="absolute -bottom-1 -right-1 bg-[var(--color-gold)] rounded-full p-1 border-2 border-white">
              <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-[var(--text-color-ink)] font-bold text-lg font-ui mb-1 truncate">
        {user.full_name}
      </h3>

      {/* Username */}
      <p className="text-[var(--primary-color-royal)] text-sm font-medium mb-4">
        @{user.username}
      </p>

      {/* Social Links */}
      {hasSocialLinks && (
        <div className="flex items-center justify-center gap-3">
          {user.facebook_url && (
            <a
              href={user.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
              aria-label="Facebook"
            >
              <svg className="w-4 h-4" fill="white">
                <use href="/sprite.svg#facebook" />
              </svg>
            </a>
          )}

          {user.twitter_url && (
            <a
              href={user.twitter_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-[var(--text-color-ink)] flex items-center justify-center hover:scale-110 transition-transform"
              aria-label="X (Twitter)"
            >
              <svg className="w-3.5 h-3.5" fill="white">
                <use href="/sprite.svg#x" />
              </svg>
            </a>
          )}

          {user.instagram_url && (
            <a
              href={user.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4" fill="white">
                <use href="/sprite.svg#instagram" />
              </svg>
            </a>
          )}

          {user.tiktok_url && (
            <a
              href={user.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
              aria-label="TikTok"
            >
              <svg className="w-3.5 h-3.5" fill="white">
                <use href="/sprite.svg#tiktok" />
              </svg>
            </a>
          )}
        </div>
      )}
    </button>
  );
};

export default UserCard;
