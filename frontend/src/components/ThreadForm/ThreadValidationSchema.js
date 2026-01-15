import { z } from 'zod';

// Thread validation schema
export const getThreadSchema = () => {
  return z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title must be less than 200 characters'),
    
    content: z.string()
        .min(10, 'Content must be at least 10 characters')
        .trim(),
  
    category: z.string()
      .min(1, 'Please select a category'),
    
    subcategory: z.string().optional(),
    
    country: z.string().optional()
  });
};

// Thread Reply validation schema
export const getReplySchema = () => {
  return z.object({
    content: z.string()
      .min(1, 'Reply cannot be empty')
      .max(2000, 'Reply must not exceed 2000 characters')
  });
};

// Transform thread data before sending to backend
export const transformThreadData = (formData) => {
    return {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,  
        // use the spread operator to conditionally include optional fields
        ...(formData.subcategory && { subcategory: formData.subcategory }),
        ...(formData.country && { country: formData.country }) 
    };
};

// Transform reply data
export const transformReplyData = (formData) => {
  return {
    content: formData.content.trim()
  };
};