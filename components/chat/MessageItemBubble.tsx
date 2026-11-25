"use client";

import { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  File,
  Download,
  Image as ImageIcon,
  Check,
  CheckCheck,
  X,
  Plus,
  Smile,
} from "lucide-react";
import { MessageItem, ChatAttachmentItem } from "@/lib/actions/chat";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { openDocumentPreview } from "@/components/modals/DocumentPreviewModal";

interface MessageItemBubbleProps {
  message: MessageItem;
  showDateSeparator?: boolean;
  dateLabel?: string;
  isGroup?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  isOversightMode?: boolean;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageItemBubble({
  message,
  showDateSeparator,
  dateLabel,
  isGroup,
  onToggleReaction,
  isOversightMode = false,
}: MessageItemBubbleProps) {
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);

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

  // Compile full list of attachments (support multi-attachment array and legacy single fields)
  const allAttachments: ChatAttachmentItem[] =
    message.attachments && message.attachments.length > 0
      ? message.attachments
      : message.attachmentUrl
      ? [
          {
            url: message.attachmentUrl,
            name: message.attachmentName || "Attachment",
            size: message.attachmentSize || 0,
            mimeType: message.attachmentMimeType || "",
            messageType:
              message.messageType === "IMAGE"
                ? "IMAGE"
                : message.messageType === "DOCUMENT"
                ? "DOCUMENT"
                : "FILE",
          },
        ]
      : [];

  const imageAttachments = allAttachments.filter(
    (a) => a.messageType === "IMAGE" || a.mimeType?.startsWith("image/")
  );
  const fileAttachments = allAttachments.filter(
    (a) => a.messageType !== "IMAGE" && !a.mimeType?.startsWith("image/")
  );

  const isSystemNotice =
    !message.attachmentUrl &&
    (!message.attachments || message.attachments.length === 0) &&
    typeof message.content === "string" &&
    (message.content.includes("changed this group's settings") ||
      message.content.includes("left the group") ||
      message.content.includes("restricted ") ||
      message.content.includes("allowed ") ||
      message.content.includes("group's icon") ||
      message.content.includes("was created"));

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

      {/* System Notice Capsule or Regular Message Row */}
      {isSystemNotice ? (
        <div className="flex items-center justify-center my-2">
          <span className="px-3.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/70 shadow-2xs text-[11px] text-slate-500 font-medium text-center max-w-md">
            {message.content}
          </span>
        </div>
      ) : (
        /* Message Row */
        <div
          className={`group/msg relative flex items-end gap-2 ${
            message.isSelf ? "justify-end" : "justify-start"
          }`}
        >
          {/* Other participant avatar (for received messages in group chats) */}
          {!message.isSelf && isGroup && (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mb-1 shadow-2xs overflow-hidden">
              {message.senderAvatarUrl ? (
                <img
                  src={message.senderAvatarUrl}
                  alt={message.senderName}
                  className="w-full h-full object-cover"
                />
              ) : (
                message.senderInitials
              )}
            </div>
          )}

          <div className="relative group/bubble max-w-[85%] sm:max-w-[70%]">
            {/* Floating Quick Reaction Bar (WhatsApp Style on Hover - Disabled in Oversight Mode) */}
            {!isOversightMode && onToggleReaction && (
              <div
                className={`absolute -top-7 ${
                  message.isSelf ? "right-1" : "left-1"
                } z-20 transition-all duration-150 ${
                  isCustomPickerOpen
                    ? "opacity-100 pointer-events-auto scale-100"
                    : "opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto scale-95 group-hover/bubble:scale-100"
                }`}
              >
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
                  {QUICK_REACTIONS.map((emoji) => {
                    const isReacted = message.reactions?.some(
                      (r) => r.emoji === emoji && r.hasReacted
                    );
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onToggleReaction?.(message.id, emoji)}
                        className={`h-6 w-6 flex items-center justify-center rounded-full text-sm leading-none transition-transform hover:scale-130 active:scale-95 ${
                          isReacted ? "bg-[#ACCAD5]/30 ring-1 ring-[#588594]" : "hover:bg-slate-100"
                        }`}
                        title={emoji}
                      >
                        <span>{emoji}</span>
                      </button>
                    );
                  })}

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Plus button to open full emoji picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCustomPickerOpen((prev) => !prev)}
                      className={`h-6 w-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
                        isCustomPickerOpen ? "bg-[#EBF3F6] text-[#588594]" : ""
                      }`}
                      title="More reactions..."
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <EmojiPickerPopover
                      isOpen={isCustomPickerOpen}
                      onClose={() => setIsCustomPickerOpen(false)}
                      onSelectEmoji={(emoji) => {
                        onToggleReaction?.(message.id, emoji);
                        setIsCustomPickerOpen(false);
                      }}
                      position={message.isSelf ? "top-right" : "top-left"}
                      title="React with emoji"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Message Bubble Container */}
            <div
              className={`w-full rounded-2xl p-3 sm:p-3.5 transition-shadow shadow-xs ${
                message.isSelf
                  ? "bg-gradient-to-br from-[#EBF3F6] via-[#E2EDF1] to-[#CBDDE4] border border-[#ACCAD5]/70 text-slate-900 rounded-br-xs"
                  : "bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs"
              }`}
            >
              {/* Sender label (for received messages in group chat) */}
              {!message.isSelf && isGroup && (
                <div className="text-[11px] font-bold text-[#C66318] mb-1.5 flex items-center gap-1.5">
                  <span>{message.senderName}</span>
                  {message.senderDepartment && (
                    <span className="text-[9px] font-normal text-slate-400">
                      • {message.senderDepartment}
                    </span>
                  )}
                </div>
              )}

