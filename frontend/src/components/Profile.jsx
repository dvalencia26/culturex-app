import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';
import postService from '../services/postService';
import { threadService } from '../services/threadService';
import Loader from './Loader';
import ProfilePostCard from './ui/ProfilePostCard';
import ThreadProfileCard from './ui/ThreadProfileCard';
import { BadgeCheck } from 'lucide-react';

const Profile = () => {
  const { user, profile: authProfile, logout } = useAuth();
  const { handle } = useParams(); // Get handle from URL using react-router
  const navigate = useNavigate(); 
  const location = useLocation();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Individual state variables for better control for profile data that may change: follow status, and counts
  const [isOurProfile, setIsOurProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Posts and Threads
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'threads', 'drafts'

  // Determine if this profile belongs to the logged-in user 
  const profileIdentifier = handle;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileIdentifier) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        if (user?.username && authProfile && profileIdentifier === user.username) {
          setProfile(authProfile);
          setIsOurProfile(true);
          setFollowing(false);
          setFollowerCount(authProfile.followers_count || 0);
          setFollowingCount(authProfile.following_count || 0);
          return;
        }
        const result = await userService.getUserProfile(profileIdentifier);
        if (result.success) {
          setProfile(result.data);
          // Set individual state variables
          setIsOurProfile(result.data.is_our_profile);
          setFollowing(result.data.following);
          setFollowerCount(result.data.followers_count || 0);
          setFollowingCount(result.data.following_count || 0);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileIdentifier, user?.username, authProfile]); // Re-fetch when profileIdentifier changes
  // Fetch user posts
  useEffect(() => {
    setPosts([]);
    setDrafts([]);
    setThreads([]);
    setPostsLoading(false);
    setDraftsLoading(false);
    setThreadsLoading(false);
    setPostsLoaded(false);
    setDraftsLoaded(false);
    setThreadsLoaded(false);
  }, [profileIdentifier]);

  useEffect(() => {
    const storedRefreshTab = sessionStorage.getItem('profileRefreshTab');
    const refreshTab = location.state?.refreshTab || storedRefreshTab;
    if (!refreshTab) return;

    if (refreshTab === 'posts') {
      setPostsLoaded(false);
    } else if (refreshTab === 'drafts') {
      setDraftsLoaded(false);
    } else if (refreshTab === 'threads') {
      setThreadsLoaded(false);
    }

    navigate(location.pathname, { replace: true, state: {} });
    if (storedRefreshTab) {
      sessionStorage.removeItem('profileRefreshTab');
    }
  }, [location.state, navigate, location.pathname]);

  const fetchPosts = async () => {
    if (!profile?.username) return;

    setPostsLoading(true);
    try {
      // Use getMyPosts for own profile (includes published posts only for posts tab)
      // Use getUserPosts for other users' profiles
      const result = isOurProfile
        ? await postService.getMyPosts('published')
        : await postService.getUserPosts(profile.username);

      if (result.success && result.data) {
        // Handle both response formats
        const postsData = result.data.posts || result.data;
        setPosts(Array.isArray(postsData) ? postsData : []);
        setPostsLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchDrafts = async () => {
    if (!profile?.username || !isOurProfile) return;

    setDraftsLoading(true);
    try {
      const result = await postService.getMyPosts('draft');
      if (result.success && result.data) {
        const postsData = result.data.posts || result.data;
        setDrafts(Array.isArray(postsData) ? postsData : []);
        setDraftsLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const fetchThreads = async () => {
    if (!profile?.username) return;

    setThreadsLoading(true);
    try {
      // Use getMyThreads for own profile, getUserThreads for others
      const result = isOurProfile
        ? await threadService.getMyThreads()
        : await threadService.getUserThreads(profile.username);

      if (result.success && result.data) {
        // Handle both response formats
        const threadsData = result.data.threads || result.data;
        setThreads(Array.isArray(threadsData) ? threadsData : []);
        setThreadsLoaded(true);
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
    } finally {
      setThreadsLoading(false);
    }
  };

  // Fetch user posts, drafts, and threads only once per tab
  useEffect(() => {
    if (!profile?.username) return;

    if (activeTab === 'posts' && !postsLoaded && !postsLoading) {
      fetchPosts();
    } else if (activeTab === 'drafts' && !draftsLoaded && !draftsLoading) {
      fetchDrafts();
    } else if (activeTab === 'threads' && !threadsLoaded && !threadsLoading) {
      fetchThreads();
    }
  }, [
    profile?.username,
    activeTab,
    isOurProfile,
    postsLoaded,
    postsLoading,
    draftsLoaded,
    draftsLoading,
    threadsLoaded,
    threadsLoading,
  ]);

  // Handle follow/unfollow action
  const handleToggleFollow = async () => {
    if (!handle || isOurProfile) return;
    
    try {
      const result = await userService.toggleFollow(handle);
      if (result.success) {
        // Update local follow state and follower count
        if (result.data.now_following) {
          setFollowerCount(followerCount + 1);
          setFollowing(true);
        } else {
          setFollowerCount(followerCount - 1);
          setFollowing(false);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Toggle follow error:', err);
      setError('Failed to update follow status');
    }
  };

  if (loading) {
    return <Loader message="Loading profile..." subtitle="Please wait while we fetch the profile data" />;
  }

  {/* Show error message if profile failed to load */}
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-snow)]">
        <div className="bg-white rounded-card shadow-card p-8 max-w-md">
          <p className="text-red-600 text-center">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 w-full py-2 px-4 bg-[var(--primary-color-royal)] text-white rounded-input hover:bg-[var(--primary-color-royal-600)] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)]">
      <div className="relative">
        {/* Gradient Header*/}
        <div 
          className="h-48 bg-gradient-to-br from-[var(--primary-color-royal-600)] via-[var(--primary-color-royal-600)] to-[var(--secondary-color-orchid)]"
        />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Avatar */}
          <div className="relative -mt-20 flex justify-center">
            <div className="relative">
              {profile?.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={profile.full_name}
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[var(--primary-color-royal)] to-[var(--secondary-color-orchid)] border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white text-5xl font-bold">
                    {profile?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              {profile?.is_verified && (
                <div className="absolute bottom-2 right-2 bg-[var(--color-gold)] rounded-full p-1.5 border-2 border-white">
                  <BadgeCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>
          </div>

          {/* Profile Information (Name, Username, Bio) */}
          <div className="text-center mt-6 pb-8 border-b border-[var(--border-color-line)]">
            <h1 className="text-[var(--text-color-ink)] font-bold text-3xl mb-2 font-ui">
              {profile?.full_name}
            </h1>

            <div className="flex items-center justify-center gap-1.5 mb-4">
              <span className="text-[var(--text-color-ink-400)] text-lg">
                @{profile?.username}
              </span>
            </div>

            {profile?.bio && (
              <p className="text-[var(--text-color-ink)] text-base max-w-2xl mx-auto mb-6 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Social Media Links (Ig, X, Facebook) */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {profile?.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="white">
                    <use href="/sprite.svg#instagram" />
                  </svg>
                </a>
              )}
              
              {profile?.twitter_url && (
                <a
                  href={profile.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[var(--text-color-ink)] flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="X (Twitter)"
                >
                  <svg className="w-4 h-4" fill="white">
                    <use href="/sprite.svg#x" />
                  </svg>
                </a>
              )}

              {profile?.facebook_url && (
                <a
                  href={profile.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="Facebook"
                >
                  <svg className="w-5 h-5" fill="white">
                    <use href="/sprite.svg#facebook" />
                  </svg>
                </a>
              )}

              {profile?.tiktok_url && (
                <a
                  href={profile.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label="TikTok"
                >
                  <svg className="w-4 h-4" fill="white">
                    <use href="/sprite.svg#tiktok" />
                  </svg>
                </a>
              )}
            </div>

            {/* Stats (Followers, Following) */}
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-[var(--text-color-ink)] font-bold text-2xl font-ui">
                  {followerCount}
                </div>
                <div className="text-[var(--text-color-ink-400)] text-sm">
                  Followers
                </div>
              </div>
              <div className="text-center">
                <div className="text-[var(--text-color-ink)] font-bold text-2xl font-ui">
                  {followingCount}
                </div>
                <div className="text-[var(--text-color-ink-400)] text-sm">
                  Following
                </div>
              </div>
            </div>

            {/* Action Buttons (Edit Profile, Follow/Following) */}
            <div className="flex items-center justify-center gap-3">
              {isOurProfile ? (
                <button
                  onClick={() => navigate('/settings/profile')}
                  className="px-6 py-2 bg-[var(--color-background-snow)] text-[var(--text-color-ink)] font-semibold rounded-input border border-[var(--border-color-line)] hover:bg-[var(--border-color-line)] transition-colors"
                >
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleToggleFollow}
                  className={`px-6 py-2 font-semibold rounded-input transition-colors ${
                    following
                      ? 'bg-[var(--color-background-snow)] text-[var(--text-color-ink)] border border-[var(--border-color-line)] hover:bg-[var(--border-color-line)]'
                      : 'bg-[var(--primary-color-royal)] text-white hover:bg-[var(--primary-color-royal-600)]'
                  }`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          {/* Tabs (Posts, Threads, Drafts) */}
          <div className="flex items-center justify-center gap-12 py-4 border-b border-[var(--border-color-line)]">
            <button
              onClick={() => setActiveTab('posts')}
              className={`relative pb-4 font-semibold transition-colors ${
                activeTab === 'posts'
                  ? 'text-[var(--text-color-ink)]'
                  : 'text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)]'
              }`}
            >
              Posts
              {activeTab === 'posts' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-color-royal)]" />
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('threads')}
              className={`relative pb-4 font-semibold transition-colors ${
                activeTab === 'threads'
                  ? 'text-[var(--text-color-ink)]'
                  : 'text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)]'
              }`}
            >
              Threads
              {activeTab === 'threads' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-color-royal)]" />
              )}
            </button>

            {/* Drafts tab - only show for user own profile */}
            {isOurProfile && (
              <button
                onClick={() => setActiveTab('drafts')}
                className={`relative pb-4 font-semibold transition-colors ${
                  activeTab === 'drafts'
                    ? 'text-[var(--text-color-ink)]'
                    : 'text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)]'
                }`}
              >
                Drafts
                {activeTab === 'drafts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-color-royal)]" />
                )}
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="py-8">
            {activeTab === 'posts' && (
              <>
                {postsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color-royal)]" />
                  </div>
                ) : posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <ProfilePostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[var(--text-color-ink-400)] text-lg">
                      No posts yet
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'threads' && (
              <>
                {threadsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color-royal)]" />
                  </div>
                ) : threads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {threads.map((thread) => (
                      <ThreadProfileCard key={thread.id} thread={thread} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[var(--text-color-ink-400)] text-lg">
                      No threads yet
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'drafts' && (
              <>
                {draftsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color-royal)]" />
                  </div>
                ) : drafts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {drafts.map((post) => (
                      <ProfilePostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-[var(--text-color-ink-400)] text-lg mb-2">
                      No drafts yet
                    </p>
                    <p className="text-[var(--text-color-ink-400)] text-sm">
                      Saved drafts will appear here to make editing easier
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default Profile
