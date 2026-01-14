import Loader from '../Loader';
/**
 * CategoryFilter Component:
 * Allows users to filter threads by selecting a category from the list fetched from the backend.
 */

const CategoryFilter = ({ 
  categories = [], 
  selectedCategory = '', 
  onCategoryChange,
  loading = false
}) => {
  if (loading) {
    return (
      <Loader 
      fullScreen={false}
      message="Loading Categories..."
      size='small'
      overlay={false}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* All Categories button*/}
      <button
        onClick={() => onCategoryChange('')}
        className={`w-full text-left px-3 py-2 rounded-input transition-colors ${
          !selectedCategory
            ? 'bg-[var(--primary-color-royal)] text-white'
            : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
        }`}
      >
        All Categories
      </button>

      {/* Displays categories List with backend data */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.slug)}
          className={`w-full text-left px-3 py-2 rounded-input transition-colors ${
            selectedCategory === category.slug
              ? 'bg-[var(--primary-color-royal)] text-white'
              : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
          }`}
        >
          {category.name}
        </button>
      ))}

      {/* Empty State if no categories */}
      {categories.length === 0 && !loading && (
        <p className="text-sm text-[var(--text-color-ink-400)] text-center py-4">
          No categories available
        </p>
      )}
    </div>
  );
};

export default CategoryFilter;
