import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getFlagEmoji } from '../../utils/countryUtils';
import { Pin, Lock, MessageSquare, Eye } from 'lucide-react';

dayjs.extend(relativeTime); // relative time plugin for "fromNow" functionality

/**
 * ThreadCard Component:
 * Displays a thread preview card with title, author, category, and other fields
 * Used in Country Thread Page.

 */

const ThreadCard = ({ thread, showLocationBadge = false, showCategory = true }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(thread.absolute_url); // Navigate to thread detail page
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    navigate(`/profile/${thread.author_username}`);
  };

  const handleCategoryClick = (e) => {
    e.stopPropagation();
    navigate(`/threads?category=${thread.category_slug}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-[var(--color-border-sand)] rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-wrap gap-2">
          {/* Pinned Badge */}
          {thread.is_pinned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}

          {/* Locked Badge */}
          {thread.is_locked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}

          {/* Category Badge */}
          {showCategory && thread.category_name && (
            <span
              onClick={handleCategoryClick}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-background-cream)] text-[var(--text-color-ink)] hover:bg-[var(--color-background-sand)] transition-colors"
            >
              {thread.category_name}
              {thread.subcategory_name && ` • ${thread.subcategory_name}`}
            </span>
          )}

          {/* Location Badge */}
          {showLocationBadge && thread.country_code && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {getFlagEmoji(thread.country_code)} {thread.country_name}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2 font-editorial hover:text-[var(--primary-color-royal)] transition-colors">
        {thread.title}
      </h3>

      {/* Preview of the content */}
      <p className="text-[var(--text-color-ink-400)] mb-4 line-clamp-2">
        {thread.content}
      </p>

      {/* Footer Section*/}
      <div className="flex items-center justify-between text-sm text-[var(--text-color-ink-400)]">
        {/* Author Info: Profile image &username  */}
        <div className="flex items-center gap-3">
          {thread.author_profile_image ? (
            <img
              src={thread.author_profile_image}
              alt={thread.author_username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--color-background-sand)] flex items-center justify-center">
              <span className="text-sm font-semibold text-[var(--text-color-ink)]">
                {thread.author_username?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div>
            <button
              onClick={handleAuthorClick}
              className="font-medium text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] transition-colors"
            >
              {thread.author_username}
            </button>
            <span className="mx-1">•</span>
            <span>{dayjs(thread.created_at).fromNow()}</span>
          </div>
        </div>

        {/* Replies and views counts */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" /> {thread.reply_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {thread.view_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ThreadCard;
