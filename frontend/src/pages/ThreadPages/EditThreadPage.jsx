import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import ThreadForm from '../../components/ThreadForm/ThreadForm';
import { threadService } from '../../services/threadService';
import { toast } from 'sonner';
import { ChevronLeft, Lock } from 'lucide-react';

/**
 * EditThreadPage Component:
 * Allows thread authors to edit their existing threads
 * URL: /u/{username}/threads/{slug}/edit
 * Validates user is the author. Pre-fills form with existing thread data
 * Handles thread updates. Prevents editing of locked threads
 */

const EditThreadPage = () => {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);

  // Load thread data
  useEffect(() => {
    loadThread();
  }, [username, slug]);

  // Check if current user is the author and if thread is locked. Redirect if not
  useEffect(() => {
    if (user && thread) {
      const authorCheck = user.username === thread.author_username;
      setIsAuthor(authorCheck);
      
      if (!authorCheck) {
        toast.error('Sorry. You do not have permission to edit this thread');
        navigate(`/u/${username}/threads/${slug}`);
      } else if (thread.is_locked) {
        toast.error('This thread is locked and cannot be edited');
        navigate(`/u/${username}/threads/${slug}`);
      }
    }
  }, [user, thread, username, slug, navigate]);

  const loadThread = async () => {
    if (!username || !slug) return;
    
    setLoading(true);
    
    try {
      const response = await threadService.getThread(username, slug);
      
      if (response.success) {
        setThread(response.data);
      } else {
        toast.error(response.error || 'Failed to load thread');
        navigate('/threads');
      }
    } catch (error) {
      console.error('Error loading thread:', error);
      toast.error('Failed to load thread');
      navigate('/threads');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (updatedThread) => {
    toast.success('Thread updated successfully!');
    // Navigate to the updated thread page , the slug is updated in the backend.
    navigate(`/u/${updatedThread.author_username}/threads/${updatedThread.slug}`);
  };

  const handleCancel = () => {
    navigate(`/u/${username}/threads/${slug}`);
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

  if (!thread || !isAuthor) {
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
              <ChevronLeft className="w-5 h-5" /> Back to Thread
            </button>
            
            <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
              Edit Thread
            </h1>
            <p className="text-[var(--text-color-ink-400)] mt-2">
              Update your thread details below
            </p>
          </div>

          {/* Thread Form */}
          <div className="bg-[var(--color-white)] rounded-card shadow-card p-8">
            <ThreadForm 
              onSuccess={handleSuccess}
              initialData={thread}
              isEditing={true}
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

export default EditThreadPage;
