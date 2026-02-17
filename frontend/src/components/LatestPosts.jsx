import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import postService from '../services/postService';
import PostCard from '../pages/PostPages/PostCard';
import { toast } from 'sonner';
import { Newspaper, ArrowRight } from 'lucide-react';

/**
 * LatestPosts Component
 * 
 * Displays the 3 most recent published posts on the homepage.
 * Supports all location types (global, country, city).
 */
const LatestPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPosts = async () => {
      setLoading(true);
      try {
        const response = await postService.getAllPosts({ limit: 3 });
        if (response.success) {
          setPosts(response.data.posts || []);
        } else {
          console.error('Failed to fetch posts:', response.error);
        }
      } catch (error) {
        console.error('Error fetching latest posts:', error);
        toast.error('Failed to load latest posts');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPosts();
  }, []);

  if (loading) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-left mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] font-editorial mb-2">
              Latest Posts
            </h2>
          </div>
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-left mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] font-editorial mb-2">
              Latest Posts
            </h2>
          </div>
          <div className="text-center py-12 bg-[var(--color-white)] rounded-card shadow-card">
            <Newspaper className="w-12 h-12 text-[var(--text-color-ink-400)] mx-auto mb-4" />
            <p className="text-[var(--text-color-ink-400)]">
              No posts available yet. Be the first to share your story!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--primary-color-royal)] font-editorial">
            Latest Posts
          </h2>
          <button
            onClick={() => navigate('/global-posts')}
            className="flex items-center gap-2 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] font-medium transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showLocationBadge={true} showContentPreview={false} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LatestPosts;
