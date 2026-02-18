import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import postService from '../../services/postService';

/**
 * RecommendationForm component allows authors to add multiple recommendations (places, services) to their post.
  Each recommendation includes:
    - Title (required), Category (selected from backend-provided list), URL (optional), Google Maps URL (optional)
    - rating (0-5), price level (from predefined options), and a short note (optional).
  The form supports adding/removing multiple recommendations and is designed to be used within the PostForm component.
 */
  

const PRICE_LEVELS = [
  { value: '', label: 'No price' },
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$', label: '$$$$' },
];

const emptyRecommendation = () => ({
  _tempId: Date.now() + Math.random(),
  title: '',
  category: '',
  url: '',
  google_maps_url: '',
  rating: 0,
  price_level: '',
  note: '',
});

// Forward ref to allow parent component (PostForm) to call methods like getData() and clear()
const RecommendationForm = forwardRef(({ initialRecommendations = [] }, ref) => {
  const [recommendations, setRecommendations] = useState(() => {
    if (initialRecommendations.length > 0) {
      return initialRecommendations.map((rec, i) => ({
        ...rec,
        _tempId: rec.id || Date.now() + i,
        category: rec.category || '',
      }));
    }
    return [];
  });
  const [categories, setCategories] = useState([]);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      const result = await postService.getRecommendationCategories();
      if (result.success) {
        setCategories(result.data);
      }
    };
    fetchCategories();
  }, []);

  // Set default category on first recommendation if categories loaded after
  useEffect(() => {
    if (categories.length > 0) {
      setRecommendations(prev =>
        prev.map(r => (!r.category && categories.length > 0) ? { ...r, category: categories[0].id } : r)
      );
    }
  }, [categories]);

  // Expose methods to parent component (PostForm) via ref
  useImperativeHandle(ref, () => ({
    getData: () => recommendations.filter(r => r.title.trim() !== ''),
    clear: () => setRecommendations([]),
    hasData: () => recommendations.some(r => r.title.trim() !== ''),
  }));

  const addRecommendation = useCallback(() => {
    setRecommendations(prev => [
      ...prev,
      { ...emptyRecommendation(), category: categories.length > 0 ? categories[0].id : '' }
    ]);
  }, [categories]);

  const removeRecommendation = useCallback((tempId) => {
    setRecommendations(prev => prev.filter(r => r._tempId !== tempId));
  }, []);

  const updateRecommendation = useCallback((tempId, field, value) => {
    setRecommendations(prev =>
      prev.map(r => r._tempId === tempId ? { ...r, [field]: value } : r)
    );
  }, []);

  const renderStarRating = (rec) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => updateRecommendation(rec._tempId, 'rating', rec.rating === star ? 0 : star)}
          className={`w-6 h-6 ${star <= rec.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
        >
          <Star className="w-5 h-5" fill={star <= rec.rating ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <div
          key={rec._tempId}
          className="border border-[var(--border-color-line)] rounded-lg p-4 space-y-3 bg-[var(--color-background-snow)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-color-ink-400)]">
              Recommendation #{index + 1}
            </span>
            <button
              type="button"
              onClick={() => removeRecommendation(rec._tempId)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Title + Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={rec.title}
              onChange={e => updateRecommendation(rec._tempId, 'title', e.target.value)}
              placeholder="Place or service name *"
              className="px-3 py-2 border border-[var(--border-color-line)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] text-sm"
              maxLength={200}
            />
            <select
              value={rec.category}
              onChange={e => updateRecommendation(rec._tempId, 'category', parseInt(e.target.value))}
              className="px-3 py-2 border border-[var(--border-color-line)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] text-sm"
            >
              <option value="" disabled>Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* URL fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="url"
              value={rec.url}
              onChange={e => updateRecommendation(rec._tempId, 'url', e.target.value)}
              placeholder="Website URL (optional)"
              className="px-3 py-2 border border-[var(--border-color-line)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] text-sm"
            />
            <input
              type="url"
              value={rec.google_maps_url}
              onChange={e => updateRecommendation(rec._tempId, 'google_maps_url', e.target.value)}
              placeholder="Google Maps URL (optional)"
              className="px-3 py-2 border border-[var(--border-color-line)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] text-sm"
            />
          </div>

          {/* Rating + Price row */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-color-ink-400)]">Rating:</span>
              {renderStarRating(rec)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-color-ink-400)]">Price:</span>
              <select
                value={rec.price_level}
                onChange={e => updateRecommendation(rec._tempId, 'price_level', e.target.value)}
                className="px-2 py-1 border border-[var(--border-color-line)] rounded-md text-sm"
              >
                {PRICE_LEVELS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <textarea
            value={rec.note}
            onChange={e => updateRecommendation(rec._tempId, 'note', e.target.value)}
            placeholder="Short note (optional, max 500 chars)"
            className="w-full px-3 py-2 border border-[var(--border-color-line)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-royal)] text-sm resize-none"
            rows={2}
            maxLength={500}
          />
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addRecommendation}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-[var(--border-color-line)] rounded-lg text-[var(--text-color-ink-400)] hover:border-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal)] transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Add Recommendation
      </button>
    </div>
  );
});

RecommendationForm.displayName = 'RecommendationForm';
export default RecommendationForm;
