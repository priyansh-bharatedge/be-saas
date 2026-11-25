"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileAttachment } from "@/lib/validations/operation";

interface R2MultiFileUploadProps {
  value?: FileAttachment[];
  onChange: (files: FileAttachment[]) => void;
  folder?: string;
  disabled?: boolean;
  label?: string;
  accept?: string;
}

export function R2MultiFileUpload({
  value = [],
  onChange,
  folder = "operations",
  disabled = false,
  label = "Upload Documents (Multiple)",
  accept,
}: R2MultiFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const files = Array.isArray(value) ? value : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const newAttachments: FileAttachment[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 25 MB limit.`);
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        newAttachments.push({
          url: data.url,
          name: data.fileName || file.name,
          size: data.fileSize || file.size,
          key: data.key,
          mimeType: data.mimeType || file.type,
        });
      }

      onChange([...files, ...newAttachments]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload files");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const updated = files.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (f: FileAttachment) => {
    return (
      (f.mimeType && f.mimeType.startsWith("image/")) ||
      /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name || f.url)
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
          <span>{label}</span>
          {files.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {files.length}
            </span>
          )}
        </label>
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-[11px] text-[#C66318] hover:text-[#A75010] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-3.5 w-3.5" />
                <span>+ Add Files</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {uploadError && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {files.length === 0 ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`p-3 rounded-xl border border-dashed text-center transition-all ${
            disabled
              ? "border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-300 hover:border-[#ACCAD5] bg-white hover:bg-slate-50/50 cursor-pointer text-slate-500"
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <UploadCloud className="h-4 w-4 text-slate-400" />
            <p className="text-[11px]">
              {disabled
                ? "No files attached"
                : "Click to upload files (multi-file supported, max 25MB each)"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600 overflow-hidden">
                  {isImage(file) ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-[#588594]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  {file.size && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="View / Download"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
