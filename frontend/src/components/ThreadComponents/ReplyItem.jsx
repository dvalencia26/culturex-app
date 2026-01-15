import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { threadService } from "../../services/threadService";
import ThreadReplyForm from "../ThreadForm/ThreadReplyForm";
import { toast } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

dayjs.extend(relativeTime);

/**
 * ReplyItem Component:
 * Displays a single reply with nested replies if any.
 * Handles reply button, nested reply form, and recursive child replies.
 * Design inspired from flowbite component here and replylist.jsx
 */

const ReplyItem = ({ 
  reply, 
  threadUsername, 
  threadSlug, 
  isLocked,
  depth = 0,
  isFirst = false,
  onReplyAdded 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [childReplies, setChildReplies] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);

  const maxDepth = 4; // Maximum depth for nested replies
  const effectiveDepth = Math.min(depth, maxDepth);

  // Load nested replies based on reply ID
  const handleLoadChildren = async () => {
    if (childrenLoaded) {
      setShowChildren(!showChildren);
      return;
    }

    setLoadingChildren(true);
    try {
      const result = await threadService.getNestedReplies(reply.id);
      if (result.success) {
        setChildReplies(result.data || []);
        setChildrenLoaded(true);
        setShowChildren(true);
      }
    } catch (error) {
      console.error("Error loading nested replies:", error);
    } finally {
      setLoadingChildren(false);
    }
  };

  // Handle successful reply submission
  const handleReplySuccess = (newReply) => {
    setChildReplies(prev => [...prev, newReply]);
    setChildrenLoaded(true);
    setShowChildren(true);
    setShowReplyForm(false);
    toast.success("Reply posted successfully!");
    
    // Only notify parent to increment count, reply data is not needed
    // This prevents the reply from being added to top-level replies
    if (onReplyAdded) {
      onReplyAdded();
    }
  };

  // Determine container classes based on depth
  // effectiveDepth caps visual nesting at maxDepth to prevent excessive indentation
  const containerClasses = effectiveDepth === 0
    ? 'p-6'
    : `p-4 mb-4 ml-6 lg:ml-12 bg-[var(--color-background-snow)] rounded-lg`;

  return (
    <article className={containerClasses}>
      {/* Reply Header with author info and timestamp */}
      <footer className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          {/* Author Profile Image + Name */}
          <button
            onClick={() => navigate(`/profile/${reply.author_username}`)}
            className="inline-flex items-center mr-3 text-sm text-[var(--text-color-ink)] font-semibold hover:text-[var(--primary-color-royal)] transition-colors"
          >
            {reply.author_profile_image ? (
              <img
                src={reply.author_profile_image}
                alt={reply.author_username}
                className="mr-2 w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="mr-2 w-6 h-6 rounded-full bg-[var(--primary-color-royal)] flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {reply.author_username?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {reply.author_full_name || reply.author_username}
          </button>
          
          {/* Timestamp */}
          <p className="text-sm text-[var(--text-color-ink-400)]">
            <time dateTime={reply.created_at} title={dayjs(reply.created_at).format('MMMM D, YYYY')}>
              {dayjs(reply.created_at).fromNow()}
            </time>
            {reply.created_at !== reply.updated_at && (
              <span className="italic"> </span>
            )}
          </p>
        </div>
      </footer>

      {/* Reply Content */}
      <p className="text-[var(--text-color-ink-400)] leading-relaxed whitespace-pre-wrap">
        {reply.content}
      </p>

      {/* Reply Actions */}
      <div className="flex items-center mt-4 space-x-4">
        {/* Reply Button */}
        {!isLocked && user && (
          <button
            type="button"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center text-sm text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] hover:underline font-medium transition-colors"
          >
            <MessageCircle className="mr-1.5 w-3.5 h-3.5" />
            Reply
          </button>
        )}

        {/* Show/Hide Nested Replies */}
        {reply.child_replies_count > 0 && (
          <button
            type="button"
            onClick={handleLoadChildren}
            disabled={loadingChildren}
            className="flex items-center text-sm text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] hover:underline font-medium transition-colors disabled:opacity-50"
          >
            {loadingChildren ? (
              <div className="mr-1.5 w-3.5 h-3.5 border-2 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin" />
            ) : showChildren ? (
              <ChevronUp className="mr-1.5 w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="mr-1.5 w-3.5 h-3.5" />
            )}
            {showChildren ? 'Hide' : 'View'} {reply.child_replies_count} {reply.child_replies_count === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="mt-4">
          <ThreadReplyForm
            threadUsername={threadUsername}
            threadSlug={threadSlug}
            parentReplyId={reply.id}
            onSuccess={handleReplySuccess}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {/* Nested Replies */}
      {showChildren && childReplies.length > 0 && (
        <div className="mt-4">
          {childReplies.map((childReply, index) => (
            <ReplyItem
              key={childReply.id}
              reply={childReply}
              threadUsername={threadUsername}
              threadSlug={threadSlug}
              isLocked={isLocked}
              depth={depth + 1}
              isFirst={index === 0}
              onReplyAdded={onReplyAdded}
            />
          ))}
        </div>
      )}
    </article>
  );
};

export default ReplyItem;
