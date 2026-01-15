import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import Form from '../../components/PostForm/Form';
import postService from '../../services/postService';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

/**
 * EditPostPage Component:
 * Authors can edit their existing posts
 * URL: /profile/{username}/posts/{slug}/edit
 * Validates if user is the author. Pre-fills form with existing post data.
 */

const EditPostPage = () => {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);

  // Load post data
  useEffect(() => {
    loadPost();
  }, [username, slug]);

  // Check if current user is the author
  useEffect(() => {
    if (user && post) {
      const authorCheck = user.username === post.author_username;
      setIsAuthor(authorCheck);
      
      // Redirect if not the author
      if (!authorCheck) {
        toast.error('Sorry. You do not have permission to edit this post');
        navigate(`/profile/${username}/posts/${slug}`);
      }
    }
  }, [user, post, username, slug, navigate]);

  const loadPost = async () => {
    if (!username || !slug) return;
    
    setLoading(true);
    
    try {
      const response = await postService.getPost(username, slug);
      
      if (response.success) {
        setPost(response.data);
      } else {
        toast.error(response.error || 'Failed to load post');
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (updatedPost) => {
    toast.success('Post updated successfully!');
    // Navigate to the updated post page, the slug is updated in the backend.
    navigate(`/profile/${updatedPost.author_username}/posts/${updatedPost.slug}`);
  };

  const handleCancel = () => {
    navigate(`/profile/${username}/posts/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Breadcrumbs />
            </div>
            
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post || !isAuthor) {
    return null; // Prevent rendering if not loaded or not author
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors mb-4"
            >
              <ChevronLeft className="w-5 h-5" /> Back to Post
            </button>
            
            <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
              Edit Post
            </h1>
            <p className="text-[var(--text-color-ink-400)] mt-2">
              Make changes to your post below
            </p>
          </div>

          {/* Post Form */}
          <div className="bg-[var(--color-white)] rounded-card shadow-card p-8">
            <Form 
              onSuccess={handleSuccess}
              initialData={post}
              isEditing={true}
              showTitle={true}
            />
            
            <div className="mt-6 pt-6 border-t border-[var(--border-color-line)]">
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 py-3 border border-[var(--border-color-line)] text-[var(--text-color-ink)] rounded-input font-medium hover:bg-[var(--color-background-snow)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
