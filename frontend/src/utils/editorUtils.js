/**
 * Editor.js Content Utilities
 * Helper functions to extract and process Editor.js JSON content
 */

// Parse Editor.js content (handles both string and object)
export const parseEditorContent = (content) => {
  if (!content) return null;
  
  if (typeof content === 'object' && content.blocks) {
    return content;
  }
  
  // Old content is plain text ( this could be deleted later since early test post will be eliminated )
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.blocks) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  
  return null;
};

// Check if content is valid Editor.js format
export const isEditorJsContent = (content) => {
  return parseEditorContent(content) !== null;
};

// Extract the first image URL from Editor.js content ( This is used in PostCard.jsx )
export const getFirstImageUrl = (content) => {
  const data = parseEditorContent(content);
  if (!data || !data.blocks) return null;
  
  const imageBlock = data.blocks.find(block => block.type === 'image');
  return imageBlock?.data?.file?.url || null;
};

// Extract plain text preview from Editor.js content ( This is used in PostCard.jsx )
export const getTextPreview = (content, maxLength = 200) => {
  const data = parseEditorContent(content);
  if (!data || !data.blocks) {
    // If not Editor.js format, treat as plain text
    if (typeof content === 'string') {
      return content.length > maxLength 
        ? content.substring(0, maxLength) + '...' 
        : content;
    }
    return '';
  }
  
  // Decode HTML entities (e.g. &nbsp; &amp; &lt;) into plain characters
  const decodeEntities = (str) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  let text = '';

  for (const block of data.blocks) {
    if (text.length >= maxLength) break;

    if (block.type === 'paragraph' || block.type === 'header') {
      // Strip HTML tags then decode entities
      const plainText = decodeEntities(block.data?.text?.replace(/<[^>]*>/g, '') || '');
      text += plainText + ' ';
    } else if (block.type === 'list') {
      // Extract text from list items
      const items = block.data?.items || [];
      for (const item of items) {
        const itemText = typeof item === 'string'
          ? item
          : item.content || '';
        text += decodeEntities(itemText.replace(/<[^>]*>/g, '')) + ' ';
      }
    }
  }

  text = text.trim();
  return text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
};
