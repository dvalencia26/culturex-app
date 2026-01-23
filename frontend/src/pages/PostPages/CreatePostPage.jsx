import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PostForm } from '../../components/PostForm';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';

const CreatePostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      toast.error('Please login to create a post');
      navigate('/login');
    }
  }, [user, navigate]);

  const handlePostSuccess = (post) => {
    toast.success('Post created successfully!');
    // Navigate to the newly created post
    navigate(`/u/${post.author_username}/posts/${post.slug}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui pt-8 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-[var(--primary-color-royal)] font-editorial">
            Create New Blog Post
          </h1>
          <p className="mt-2 text-[var(--text-color-ink-400)]">
            Share your travel experiences and cultural discoveries with the community
          </p>
        </div>

        {/* Blog Form */}
        <div className="bg-[var(--color-white)] rounded-lg shadow-card p-6">
          <PostForm onSuccess={handlePostSuccess} showTitle={false} />
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;
