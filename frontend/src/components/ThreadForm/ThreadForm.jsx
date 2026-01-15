import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import { getThreadSchema, transformThreadData } from './ThreadValidationSchema';
import CategorySelector from './CategorySelector';
import { threadService } from '../../services/threadService';
import CountrySelector from './CountrySelector';

/*
Thread form component for creating and editing discussion threads.
Uses react-hook-form for form management and zod for validation.
Uses CategorySelector component for category and subcategory selection.
UseCallback memoize the handlers for category, subcategory, and country changes.
*/
const ThreadForm = ({ onSuccess, initialData = null, isEditing = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const schema = getThreadSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
    clearErrors,
    setError
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      category: initialData?.category_slug || '',
      subcategory: initialData?.subcategory_slug || '',
      country: initialData?.country_code || ''
    }
  });

  const selectedCategory = watch('category');
  const selectedSubcategory = watch('subcategory');
  const selectedCountry = watch('country');

  // Handle category selection
  const handleCategoryChange = useCallback((categorySlug) => {
    setValue('category', categorySlug, { shouldValidate: true });
    // Clear subcategory when category changes
    if (selectedSubcategory) {
      setValue('subcategory', '', { shouldValidate: true });
    }
    if (categorySlug) {
      clearErrors('category');
    }
  }, [setValue, selectedSubcategory, clearErrors]);

  const handleSubcategoryChange = useCallback((subcategorySlug) => {
    setValue('subcategory', subcategorySlug, { shouldValidate: true });
  }, [setValue]);

  const handleCountryChange = useCallback((countryCode) => {
    setValue('country', countryCode, { shouldValidate: true });
  }, [setValue]);

  // Form submission
  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const transformedData = transformThreadData(formData);

      let result;
      if (isEditing && initialData) {
        result = await threadService.updateThread(
          initialData.author_username,
          initialData.slug,
          transformedData
        );
      } else {
        result = await threadService.createThread(transformedData);
      }


      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data);
        }
        if (!isEditing) {
          reset();
        }
      } else {
        if (result.error && typeof result.error === 'object') {
          Object.keys(result.error).forEach(field => {
            if (field in formData) {
              setError(field, { 
                type: 'server', 
                message: Array.isArray(result.error[field]) 
                  ? result.error[field][0] 
                  : result.error[field] 
              });
            }
          });
        } else {
          setSubmitError(result.error || 'Failed to save thread');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = useCallback(() => {
    reset();
    setSubmitError('');
    clearErrors();
  }, [reset, clearErrors]);

  return (
    <div className="max-w-2xl mx-auto">
      {submitError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Thread Title *
          </label>
          <input
            type="text"
            id="title"
            {...register('title')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="What would you like to discuss?"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Category & Subcategory */}
        <CategorySelector
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
          errors={errors}
        />

        {/* Country */}
        <CountrySelector
          selectedCountry={selectedCountry}
          onCountryChange={handleCountryChange}
          errors={errors}
        />

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            rows={8}
            {...register('content')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Share your thoughts, questions, or experiences..."
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* Reset and Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={isSubmitting}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Thread' : 'Create Thread')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThreadForm;