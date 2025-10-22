import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import { getPostSchema, transformPostData } from './validationSchema';
import LocationSelector from './LocationSelector';
import postService from '../../services/postService';

/*
UseCallback is used to memoize the handlers for country and city changes.
*/

const Form = ({ onSuccess, initialData = null, isEditing = false, showTitle = true }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');


  const schema = getPostSchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
    clearErrors
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange', // Validate on change 
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      location_scope: initialData?.location_scope || 'none',
      primary_country: initialData?.primary_country || '',
      primary_city: initialData?.primary_city || '',
      status: initialData?.status || 'draft'
    }
  });

  // Watch for location scope changes
  const locationScope = watch('location_scope');
  const selectedCountry = watch('primary_country');
  const selectedCity = watch('primary_city');

  // Handle country selection with proper cleanup
  const handleCountryChange = useCallback((countryCode) => {
    setValue('primary_country', countryCode, { shouldValidate: true });
    // Clear city when country changes
    if (locationScope === 'city' && selectedCity) {
      setValue('primary_city', '', { shouldValidate: true });
    }
    // Clear country errors when user selects
    if (countryCode) {
      clearErrors('primary_country');
    }
  }, [setValue, locationScope, selectedCity, clearErrors]);

  // Handle city selection
  const handleCityChange = useCallback((cityId) => {
    setValue('primary_city', cityId, { shouldValidate: true });
    // Clear city errors when user selects
    if (cityId) {
      clearErrors('primary_city');
    }
  }, [setValue, clearErrors]);

  // Form submission with proper error handling
  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Transform data before sending to backend
      const transformedData = transformPostData(formData);
      
      let result;
      if (isEditing && initialData) {
        result = await postService.updatePost(
          initialData.author_username,
          initialData.slug,
          transformedData
        );
      } else {
        result = await postService.createPost(transformedData);
      }

      if (result.success) {
        if (onSuccess) {
          onSuccess(result.data);
        }
        if (!isEditing) {
          reset();
        }
      } else {
        // Handle backend validation errors
        if (result.error && typeof result.error === 'object') {
          // Map backend errors to form fields
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
          setSubmitError(result.error || 'Failed to save post');
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = useCallback(() => {
    reset();
    setSubmitError('');
    clearErrors();
  }, [reset, clearErrors]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {showTitle && (
        <h2 className="text-2xl font-bold mb-6">
          {isEditing ? 'Edit Post' : 'Create New Post'}
        </h2>
      )}

      {submitError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            {...register('title')}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter post title..."
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Content Field */}
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
            placeholder="Write your post content..."
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* Location Scope */}
        <div>
          <label htmlFor="location_scope" className="block text-sm font-medium text-gray-700 mb-1">
            Location Scope *
          </label>
          <select
            id="location_scope"
            {...register('location_scope')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="none">Not location specific</option>
            <option value="country">Country specific</option>
            <option value="city">City specific</option>
          </select>
          {errors.location_scope && (
            <p className="mt-1 text-sm text-red-600">{errors.location_scope.message}</p>
          )}
        </div>

        {/* Location Selector Component */}
        <LocationSelector
          locationScope={locationScope}
          selectedCountry={selectedCountry}
          selectedCity={selectedCity}
          onCountryChange={handleCountryChange}
          onCityChange={handleCityChange}
          errors={errors}
        />

        {/* Status Field */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            id="status"
            {...register('status')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Post' : 'Create Post')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default Form
