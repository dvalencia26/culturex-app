/**
 * BlockRenderer Component:
 * Parses Editor.js JSON content and renders corresponding React components for each block type.
 * Supports paragraph, header, image, and list blocks.
 */

const BlockRenderer = ({ content }) => {
  // Parse content if it's a string
  const data = typeof content === 'string' ? JSON.parse(content) : content;
  
  if (!data || !data.blocks || data.blocks.length === 0) {
    return <p className="text-[var(--text-color-ink-400)]">No content</p>;
  }

  return (
    <div className="block-renderer">
      {data.blocks.map((block, index) => (
        <Block key={block.id || index} block={block} />
      ))}
    </div>
  );
};

// Render individual block based on type
const Block = ({ block }) => {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock data={block.data} />;
    case 'header':
      return <HeaderBlock data={block.data} />;
    case 'image':
      return <ImageBlock data={block.data} tunes={block.tunes} />;
    case 'list':
      return <ListBlock data={block.data} />;
    default:
      console.warn(`Unknown block type: ${block.type}`);
      return null;
  }
};

// Paragraph Block
const ParagraphBlock = ({ data }) => {
  if (!data.text) return null;
  
  return (
    <p 
      className="text-[var(--text-color-ink)] leading-relaxed text-lg mb-4"
      dangerouslySetInnerHTML={{ __html: data.text }}
    />
  );
};

// Header Block (h1, h2, h3)
const HeaderBlock = ({ data }) => {
  if (!data.text) return null;
  
  const level = data.level || 2;
  const Tag = `h${level}`;
  
  const styles = {
    1: 'text-3xl md:text-4xl font-bold mb-6 mt-8 font-editorial',
    2: 'text-2xl md:text-3xl font-bold mb-4 mt-6 font-editorial',
    3: 'text-xl md:text-2xl font-semibold mb-3 mt-5 font-editorial',
  };
  
  return (
    <Tag 
      className={`text-[var(--text-color-ink)] ${styles[level] || styles[2]}`}
      dangerouslySetInnerHTML={{ __html: data.text }}
    />
  );
};

// Image Block
const IMAGE_SIZE_CLASSES = {
  small: 'max-w-[33%]',
  medium: 'max-w-[66%]',
  full: 'w-full',
};

const ImageBlock = ({ data, tunes }) => {
  const url = data.file?.url;
  if (!url) return null;

  const caption = data.caption;
  const size = tunes?.imageSize?.size || 'full';

  // Build container classes based on settings
  let containerClasses = 'my-6';
  if (size !== 'full') containerClasses += ' mx-auto';
  containerClasses += ` ${IMAGE_SIZE_CLASSES[size] || IMAGE_SIZE_CLASSES.full}`;
  if (data.withBorder) containerClasses += ' border border-[var(--border-color-line)] rounded-lg overflow-hidden';
  if (data.withBackground) containerClasses += ' bg-[var(--color-background-snow)] p-4';
  if (data.stretched) containerClasses += ' -mx-4 md:-mx-8';

  return (
    <figure className={containerClasses}>
      <img
        src={url}
        alt={caption || 'Post image'}
        className="w-full h-auto rounded-lg"
        loading="lazy"
      />
      {caption && (
        <figcaption
          className="text-center text-sm text-[var(--text-color-ink-400)] mt-2 italic"
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      )}
    </figure>
  );
};

// List Block (ordered/unordered)   
const ListBlock = ({ data }) => {
  if (!data.items || data.items.length === 0) return null;
  
  const isOrdered = data.style === 'ordered';
  const Tag = isOrdered ? 'ol' : 'ul';
  const listStyle = isOrdered ? 'list-decimal' : 'list-disc';
  
  // Recursive function to render nested items
  const renderItems = (items) => {
    return items.map((item, index) => {
      // Handle both old format (string) and new format (object with content)
      const content = typeof item === 'string' ? item : item.content;
      const nestedItems = typeof item === 'object' ? item.items : null;
      
      return (
        <li key={index} className="mb-1">
          <span dangerouslySetInnerHTML={{ __html: content }} />
          {nestedItems && nestedItems.length > 0 && (
            <Tag className={`${listStyle} pl-6 mt-1`}>
              {renderItems(nestedItems)}
            </Tag>
          )}
        </li>
      );
    });
  };
  
  return (
    <Tag className={`${listStyle} pl-6 mb-4 text-[var(--text-color-ink)] text-lg leading-relaxed`}>
      {renderItems(data.items)}
    </Tag>
  );
};

export default BlockRenderer;
