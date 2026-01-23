import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import SearchBar from '../../components/ui/SearchBar';
import postService from '../../services/postService';
import { toast } from 'sonner';
import PostCard from './PostCard';
import { Globe, SortDesc, SortAsc } from 'lucide-react';

/**
 * GlobalPage Component:
 * Displays posts with no location scope (global/universal posts)
 * URL: /global-posts
 * Features:
 * - Search by title/content
 * - Sort by date (newest/oldest)
 * - Breadcrumb navigation: Home -> Global Posts
 */

const GlobalPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Posts state
  const [posts, setPosts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sort') || 'newest');
  const [offset, setOffset] = useState(0);
  
  const POSTS_PER_PAGE = 20;

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      setOffset(0);
      
      try {
        const filters = {
          location_scope: 'none',
          limit: POSTS_PER_PAGE,
          offset: 0
        };
        
        if (searchQuery.trim()) {
          filters.search = searchQuery.trim();
        }

        const response = await postService.getAllPosts(filters);
        
        if (response.success) {
          let postsData = response.data.posts || [];
          
          // Sort posts (backend returns newest first by default)
          if (sortOrder === 'oldest') {
            postsData = [...postsData].reverse();
          }
          
          setPosts(postsData);
          setTotalCount(response.data.total || 0);
          setHasMore(response.data.has_more || false);
        } else {
          toast.error(response.error || 'Failed to load posts');
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
        toast.error('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [searchQuery, sortOrder]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (sortOrder !== 'newest') params.set('sort', sortOrder);
    setSearchParams(params, { replace: true });
  }, [searchQuery, sortOrder, setSearchParams]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search is already reactive via useEffect
  };

  // Handle load more
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const newOffset = offset + POSTS_PER_PAGE;
    
    try {
      const filters = {
        location_scope: 'none',
        limit: POSTS_PER_PAGE,
        offset: newOffset
      };
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      const response = await postService.getAllPosts(filters);
      
      if (response.success) {
        let newPosts = response.data.posts || [];
        
        if (sortOrder === 'oldest') {
          newPosts = [...newPosts].reverse();
        }
        
        setPosts([...posts, ...newPosts]);
        setOffset(newOffset);
        setHasMore(response.data.has_more || false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Globe className="w-12 h-12 text-[var(--primary-color-royal)]" />
              <h1 className="text-4xl font-bold text-[var(--text-color-ink)] font-editorial">
                Travel Blogs 
              </h1>
            </div>
            <p className="text-lg text-[var(--text-color-ink-400)] max-w-2xl mx-auto">
              Stories, experiences, and universal insights for every traveler
            </p>
          </div>

          {/* Search and Sort Controls */}
          <div className="bg-[var(--color-white)] rounded-card shadow-card p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* Search Bar */}
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onSearch={(value) => setSearchQuery(value)}
                  placeholder="Search posts by title or content..."
                  loading={loading}
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-color-ink-400)] whitespace-nowrap">Sort by:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                  className="flex items-center gap-2 px-4 py-3 border border-[var(--border-color-line)] rounded-input hover:bg-[var(--color-background-snow)] transition-colors"
                >
                  {sortOrder === 'newest' ? (
                    <>
                      <SortDesc className="w-4 h-4" />
                      <span>Newest First</span>
                    </>
                  ) : (
                    <>
                      <SortAsc className="w-4 h-4" />
                      <span>Oldest First</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Search Indicator */}
            {searchQuery && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-[var(--text-color-ink-400)]">
                  Searching for:
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary-color-royal-100)] text-[var(--primary-color-royal)] rounded-pill text-sm font-medium">
                  "{searchQuery}"
                  <button
                    onClick={handleClearSearch}
                    className="ml-1 hover:text-[var(--primary-color-royal-700)]"
                  >
                    ✕
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : posts.length > 0 ? (
            /* Posts List */
            <div className="space-y-6">
              {/* Post Count */}
              <div className="text-center mb-6">
                <p className="text-[var(--text-color-ink-400)]">
                  {totalCount} {totalCount === 1 ? 'post' : 'posts'} 
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>

              {/* Post Cards */}
              {posts.map((post) => (
                <PostCard key={post.id} post={post} showLocationBadge={false} />
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-white border border-[var(--border-color-line)] text-[var(--text-color-ink)] px-6 py-3 rounded-input font-semibold hover:bg-[var(--color-background-snow)] transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12 bg-[var(--color-white)] rounded-card shadow-card">
              <Globe className="w-16 h-16 text-[var(--text-color-ink-400)] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                {searchQuery ? 'No posts found' : 'No global posts yet'}
              </h3>
              <p className="text-[var(--text-color-ink-400)] mb-8 max-w-md mx-auto">
                {searchQuery 
                  ? `No posts match "${searchQuery}". Try a different search term.`
                  : 'Be the first to share a universal travel experience that applies everywhere!'
                }
              </p>
              
              {searchQuery ? (
                <button
                  onClick={handleClearSearch}
                  className="text-[var(--primary-color-royal)] hover:underline font-semibold"
                >
                  Clear Search
                </button>
              ) : user ? (
                <button
                  onClick={() => navigate('/create-post')}
                  className="bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
                >
                  Create a Post
                </button>
              ) : (
                <p className="text-[var(--text-color-ink-400)]">
                  <button
                    onClick={() => navigate('/login')}
                    className="text-[var(--primary-color-royal)] hover:underline"
                  >
                    Log in
                  </button>
                  {' '}to share your story
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalPage;
