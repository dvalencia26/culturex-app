import { useNavigate } from 'react-router-dom';
import { getFlagEmoji } from '../../utils/countryUtils';

/**
 * ThreadProfileCard Component:
 * Compact card for displaying threads on profile page.
 * Shows title, category, country
 */

const ThreadProfileCard = ({ thread }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/u/${thread.author_username}/threads/${thread.slug}`);
  };

  if (!thread) return null;

  return (
    <button
      onClick={handleClick}
      className="w-full bg-white rounded-card shadow-card hover:shadow-lg transition-all duration-200 p-4 text-left group border border-[var(--border-color-line)] hover:border-[var(--primary-color-royal)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] focus:ring-offset-2"
    >
      {/* Thread Title */}
      <h3 className="text-[var(--text-color-ink)] font-bold font-ui text-lg leading-tight mb-3 line-clamp-2 group-hover:text-[var(--primary-color-royal)] transition-colors">
        {thread.title}
      </h3>

      {/* Metadata Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Category Badge */}
        {thread.category_name && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-[var(--primary-color-royal)]/10">
            <span className="text-[var(--primary-color-royal)] text-xs font-semibold">
              {thread.category_name}
            </span>
          </div>
        )}

        {/* Country Badge */}
        {thread.country_code && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-[var(--border-color-line)]">
            <span className="text-[var(--text-color-ink)] text-xs font-medium">
              {getFlagEmoji(thread.country_code)} {thread.country_name}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export default ThreadProfileCard;
