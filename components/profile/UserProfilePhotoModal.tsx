"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Camera,
  Upload,
  Trash2,
  Loader2,
  Check,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthUser } from "@/lib/auth/session";

interface UserProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AuthUser | null;
  onAvatarUpdated?: (newAvatarUrl: string | null) => void;
}

export function UserProfilePhotoModal({
  isOpen,
  onClose,
  user,
  onAvatarUpdated,
}: UserProfilePhotoModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatarUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAvatar = previewUrl || user?.avatarUrl;
  const displayName = user?.name || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds the 5 MB limit. Please select a smaller photo.");
      return;
    }

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError("Invalid image format. Allowed formats: JPEG, PNG, WebP.");
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/user/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload photo.");
      }

      setPreviewUrl(data.avatarUrl);
      setSelectedFile(null);
      setSuccessMsg("Profile photo updated successfully!");
      if (onAvatarUpdated) onAvatarUpdated(data.avatarUrl);

      setTimeout(() => {
        router.refresh();
        onClose();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/user/profile-photo", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove photo.");
      }

      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccessMsg("Profile photo removed.");
      if (onAvatarUpdated) onAvatarUpdated(null);

      setTimeout(() => {
        router.refresh();
        onClose();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove photo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ACCAD5]/20 text-[#3D6472] flex items-center justify-center">
              <Camera className="h-4 w-4 text-[#588594]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Profile Photo</h3>
              <p className="text-[11px] text-slate-400">Upload or change your personal avatar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center space-y-5">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-black text-3xl shadow-lg border-4 border-white overflow-hidden">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-white shadow-md border border-slate-200 text-slate-700 hover:text-[#C66318] hover:bg-slate-50 transition-all cursor-pointer"
              title="Select new image"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-slate-800">{displayName}</h4>
            <p className="text-xs text-slate-400">{user?.email}</p>
            <p className="text-[11px] text-slate-400 pt-1">
              Supports JPEG, PNG, and WebP (Max 5 MB)
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="w-full p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Actions */}
          <div className="w-full flex items-center gap-3 pt-2">
            {selectedFile ? (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ACCAD5] to-[#F0944D] text-slate-950 font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                <span>Choose Photo</span>
              </button>
            )}

            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="py-2.5 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Remove photo"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
