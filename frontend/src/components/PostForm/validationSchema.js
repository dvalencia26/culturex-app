import {z} from 'zod';

// Single comprehensive schema
const postSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  
  content: z.string()
    .min(1, "Content is required")
    .trim(),
  
  location_scope: z.enum(["none", "country", "city"], {
    errorMap: () => ({ message: "Please select a valid location scope" })
  }),
  
  // These fields are always optional at schema level, validation happens in refine()
  primary_country: z.string().optional(),
  primary_city: z.union([z.number(), z.string(), z.null()]).optional(),
  
  status: z.enum(["draft", "published"], {
    errorMap: () => ({ message: "Please select a valid status" })
  }).default("draft")
}).refine((data) => {
  // Country validation: required for 'country' and 'city' scopes
  if ((data.location_scope === 'country' || data.location_scope === 'city')) {
    return data.primary_country && data.primary_country.trim() !== '';
  }
  return true;
}, {
  message: "Country is required for location-specific posts",
  path: ["primary_country"] // Error appears on country field
}).refine((data) => {
  // City validation: required only for 'city' scope
  if (data.location_scope === 'city') {
    return data.primary_city && 
           data.primary_city !== '' && 
           data.primary_city !== 0 && 
           data.primary_city !== null;
  }
  return true;
}, {
  message: "City is required for city-specific posts", 
  path: ["primary_city"] // Error appears on city field
}).refine((data) => {
  // Clean up data: remove location fields when not needed
  if (data.location_scope === 'none') {
    data.primary_country = '';
    data.primary_city = '';
  } else if (data.location_scope === 'country') {
    data.primary_city = '';
  }
  return true;
});

// Transform the data before sending to backend
export const transformPostData = (formData) => {
  const cleaned = { ...formData };
  
  // Convert primary_city to number if it's a string number
  if (cleaned.primary_city && typeof cleaned.primary_city === 'string') {
    const cityId = parseInt(cleaned.primary_city);
    cleaned.primary_city = isNaN(cityId) ? null : cityId;
  }
  
  // Clean up based on location scope
  if (cleaned.location_scope === 'none') {
    delete cleaned.primary_country;
    delete cleaned.primary_city;
  } else if (cleaned.location_scope === 'country') {
    delete cleaned.primary_city;
  }
  
  return cleaned;
};

// Export the single schema
export const getPostSchema = () => postSchema;

// Legacy exports for backward compatibility
export {
  postSchema as basePostSchema,
  postSchema as noneLocationSchema,
  postSchema as countryLocationSchema,
  postSchema as cityLocationSchema
};