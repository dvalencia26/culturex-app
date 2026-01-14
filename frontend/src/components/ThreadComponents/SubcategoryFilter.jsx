import Loader from '../Loader';
/**
 * SubcategoryFilter Component:
 * Shows subcategories only when categorySelected is true (dependent on parent CategoryFilter)
 * Loads subcategories based on selected category
 * Subcategories fetched from backend via threadService.getSubcategories(categorySlug)
 */

const SubcategoryFilter = ({ 
  subcategories = [], 
  selectedSubcategory = '', 
  onSubcategoryChange,
  loading = false,
  categorySelected = false
}) => {
  // the component does not render if no category is selected
  if (!categorySelected) {
    return null;
  }

  if (loading) {
    return (
      <Loader 
      fullScreen={false}
      message="Loading subcategories..."
      size='small'
      overlay={false}
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* All Subcategories button */}
      <button
        onClick={() => onSubcategoryChange('')}
        className={`w-full text-left px-3 py-2 rounded-input transition-colors ${
          !selectedSubcategory
            ? 'bg-[var(--primary-color-royal)] text-white'
            : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
        }`}
      >
        All Subcategories
      </button>

      {/* Display Subcategories List names from the backend */}
      {subcategories.map((subcategory) => (
        <button 
          key={subcategory.id}
          onClick={() => onSubcategoryChange(subcategory.id.toString())}
          className={`w-full text-left px-3 py-2 rounded-input transition-colors ${
            selectedSubcategory === subcategory.id.toString()
              ? 'bg-[var(--primary-color-royal)] text-white'
              : 'hover:bg-[var(--color-background-snow)] text-[var(--text-color-ink)]'
          }`}
        >
          {subcategory.name}
        </button>
      ))}

      {/* Empty State */}
      {subcategories.length === 0 && !loading && (
        <p className="text-sm text-[var(--text-color-ink-400)] text-center py-4">
          No subcategories available
        </p>
      )}
    </div>
  );
};

export default SubcategoryFilter;
