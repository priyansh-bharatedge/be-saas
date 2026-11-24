"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  Trash2,
  Loader2,
  Download,
  ExternalLink,
  Users,
  User,
  ZoomIn,
} from "lucide-react";

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  title: string;
  subtitle?: string;
  canEdit?: boolean;
  onUploadPhoto?: (file: File) => Promise<void>;
  onRemovePhoto?: () => Promise<void>;
}

export function PhotoLightboxModal({
  isOpen,
  onClose,
  photoUrl,
  title,
  subtitle,
  canEdit = false,
  onUploadPhoto,
  onRemovePhoto,
}: PhotoLightboxModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadPhoto) return;

    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds 5 MB limit.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Allowed formats: JPEG, PNG, WebP.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUploadPhoto(file);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!onRemovePhoto || !confirm("Are you sure you want to remove this photo?")) return;
    setIsProcessing(true);
    setError(null);
    try {
      await onRemovePhoto();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md select-none">
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 p-4 sm:p-6 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-bold truncate text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit Controls if canEdit */}
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Change photo"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Change Photo</span>
                </button>

                {photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold backdrop-blur-md border border-rose-400/30 transition-all cursor-pointer disabled:opacity-50"
                    title="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}

            {/* Download Button if photo exists */}
            {photoUrl && (
              <a
                href={photoUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Open original / download"
              >
                <Download className="h-4 w-4" />
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Canvas */}
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-12 relative"
        >
          {error && (
            <div className="absolute top-20 z-30 px-4 py-2 rounded-xl bg-rose-500/90 text-white text-xs font-semibold shadow-lg backdrop-blur-md">
              {error}
            </div>
          )}

          {photoUrl ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
            >
              <img
                src={photoUrl}
                alt={title}
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.6)] border border-white/10"
              />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-[#ACCAD5]/40 to-[#F0944D]/40 text-white flex items-center justify-center font-black text-5xl shadow-2xl border-4 border-white/20 backdrop-blur-xl">
                {title.charAt(0).toUpperCase()}
              </div>
              <div className="text-slate-400 text-sm">
                No profile photo uploaded
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Upload Photo Now</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}
