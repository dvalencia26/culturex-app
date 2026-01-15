import { useState, useEffect } from 'react';
import { threadService } from '../../services/threadService';

const CategorySelector = ({ 
  selectedCategory, 
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  errors 
}) => {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await threadService.getAllCategories();
        if (result.success) {
          setCategories(result.data || []);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Subcategories load when selectedCategory changes
  useEffect(() => {
    const loadSubcategories = async () => {
      if (!selectedCategory) {
        setSubcategories([]);
        return;
      }

      setLoadingSubcategories(true);
      try {
        const result = await threadService.getSubcategories(selectedCategory);
        if (result.success) {
          setSubcategories(result.data || []);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
      } finally {
        setLoadingSubcategories(false);
      }
    };

    loadSubcategories();
  }, [selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category *
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={loadingCategories}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.category ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a category...</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* Subcategory Selector */}
      {selectedCategory && (
        <div>
          <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
            Subcategory (Optional)
          </label>
          <select
            id="subcategory"
            value={selectedSubcategory}
            onChange={(e) => onSubcategoryChange(e.target.value)}
            disabled={loadingSubcategories}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {subcategories.map((subcat) => (
              <option key={subcat.slug} value={subcat.slug}>
                {subcat.name}
              </option>
            ))}
          </select>
          {loadingSubcategories && (
            <p className="mt-1 text-sm text-gray-500">Loading subcategories...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;