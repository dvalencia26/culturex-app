import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImageBlob } from '../utils/cropImage';

const ProfileCropModal = ({ imageSrc, onConfirm, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key to improve accessibility
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !processing) onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel, processing]);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--color-white)] rounded-card shadow-card w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color-line)]">
          <h2 className="text-lg font-semibold text-[var(--text-color-ink)]">
            Crop Profile Photo
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            aria-label="Close"
            className="text-[var(--text-color-ink-400)] hover:text-[var(--text-color-ink)] transition-colors disabled:opacity-60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area using react-easy-crop */}
        <div className="relative w-full aspect-square bg-[var(--text-color-ink)]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-6 py-3 flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-[var(--text-color-ink-400)] shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--primary-color-royal)]"
          />
          <ZoomIn className="w-4 h-4 text-[var(--text-color-ink-400)] shrink-0" />
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-[var(--border-color-line)] flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-5 py-2.5 border border-[var(--border-color-line)] text-[var(--text-color-ink)] rounded-input font-medium hover:bg-[var(--color-background-snow)] transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="px-5 py-2.5 bg-[var(--primary-color-royal)] text-white rounded-input font-semibold hover:bg-[var(--primary-color-royal-600)] transition-colors disabled:opacity-60"
          >
            {processing ? 'Cropping...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCropModal;
