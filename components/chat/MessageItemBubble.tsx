"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Image as ImageIcon,
  ExternalLink,
  X,
} from "lucide-react";
import { MessageItem } from "@/lib/actions/chat";

interface MessageItemBubbleProps {
  message: MessageItem;
  showDateSeparator?: boolean;
  dateLabel?: string;
  isGroup?: boolean;
}

export function MessageItemBubble({
  message,
  showDateSeparator,
  dateLabel,
  isGroup,
}: MessageItemBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime?: string | null, name?: string | null) => {
    const ext = (name || "").split(".").pop()?.toLowerCase();
    if (mime?.includes("pdf") || ext === "pdf") {
      return <FileText className="h-5 w-5 text-rose-500" />;
    }
    if (
      mime?.includes("sheet") ||
      mime?.includes("excel") ||
      mime?.includes("csv") ||
      ext === "xlsx" ||
      ext === "csv"
    ) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
    }
    if (mime?.includes("word") || ext === "docx" || ext === "doc") {
      return <FileText className="h-5 w-5 text-blue-600" />;
    }
    return <File className="h-5 w-5 text-[#588594]" />;
  };

  return (
    <div className="space-y-3">
      {/* Date Separator */}
      {showDateSeparator && dateLabel && (
        <div className="flex items-center justify-center my-4">
          <span className="px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/70 text-[10px] font-semibold text-slate-500 shadow-2xs">
            {dateLabel}
          </span>
        </div>
      )}

      {/* Message Row */}
      <div
        className={`flex items-end gap-2 ${
          message.isSelf ? "justify-end" : "justify-start"
        }`}
      >
        {/* Other participant avatar (for received messages in group chats) */}
        {!message.isSelf && isGroup && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 shadow-2xs">
            {message.senderInitials}
          </div>
        )}

        <div
          className={`max-w-[78%] sm:max-w-[65%] rounded-2xl p-3.5 transition-shadow shadow-xs ${
            message.isSelf
              ? "bg-gradient-to-br from-[#EBF3F6] via-[#E2EDF1] to-[#CBDDE4] border border-[#ACCAD5]/70 text-slate-900 rounded-br-sm"
              : "bg-white border border-slate-200/80 text-slate-900 rounded-bl-sm"
          }`}
        >
          {/* Sender label (for received messages in group chat) */}
          {!message.isSelf && isGroup && (
            <div className="text-[11px] font-bold text-[#C66318] mb-1 flex items-center gap-1.5">
              <span>{message.senderName}</span>
              {message.senderDepartment && (
                <span className="text-[9px] font-normal text-slate-400">
                  • {message.senderDepartment}
                </span>
              )}
            </div>
          )}

          {/* Image Attachment with Lightbox */}
          {message.messageType === "IMAGE" && message.attachmentUrl && (
            <div className="mb-2 overflow-hidden rounded-xl border border-slate-200/60 bg-slate-900/5">
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || "Attachment"}
                onClick={() => setLightboxOpen(true)}
                className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
              />
            </div>
          )}

          {/* Document / File Attachment Card */}
          {(message.messageType === "DOCUMENT" || message.messageType === "FILE") &&
            message.attachmentUrl && (
              <div className="mb-2 p-2.5 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0">
                    {getFileIcon(message.attachmentMimeType, message.attachmentName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {message.attachmentName || "Download File"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(message.attachmentSize)}
                    </p>
                  </div>
                </div>

                <a
                  href={message.attachmentUrl}
                  download={message.attachmentName || "file"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-[#EBF3F6] hover:bg-[#CBDDE4] text-[#3D6472] transition-colors shrink-0"
                  title="Download File"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            )}

          {/* Text Content */}
          {message.content && (
            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Timestamp */}
          <div
            className={`text-[9px] mt-1 text-right font-medium ${
              message.isSelf ? "text-[#588594]" : "text-slate-400"
            }`}
          >
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Full Image View */}
      {lightboxOpen && message.attachmentUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={message.attachmentUrl}
              alt="Enlarged preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
