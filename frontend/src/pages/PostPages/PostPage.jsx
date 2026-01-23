import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import BlockRenderer from '../../components/PostForm/BlogEditor/BlockRenderer';
import postService from '../../services/postService';
import { isEditorJsContent } from '../../utils/editorUtils';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { getFlagEmoji } from '../../utils/countryUtils';
import { MapPin, Flag, Globe, FileText, ChevronLeft, Edit, Trash2 } from 'lucide-react';

/**
 * PostPage Component
 * 
 * Displays full post details with all content
 * URL: /profile/{username}/posts/{slug}
 * 
 * Features:
 * - Public access (no authentication required for reading)
 * - Full post content (no truncation)
 * - Author information
 * - Edit/Delete buttons (if user is the author)
 * - Breadcrumb navigation
 */

const PostPage = () => {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load post data
  useEffect(() => {
    loadPost();
  }, [username, slug]);

  // Check if current user is the author
  useEffect(() => {
    if (user && post) {
      setIsAuthor(user.username === post.author_username);
    }
  }, [user, post]);

  const loadPost = async () => {
    if (!username || !slug) return;
    
    setLoading(true);
    
    try {
      const response = await postService.getPost(username, slug);
      
      if (response.success) {
        setPost(response.data);
      } else {
        toast.error(response.error || 'Failed to load post');
        // Navigate to 404 or home if post not found
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // Navigate to edit page 
    navigate(`/u/${username}/posts/${slug}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    
    try {
      const response = await postService.deletePost(username, slug);
      
      if (response.success) {
        toast.success('Post deleted successfully');
        navigate(`/profile/${username}`);
      } else {
        toast.error(response.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  // Get location badge
  const getLocationBadge = () => {
    if (!post) return null;

    if (post.location_scope === 'city' && post.city_name) {
      return (
        <span className="inline-flex items-center gap-1 bg-[var(--color-gold)] text-[var(--color-white)] px-4 py-2 rounded-pill text-sm font-medium">
          <MapPin className="w-4 h-4" /> {post.city_name}, {post.country_name}
        </span>
      );
    }
    
    if (post.location_scope === 'country' && post.country_name) {
      const flagDisplay = post.country_code ? getFlagEmoji(post.country_code) : <Flag className="w-4 h-4" />;
      return (
        <span className="inline-flex items-center gap-1 bg-[var(--primary-color-royal)] text-[var(--color-white)] px-4 py-2 rounded-pill text-sm font-medium">
          {flagDisplay} {post.country_name}
        </span>
      );
    }
    
    if (post.location_scope === 'none') {
      return (
        <span className="inline-flex items-center gap-1 bg-[var(--secondary-color-orchid)] text-[var(--color-white)] px-4 py-2 rounded-pill text-sm font-medium">
          <Globe className="w-4 h-4" /> Global
        </span>
      );
    }

    return null;
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

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-4">
              <FileText className="w-16 h-16 text-[var(--text-color-ink-400)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-color-ink)] mb-4">
              Post Not Found
            </h1>
            <p className="text-[var(--text-color-ink-400)] mb-8">
              The post you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-[var(--primary-color-royal)] text-[var(--color-white)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs post={post} />
          </div>

          {/* Post Container */}
          <article className="bg-[var(--color-white)] rounded-card shadow-card overflow-hidden">
            
            {/* Post Header Section */}
            <div className="p-8 border-b border-[var(--border-color-line)]">
              {/* Location Badge */}
              <div className="mb-6">
                {getLocationBadge()}
              </div>

              {/* Post Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-color-ink)] mb-6 font-editorial leading-tight">
                {post.title}
              </h1>

              {/* Author Info */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  {/* Author Avatar */}
                  {post.author_profile_image ? (
                    <img
                      src={post.author_profile_image}
                      alt={post.author_username}
                      className="w-14 h-14 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-[var(--primary-color-royal)] transition-all"
                      onClick={() => navigate(`/profile/${post.author_username}`)}
                    />
                  ) : (
                    <div 
                      className="w-14 h-14 bg-[var(--primary-color-royal)] rounded-full flex items-center justify-center text-[var(--color-white)] font-bold text-xl cursor-pointer hover:ring-2 hover:ring-[var(--primary-color-royal-600)] transition-all"
                      onClick={() => navigate(`/profile/${post.author_username}`)}
                    >
                      {post.author_full_name?.[0]?.toUpperCase() || post.author_username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  
                  {/* Author Details */}
                  <div>
                    <h3 
                      className="font-semibold text-lg text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] transition-colors cursor-pointer"
                      onClick={() => navigate(`/profile/${post.author_username}`)}
                    >
                      {post.author_full_name}
                    </h3>
                    <p className="text-[var(--text-color-ink-400)]">
                      @{post.author_username}
                    </p>
                    <p className="text-sm text-[var(--text-color-ink-400)]">
                      Posted on {dayjs(post.created_at).format('MMMM D, YYYY')}
                      {!dayjs(post.created_at).isSame(dayjs(post.updated_at), 'second') && " (edited)"}
                    </p>
                  </div>
                </div>

                {/* Edit/Delete Buttons (if author) */}
                {isAuthor && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--primary-color-royal)] text-[var(--primary-color-royal)] rounded-input font-medium hover:bg-[var(--primary-color-royal)] hover:text-white transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-input font-medium hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post Content Section */}
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                {isEditorJsContent(post.content) ? (
                  <BlockRenderer content={post.content} />
                ) : (
                  <p className="text-[var(--text-color-ink)] leading-relaxed whitespace-pre-wrap text-lg">
                    {post.content}
                  </p>
                )}
              </div>
            </div>

            {/* Post Footer */}
            <div className="px-8 py-6 bg-[var(--color-background-snow)] border-t border-[var(--border-color-line)]">
              <div className="flex items-center justify-between text-sm text-[var(--text-color-ink-400)]">
                <div>
                  Last updated: {dayjs(post.updated_at).format('MMMM D, YYYY')}
                </div>
              </div>
            </div>
          </article>

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between items-center">      
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostPage;
