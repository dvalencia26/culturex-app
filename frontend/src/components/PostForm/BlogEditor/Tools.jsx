import Header from "@editorjs/header";
import ImageTool from "@editorjs/image";
import List from "@editorjs/list";
import ImageSizeTune from './ImageSizeTune';
import { uploadImage } from './imageUpload';


// Upload image to server - uses presigned URL to upload directly to Spaces
const uploadByFile = async (file) => {
    return await uploadImage(file);
};

// Upload image by URL - just validates and returns
const uploadByUrl = async (url) => {
  return {
    success: 1,
    file: { url }
  };
};

export const EDITOR_JS_TOOLS = {
  header: {
    class: Header,
    inlineToolbar: ['bold', 'italic', 'link'],
    config: {
      placeholder: 'Enter a heading',
      levels: [1, 2, 3],
      defaultLevel: 1
    },
    shortcut: 'CMD+SHIFT+H'
  },
  
  image: {
    class: ImageTool,
    config: {
      uploader: {
        uploadByFile,
        uploadByUrl,
      },
      captionPlaceholder: 'Add a caption (optional)',
    },
    tunes: ['imageSize'],
  },
  
  list: {
    class: List,
    inlineToolbar: true,
    config: {
      defaultStyle: 'unordered'
    }
  },

  imageSize: {
    class: ImageSizeTune,
  },
};