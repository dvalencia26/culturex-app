import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import CountryFilter from './CountryFilter';
import CategoryFilter from './CategoryFilter';
import SubcategoryFilter from './SubcategoryFilter';

 //ThreadFilters sidebar component: Manages collapsible sections for each filter type

const ThreadFilters = ({
  categories = [],
  subcategories = [],
  selectedCountry = '',
  selectedCategory = '',
  selectedSubcategory = '',
  onCountryChange,
  onCategoryChange,
  onSubcategoryChange,
  onClearFilters,
  popularCountries = [],
  loadingCountries = false,
  loadingCategories = false,
  loadingSubcategories = false
}) => {

  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [countryExpanded, setCountryExpanded] = useState(true);
  const [subcategoryExpanded, setSubcategoryExpanded] = useState(false);


  const hasActiveFilters = selectedCountry || selectedCategory || selectedSubcategory; // Check if any filters are active

  return (
    <aside className="bg-white rounded-card shadow-card p-6 sticky top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto">
      
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-[var(--border-color-line)]">
        <h2 className="text-xl font-bold text-[var(--text-color-ink)] font-editorial">
          Discussions Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-[var(--primary-color-royal)] hover:underline mt-2"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Country Filter */}
      <div className="mb-6">
        <button
          onClick={() => setCountryExpanded(!countryExpanded)}
          className="flex items-center justify-between w-full mb-3 group"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-color-ink)] group-hover:text-[var(--primary-color-royal)] transition-colors">
              Country
            </h3>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${countryExpanded ? 'rotate-180' : ''}`} />
        </button>

        {countryExpanded && (
          <CountryFilter
            selectedCountry={selectedCountry}
            onCountryChange={onCountryChange}
            popularCountries={popularCountries}
            loading={loadingCountries}
          />
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <button
          onClick={() => setCategoryExpanded(!categoryExpanded)}
          className="flex items-center justify-between w-full mb-3 group"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-color-ink)] group-hover:text-[var(--primary-color-royal)] transition-colors">
              Category
            </h3>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} />
        </button>

        {categoryExpanded && (
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={(slug) => {
              onCategoryChange(slug);
              // when category is selected, expand subcategory filter
              if (slug) {
                setSubcategoryExpanded(true);
              } else {
                setSubcategoryExpanded(false);
              }
            }}
            loading={loadingCategories}
          />
        )}
      </div>

      {/* Subcategory Filter */}
      {selectedCategory && (
        <div className="mb-6">
          <button
            onClick={() => setSubcategoryExpanded(!subcategoryExpanded)}
            className="flex items-center justify-between w-full mb-3 group"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-color-ink)] group-hover:text-[var(--primary-color-royal)] transition-colors">
                Subcategory
              </h3>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${subcategoryExpanded ? 'rotate-180' : ''}`} />
          </button>

          {subcategoryExpanded && (
            <SubcategoryFilter
              subcategories={subcategories}
              selectedSubcategory={selectedSubcategory}
              onSubcategoryChange={onSubcategoryChange}
              loading={loadingSubcategories}
              categorySelected={!!selectedCategory}
            />
          )}
        </div>
      )}
    </aside>
  );
};

export default ThreadFilters;
