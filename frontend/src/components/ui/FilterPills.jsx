import { getFlagEmoji } from '../../utils/countryUtils';

/**
 * FilterPills Component
 * The component renders if there is least one active filter. It has a remove button.
 * It gets the current filters as props and calls back to parent
 */

const FilterPills = ({ filters = {}, onRemoveFilter, onClearAll }) => {
  const activeFilters = [];
  
  if (filters.country && filters.countryName) {
    activeFilters.push({
      type: 'country',
      label: filters.countryName,
      icon: getFlagEmoji(filters.country)
    });
  }
  
  if (filters.category && filters.categoryName) {
    activeFilters.push({
      type: 'category',
      label: filters.categoryName,
      icon: ''
    });
  }
  
  if (filters.subcategory && filters.subcategoryName) {
    activeFilters.push({
      type: 'subcategory',
      label: filters.subcategoryName,
      icon: ''
    });
  }

  // Do not render if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm font-medium text-[var(--text-color-ink-400)]">
        Active filters:
      </span>
      
      {/* Iterate over the active filters list */}
      {activeFilters.map((filter) => (
        <button
          key={filter.type}
          onClick={() => onRemoveFilter(filter.type)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--primary-color-royal)] text-white rounded-pill text-sm font-medium hover:bg-[var(--primary-color-royal-600)] transition-colors group"
        >
          <span>{filter.icon}</span>
          <span>{filter.label}</span>
          <span className="ml-1 text-xs font-bold leading-none">&times;</span>
        </button>
      ))}

      {/* Clear All Button */}
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-sm text-[var(--primary-color-royal)] hover:underline font-medium ml-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterPills;
