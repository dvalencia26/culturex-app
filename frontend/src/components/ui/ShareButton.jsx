import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Share2, Clipboard, ClipboardCheck, X, Loader2 } from "lucide-react";
import shareService from "../../services/shareService";

const ShareButton = ({ text, contentType, contentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch share link when modal opens
  useEffect(() => {
    if (isOpen && contentType && contentId) {
      setLoading(true);
      setError(null);
      shareService.getShareLink(contentType, contentId)
        .then((result) => {
          if (result.success) {
            setShareUrl(result.data.url);
          } else {
            setError(result.error);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, contentType, contentId]);

  // Set personalized messages based on content type and social platform
  const siteName = "Our Routes";
  const contentLabel = contentType === 'thread' ? 'discussion' : 'post';
  
  const shareMessages = {
    whatsapp: `${text}\nRead the full ${contentLabel} on ${siteName}: ${shareUrl}`,
    twitter: `${text}\nRead more on ${siteName}\n${shareUrl}`,
    linkedin: shareUrl, // just need URL, LinkedIn pulls OG tags
    facebook: shareUrl, // just need URL, Facebook pulls OG tags
  };

  // Social media share handlers
  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessages.whatsapp)}`, "_blank");
  };

  const handleTwitterShare = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.twitter)}`, "_blank");
  };

  const handleLinkedInShare = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  // Clipboard functionality
  const handleCopy = () => {
    const copyText = `${text} - Read on ${siteName}: ${shareUrl}`;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Check if Web Share API is available (for native share option)
  const canNativeShare = typeof navigator !== "undefined" && navigator.share;

  const socialButtons = [
    {
      name: "WhatsApp",
      icon: "whatsapp",
      bg: "bg-[#25D366]",
      hoverBg: "hover:bg-[#1ebe57]",
      onClick: handleWhatsAppShare,
    },
    {
      name: "Facebook",
      icon: "facebook",
      bg: "bg-[#1877F2]",
      hoverBg: "hover:bg-[#1565d8]",
      onClick: handleFacebookShare,
    },
    {
      name: "X",
      icon: "x",
      bg: "bg-[var(--text-color-ink)]",
      hoverBg: "hover:bg-[#333]",
      onClick: handleTwitterShare,
    },
    {
      name: "LinkedIn",
      icon: "linkedin",
      bg: "bg-[#0A66C2]",
      hoverBg: "hover:bg-[#084d93]",
      onClick: handleLinkedInShare,
    },
  ];

  return (
    <>
      {/* Main Share Button */}
      <button
        className="px-4 py-2 bg-[var(--primary-color-royal)] text-white rounded-input font-semibold flex items-center gap-2 hover:bg-[var(--primary-color-royal-600)] transition-colors"
        onClick={() => setIsOpen(true)}
        aria-label="Share"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {/* Share Modal - centered, rendered via portal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Panel */}
          <div className="relative bg-white rounded-card shadow-card border border-[var(--border-color-line)] p-6 w-full max-w-sm">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-[var(--text-color-ink)] font-semibold text-lg mb-4">
              Share this {contentLabel}
            </h3>

            {/* Social Media Grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {socialButtons.map((social) => (
                <button
                  key={social.name}
                  onClick={social.onClick}
                  disabled={loading || !shareUrl}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg ${social.bg} ${social.hoverBg} transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  aria-label={`Share on ${social.name}`}
                >
                  <svg className="w-5 h-5" fill="white">
                    <use href={`/sprite.svg#${social.icon}`} />
                  </svg>
                  <span className="text-white text-xs font-medium">
                    {social.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center justify-center gap-2 mb-4 text-[var(--text-color-ink-400)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating share link...</span>
              </div>
            )}

            {/* Native Share (if available) */}
            {canNativeShare && (
              <button
                onClick={() => {
                  navigator.share({ 
                    title: text, 
                    text: `Check out this ${contentLabel} on ${siteName}`,
                    url: shareUrl 
                  });
                  setIsOpen(false);
                }}
                disabled={loading || !shareUrl}
                className="w-full mb-3 py-2 px-4 bg-[var(--color-background-snow)] text-[var(--text-color-ink)] rounded-input border border-[var(--border-color-line)] hover:bg-[var(--border-color-line)] transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                More sharing options
              </button>
            )}

            {/* Copy Link */}
            <div className="border-t border-[var(--border-color-line)] pt-3">
              <p className="text-sm text-[var(--text-color-ink-400)] mb-2">Or copy link</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  placeholder={loading ? "Loading..." : ""}
                  className="flex-1 px-3 py-2 bg-[var(--color-background-snow)] border border-[var(--border-color-line)] rounded-input text-sm text-[var(--text-color-ink-400)] truncate"
                />
                <button
                  onClick={handleCopy}
                  disabled={loading || !shareUrl}
                  className={`px-3 py-2 rounded-input font-medium text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-[var(--primary-color-royal)] text-white hover:bg-[var(--primary-color-royal-600)]"
                  }`}
                >
                  {copied ? <ClipboardCheck className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ShareButton;
