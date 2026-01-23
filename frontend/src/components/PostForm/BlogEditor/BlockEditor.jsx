import { memo, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import EditorJS from '@editorjs/editorjs';
import { EDITOR_JS_TOOLS } from './Tools';
import './BlockStyle.css';

/**
 * BlockEditor Component:
 * A wrapper for Editor.js that provides a block-based content editor.
 * Integrated with react-hook-form via ref methods.
 * useRef to expose methods to parent component
 * useImperativeHandle is a React Hook that lets you customize the handle exposed as a ref.
 */

const BlockEditor = ({ 
  ref,
  initialData = null, // Initial data to load into the editor
  onChange = null, // Callback when content changes
  placeholder = 'Start writing your story...',
  readOnly = false, // If true, editor is in read-only mode (not editable)
  minHeight = '300px'
}) => {
  const editorInstance = useRef(null); // Holds Editor.js instance
  const holderRef = useRef(null); // Ref for editor holder div
  const isReady = useRef(false); // Tracks if editor is ready for operations
  const isInitializing = useRef(false);

  // Save editor content
  const save = useCallback(async () => {
    if (!editorInstance.current || !isReady.current) {
      return null;
    }
    try {
      return await editorInstance.current.save();
    } catch (error) {
      console.error('Error saving editor:', error);
      return null;
    }
  }, []);

  // Clear editor content
  const clear = useCallback(async () => {
    if (!editorInstance.current || !isReady.current) return;
    try {
      await editorInstance.current.clear();
    } catch (error) {
      console.error('Error clearing editor:', error);
    }
  }, []);

  // Render new data into editor
  const render = useCallback(async (data) => {
    if (!editorInstance.current || !isReady.current) return;
    try {
      await editorInstance.current.render(data);
    } catch (error) {
      console.error('Error rendering:', error);
    }
  }, []);

  // Expose methods to parent using ref
  useImperativeHandle(ref, () => ({
    save,
    clear,
    render,
    getInstance: () => editorInstance.current,
    isReady: () => isReady.current
  }), [save, clear, render]); // Dependencies when methods change

  // Initialize Editor.js
  useEffect(() => {
    if (isInitializing.current || isReady.current) return;
    if (!holderRef.current) return;

    isInitializing.current = true;

    const initEditor = async () => {
      try {
        const editor = new EditorJS({
          holder: holderRef.current,
          tools: EDITOR_JS_TOOLS, // From Tools.js
          data: initialData || { blocks: [] },
          placeholder,
          readOnly,
          autofocus: false,
          
          onReady: () => {
            isReady.current = true;
            isInitializing.current = false;
          },
          
          onChange: async (api) => {
            if (onChange && isReady.current) {
              try {
                const data = await api.saver.save();
                onChange(data);
              } catch (error) {
                console.error('Error in onChange:', error);
              }
            }
          }
        });

        editorInstance.current = editor;
      } catch (error) {
        console.error('Error initializing Editor.js:', error);
        isInitializing.current = false;
      }
    };

    initEditor(); // Start editor initialization

    // Cleanup on unmount
    return () => {
      if (editorInstance.current && isReady.current) {
        try {
          editorInstance.current.destroy();
          editorInstance.current = null;
          isReady.current = false;
        } catch (error) {
          console.error('Error destroying editor:', error);
        }
      }
    };
  }, []);

  return (
    <div className="block-editor-wrapper" style={{ minHeight }}>
      <div ref={holderRef} className="block-editor-holder" />
    </div>
  );
};

export default memo(BlockEditor);
           
