import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { threadService } from "../../services/threadService";
import { toast } from "sonner";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { ReplyList } from "../../components/ThreadComponents";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getFlagEmoji } from "../../utils/countryUtils";
import { Pin, Lock, MessageSquare, Eye } from "lucide-react";

dayjs.extend(relativeTime);

/**
 * ThreadDetailPage Component:
 * Displays Thread content with metadata, author information, and edit/delete thread from author.
 * URL: /u/{username}/threads/{slug}
 * Uses reply list component to show replies and nested replies.
 */

const ThreadDetailPage = () => {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Fetch thread details
  useEffect(() => {
    const fetchThreadDetails = async () => {
      if (!username || !slug) return;

      setLoading(true);
      setError(null);

      try {
        const result = await threadService.getThread(username, slug);

        if (result.success) {
          setThread(result.data);
        } else {
          setError(result.error || "Thread not found");
          toast.error(result.error || "Failed to load thread");
        }
      } catch (error) {
        console.error("Error fetching thread details:", error);
        setError("Failed to load thread");
        toast.error("Failed to load thread");
      } finally {
        setLoading(false);
      }
    };

    fetchThreadDetails();
  }, [username, slug]);

  // Fetch thread replies
  useEffect(() => {
    const fetchReplies = async () => {
      if (!username || !slug) return;

      setLoadingReplies(true);
      try {
        const result = await threadService.getThreadReplies(username, slug);
        if (result.success) {
          setReplies(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching replies:", error);
      } finally {
        setLoadingReplies(false);
      }
    };

    fetchReplies();
  }, [username, slug]);


  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this thread?")) return;

    try {
      const result = await threadService.deleteThread(username, slug);

      if (result.success) {
        toast.success("Thread deleted successfully");
        navigate(-1); // Go back to previous page
      } else {
        toast.error(result.error || "Failed to delete thread");
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
      toast.error("Failed to delete thread");
    }
  };

  const handleEdit = () => {
    navigate(`/u/${username}/threads/${slug}/edit`);
  };

  // Handle top-level reply from the main form
  const handleReplySuccess = (newReply) => {
    // If newReply is a top-level reply it gets added to list
    // If reply is nested, count gets incremented
    if (newReply) {
      setReplies([...replies, newReply]);
      toast.success("Reply posted successfully!");
    }
    setThread(prev => ({
      ...prev,
      reply_count: (prev.reply_count || 0) + 1
    }));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Breadcrumbs />
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !thread) {
    return (
      <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <Breadcrumbs />
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-[var(--text-color-ink)] mb-2">
                Thread Not Found
              </h2>
              <p className="text-[var(--text-color-ink-400)] mb-8">
                {error || "This thread doesn't exist or has been deleted."}
              </p>
              <button
                onClick={() => navigate(-1)}
                className="bg-[var(--primary-color-royal)] text-white px-6 py-3 rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = user && user.username === thread.author_username;

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Breadcrumbs */}
          <div className="mb-6">
            <Breadcrumbs />
          </div>

          {/* Thread Content */}
          <div className="bg-white rounded-card shadow-card p-8 mb-6">
            
            {/* Header: Category, Country, Status Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {thread.is_pinned && (
                <span className="inline-flex items-center px-3 py-1 rounded-pill text-sm font-medium bg-yellow-100 text-yellow-800">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              
              {thread.is_locked && (
                <span className="inline-flex items-center px-3 py-1 rounded-pill text-sm font-medium bg-gray-100 text-gray-800">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}

              {thread.category_name && (
                <span
                  onClick={() => navigate(`/threads?category=${thread.category_slug}`)}
                  className="inline-flex items-center px-3 py-1 rounded-pill text-sm font-medium bg-[var(--color-background-snow)] text-[var(--text-color-ink)] hover:bg-[var(--primary-color-royal)] hover:text-white cursor-pointer transition-colors"
                >
                  {thread.category_name}
                  {thread.subcategory_name && ` • ${thread.subcategory_name}`}
                </span>
              )}

              {thread.country_code && (
                <span className="inline-flex items-center px-3 py-1 rounded-pill text-sm font-medium bg-blue-50 text-blue-700">
                  {getFlagEmoji(thread.country_code)} {thread.country_name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-[var(--text-color-ink)] mb-6 font-editorial">
              {thread.title}
            </h1>

            {/* Author Info */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--border-color-line)]">
              <div className="flex items-center gap-4">
                {thread.author_profile_image ? (
                  <img
                    src={thread.author_profile_image}
                    alt={thread.author_username}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    onClick={() => navigate(`/profile/${thread.author_username}`)}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full bg-[var(--color-background-snow)] flex items-center justify-center cursor-pointer"
                    onClick={() => navigate(`/profile/${thread.author_username}`)}
                  >
                    <span className="text-xl font-semibold text-[var(--text-color-ink)]">
                      {thread.author_username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div>
                  <button
                    onClick={() => navigate(`/profile/${thread.author_username}`)}
                    className="font-semibold text-[var(--text-color-ink)] hover:text-[var(--primary-color-royal)] transition-colors"
                  >
                    {thread.author_full_name || thread.author_username}
                  </button>
                  <p className="text-sm text-[var(--text-color-ink-400)]">
                    Posted {dayjs(thread.created_at).fromNow()}
                    {thread.created_at !== thread.updated_at && " (edited)"}
                  </p>
                </div>
              </div>

              {/* Edit/Delete Buttons for Author */}
              {isAuthor && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    disabled={thread.is_locked}
                    className="px-4 py-2 text-sm font-medium text-[var(--primary-color-royal)] border border-[var(--primary-color-royal)] rounded-input hover:bg-[var(--primary-color-royal)] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-input hover:bg-red-600 hover:text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="prose max-w-none mb-6">
              <p className="text-[var(--text-color-ink)] whitespace-pre-wrap leading-relaxed">
                {thread.content}
              </p>
            </div>

            {/* Replies and view counts from the thread */}
            <div className="flex items-center gap-6 text-sm text-[var(--text-color-ink-400)] pt-6 border-t border-[var(--border-color-line)]">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> {thread.reply_count || 0} {thread.reply_count === 1 ? "reply" : "replies"}
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> {thread.view_count || 0} {thread.view_count === 1 ? "view" : "views"}
              </span>
            </div>
          </div>

          {/* Replies Section */}
          <ReplyList
            replies={replies}
            replyCount={thread.reply_count}
            threadUsername={username}
            threadSlug={slug}
            isLocked={thread.is_locked}
            loading={loadingReplies}
            onReplySuccess={handleReplySuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default ThreadDetailPage;