              {/* Multiple / Single Image Attachments */}
              {imageAttachments.length > 0 && (
                <div className="mb-2">
                  {imageAttachments.length === 1 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-slate-900/5">
                      <img
                        src={imageAttachments[0].url}
                        alt={imageAttachments[0].name || "Photo attachment"}
                        onClick={() => setActiveLightboxUrl(imageAttachments[0].url)}
                        className="max-h-72 w-full object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div
                      className={`grid gap-1.5 rounded-xl overflow-hidden ${
                        imageAttachments.length === 2
                          ? "grid-cols-2"
                          : imageAttachments.length === 3
                          ? "grid-cols-3"
                          : "grid-cols-2"
                      }`}
                    >
                      {imageAttachments.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square overflow-hidden rounded-lg bg-slate-900/5 border border-slate-200/60"
                        >
                          <img
                            src={img.url}
                            alt={img.name || `Photo ${idx + 1}`}
                            onClick={() => setActiveLightboxUrl(img.url)}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Document / File Attachments List */}
              {fileAttachments.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {fileAttachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/90 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div
                        onClick={() => openDocumentPreview(file.url, file.name)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        title="Click to preview file"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0">
                          {getFileIcon(file.mimeType, file.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate hover:underline">
                            {file.name || "Preview File"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <a
                        href={file.url}
                        download={file.name || "file"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-[#EBF3F6] hover:bg-[#CBDDE4] text-[#3D6472] transition-colors shrink-0"
                        title={`Download ${file.name}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Content */}
              {message.isDeleted ? (
                <div className="py-1 flex items-center gap-1.5 text-xs text-slate-400 italic">
                  <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/80 text-[10px] font-semibold not-italic">
                    Deleted by sender
                  </span>
                  <span>{message.content || "This message was deleted."}</span>
                </div>
              ) : (
                message.content && (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                )
              )}

              {/* Timestamp & WhatsApp-Style Read Receipts (Blue Ticks) */}
              <div
                className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 font-medium ${
                  message.isSelf ? "text-[#588594]" : "text-slate-400"
                }`}
              >
                <span>{formatTime(message.createdAt)}</span>

                {/* Read Receipt Ticks (Only for Sent Messages) */}
                {message.isSelf && (
                  <span
                    className="inline-flex items-center ml-0.5"
                    title={
                      message.status === "READ"
                        ? "Read by recipient"
                        : message.status === "DELIVERED"
                        ? "Delivered"
                        : "Sent"
                    }
                  >
                    {message.status === "READ" ? (
                      // Double Blue Ticks (WhatsApp #53bdeb sky blue)
                      <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] stroke-[2.5]" />
                    ) : message.status === "DELIVERED" ? (
                      // Double Grey Ticks (Delivered to server / recipient inbox)
                      <CheckCheck className="h-3.5 w-3.5 text-slate-400 stroke-[2]" />
                    ) : (
                      // Single Grey Tick (Sent / Optimistic)
                      <Check className="h-3.5 w-3.5 text-slate-400 stroke-[2]" />
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Compact Reaction Pills (WhatsApp Style) */}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`flex flex-wrap items-center gap-1 mt-1 ${
                  message.isSelf ? "justify-end" : "justify-start"
                }`}
              >
                {message.reactions.map((r) => {
                  const userList = r.users.map((u) => u.name).join(", ");
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => onToggleReaction?.(message.id, r.emoji)}
                      title={userList}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 border active:scale-95 shadow-2xs ${
                        r.hasReacted
                          ? "bg-[#EBF3F6] border-[#ACCAD5] text-slate-800 font-semibold ring-1 ring-[#588594]/30"
                          : "bg-white/95 border-slate-200/80 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="leading-none">{r.emoji}</span>
                      {r.count > 1 && (
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                          {r.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Image View */}
      {activeLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setActiveLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setActiveLightboxUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
              title="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeLightboxUrl}
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
