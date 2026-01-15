import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { getReplySchema, transformReplyData } from './validationSchema';
import { threadService } from '../../services/threadService';

/*
ThreadReplyForm component for submitting replies to threads.
Also uses react-hook-form for form management and zod for validation.
*/

const ThreadReplyForm = ({ 
  threadUsername, 
  threadSlug, 
  parentReplyId = null,
  onSuccess,
  onCancel 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const schema = getReplySchema();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      content: ''
    }
  });

  const onSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const transformedData = transformReplyData(formData);
      
      // Include parentReplyId if it's a reply to another reply
      if (parentReplyId) {
        transformedData.parent_reply = parentReplyId;
      }

      const result = await threadService.createReply(
        threadUsername,
        threadSlug,
        transformedData
      );

      if (result.success) {
        reset();
        if (onSuccess) {
          onSuccess(result.data);
        }
      } else {
        setSubmitError(result.error || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Reply submission error:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {submitError && (
        <div className="mb-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <textarea
            {...register('content')}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={parentReplyId ? "Write your reply..." : "Share your thoughts..."}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThreadReplyForm;