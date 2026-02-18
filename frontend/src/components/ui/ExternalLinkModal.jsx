import { useEffect } from 'react';
import { X, ExternalLink, ShieldAlert } from 'lucide-react';

/**
 * The purpose of this component is to provide a security confirmation modal showing full URL + domain before opening any external links in a new tab. 
 * This is to ensure users are aware they are leaving the site and can make choose to open the link or cancel.
 *
 */

const ExternalLinkModal = ({ url, onConfirm, onCancel }) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  // Extract domain from URL
  const getDomain = (urlString) => {
    try {
      const parsed = new URL(urlString);
      return parsed.hostname;
    } catch {
      return urlString;
    }
  };

  // Use rel="noopener noreferrer" for security when opening new tab
  const handleConfirm = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--color-white)] rounded-card shadow-card w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color-line)]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-[var(--text-color-ink)]">
              External Link
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[var(--text-color-ink)]">
            You are about to leave this site and visit an external link:
          </p>

          {/* URL display box */}
          <div className="bg-gray-50 border border-[var(--border-color-line)] rounded-md p-3">
            <p className="text-xs text-[var(--text-color-ink-400)] mb-1 font-medium">
              Domain: <span className="text-[var(--text-color-ink)]">{getDomain(url)}</span>
            </p>
            <p className="text-sm font-mono text-[var(--text-color-ink)] break-all select-all">
              {url}
            </p>
          </div>

          <p className="text-xs text-[var(--text-color-ink-400)] leading-relaxed">
            This link was provided by the author of the Post. Make sure you trust this URL before proceeding.
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-[var(--border-color-line)] flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 border border-[var(--border-color-line)] text-[var(--text-color-ink)] rounded-input font-medium hover:bg-[var(--color-background-snow)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-[var(--primary-color-royal)] text-[var(--color-white)] rounded-input font-medium hover:bg-[var(--primary-color-royal-600)] transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalLinkModal;
