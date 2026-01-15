import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { getReplySchema, transformReplyData } from './ThreadValidationSchema';
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
        setSubmitError('Failed to post reply. Please try again.');
      }
    } catch (error) {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {submitError}
        </div>
      )}

      {/* Textarea Container*/}
      <div className="py-2 px-4 mb-4 bg-white rounded-lg border border-[var(--border-color-line)] focus-within:ring-2 focus-within:ring-[var(--primary-color-royal)] focus-within:border-[var(--primary-color-royal)]">
        <label htmlFor="content" className="sr-only">Your comment</label>
        <textarea
          {...register('content')}
          id="content"
          rows={parentReplyId ? 3 : 4}
          className={`px-0 w-full text-sm text-[var(--text-color-ink)] border-0 focus:ring-0 focus:outline-none placeholder-[var(--text-color-ink-400)] bg-transparent resize-none ${
            errors.content ? 'placeholder-red-400' : ''
          }`}
          placeholder={parentReplyId ? "Write your reply..." : "Write a comment..."}
        />
      </div>
      
      {errors.content && (
        <p className="mb-3 text-sm text-red-600">{errors.content.message}</p>
      )}

      {/* Post and Cancel Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="inline-flex items-center py-2.5 px-4 text-xs font-medium text-center text-white bg-[var(--primary-color-royal)] rounded-lg hover:bg-[var(--primary-color-royal-600)] focus:ring-4 focus:ring-[var(--primary-color-royal)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Posting...' : 'Post comment'}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 text-xs font-medium text-[var(--text-color-ink-400)] bg-[var(--color-background-snow)] rounded-lg hover:bg-[var(--border-color-line)] transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ThreadReplyForm;