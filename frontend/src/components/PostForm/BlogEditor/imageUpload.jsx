import axiosInstance from '../../../utils/axiosInstance';

/**
 * Generate thumbnail from image file using canvas
 * EXIF orientation automatically handled via createImageBitmap
 * Blob: file-like object of immutable, raw data; they can be read as text or binary data. 
 */
export const generateThumbnail = async (file, maxWidth = 800) => {
  // createImageBitmap automatically handles EXIF orientation in modern browsers
  const imageBitmap = await createImageBitmap(file);
  
  // Calculate new dimensions maintaining aspect ratio
  let width = imageBitmap.width;
  let height = imageBitmap.height;
  
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  
  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  
  // Clean up
  imageBitmap.close();
  
  // Convert to blob (JPEG format)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      },
      'image/jpeg', // output JPEG for smaller size
      0.85 // good balance of quality/size
    );
  });
};

// Upload file to Spaces using presigned POST data
const uploadToSpaces = async (presignedData, file) => {
  const formData = new FormData();
  
  // Add all presigned fields first (order matters)
  Object.entries(presignedData.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  // Add file last 
  formData.append('file', file);
  
  try {
    const response = await fetch(presignedData.url, {
      method: 'POST',
      body: formData,
    });
    
    // S3/Spaces returns 204 No Content on success
    return response.status === 204 || response.ok;
  } catch (error) {
    console.error('Upload to Spaces failed:', error);
    return false;
  }
};

// Image upload flow: get presigned URLs, generate thumb, upload both
export const uploadImage = async (file) => {
  try {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large');
      return { success: 0 };
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type');
      return { success: 0 };
    }
    
    // Step 1: Get presigned URLs from backend (uses axiosInstance for auto token refresh)
    const presignResponse = await axiosInstance.post('/auth/presign-upload/', {
      content_type: file.type,
    });
    
    const presignData = presignResponse.data; 
    
    // Step 2: Generate thumbnail
    const thumbBlob = await generateThumbnail(file, 800);
    
    // Step 3: Upload original and thumbnail at the same time
    const [originalSuccess, thumbSuccess] = await Promise.all([
      uploadToSpaces(presignData.original.upload, file),
      uploadToSpaces(presignData.thumb.upload, thumbBlob),
    ]);
    
    if (!originalSuccess || !thumbSuccess) {
      console.error('Upload to Spaces failed');
      return { success: 0 };
    }
    
    // Step 4: Return URLs for Editor.js
    return {
      success: 1,
      file: {
        url: presignData.original.url,
        thumbUrl: presignData.thumb.url,
      }
    };
    
  } catch (error) {
    console.error('Image upload error:', error);
    return { success: 0 };
  }
};