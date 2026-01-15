import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ReplyItem from "./ReplyItem";
import ThreadReplyForm from "../ThreadForm/ThreadReplyForm";
import { Lock, MessageCircle } from "lucide-react";

/**
 * ReplyList Component:
 * Displays the list of replies for a thread with the reply form.
 * Handles authentication prompts and locked thread states.
 */

const ReplyList = ({
  replies,
  replyCount,
  threadUsername,
  threadSlug,
  isLocked,
  loading,
  onReplySuccess
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Navigate to login/signup with redirect back to current page
  const handleAuthRedirect = (path) => {
    navigate(path, { state: { from: location.pathname } });
  };

  return (
    <section className="bg-white rounded-card shadow-card antialiased">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-0">
        <h2 className="text-lg lg:text-2xl font-bold text-[var(--text-color-ink)] font-editorial">
          Discussion ({replyCount || 0})
        </h2>
      </div>

      {/* Reply Form - Shows when user is authenticated and thread not locked */}
      {!isLocked && user && (
        <div className="p-6">
          <ThreadReplyForm
            threadUsername={threadUsername}
            threadSlug={threadSlug}
            onSuccess={onReplySuccess}
          />
        </div>
      )}

      {/* Message if thread is locked */}
      {isLocked && (
        <div className="mx-6 mb-4 p-4 bg-[var(--color-background-snow)] rounded-lg border border-[var(--border-color-line)]">
          <p className="text-[var(--text-color-ink-400)] flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4" />
            This thread is locked. No new replies can be added.
          </p>
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!isLocked && !user && (
        <div className="mx-6 mb-4 py-4 px-4 bg-[var(--color-background-snow)] rounded-lg border border-[var(--border-color-line)]">
          <p className="text-sm text-[var(--text-color-ink)] text-center">
            <button
              onClick={() => handleAuthRedirect('/login')}
              className="text-[var(--primary-color-royal)] hover:underline font-semibold"
            >
              Log in
            </button>
            {" "}or{" "}
            <button
              onClick={() => handleAuthRedirect('/signup')}
              className="text-[var(--primary-color-royal)] hover:underline font-semibold"
            >
              sign up
            </button>
            {" "}to join the discussion.
          </p>
        </div>
      )}

      {/* Replies List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : replies.length > 0 ? (
        <div>
          {replies.map((reply, index) => (
            <div 
              key={reply.id}
              className={`${index > 0 ? 'border-t border-[var(--border-color-line)]' : ''}`}
            >
              <ReplyItem
                reply={reply}
                threadUsername={threadUsername}
                threadSlug={threadSlug}
                isLocked={isLocked}
                depth={0}
                isFirst={index === 0}
                onReplyAdded={onReplySuccess}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-6">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[var(--border-color-line)]" />
          <p className="text-[var(--text-color-ink-400)] font-medium">
            No replies yet
          </p>
          <p className="text-sm text-[var(--text-color-ink-400)] mt-1">
            Be the first to share your thoughts!
          </p>
        </div>
      )}
    </section>
  );
};

export default ReplyList;
