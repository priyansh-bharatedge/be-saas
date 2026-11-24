"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X, Loader2, File, Image as ImageIcon, FileText, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPickerPopover } from "./EmojiPickerPopover";

export interface StagedAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  messageType: "IMAGE" | "DOCUMENT" | "FILE";
}

interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentMimeType?: string;
    messageType?: "TEXT" | "IMAGE" | "DOCUMENT" | "FILE";
    attachments?: StagedAttachment[];
  }) => Promise<void>;
  disabled?: boolean;
}

export function MessageComposer({
  conversationId,
  onSendMessage,
  disabled = false,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const nextText = text.substring(0, start) + emoji + text.substring(end);
    setText(nextText);

    // Keep textarea focused and place cursor immediately after inserted emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(files.length === 1 ? "Uploading file..." : `Uploading ${files.length} files...`);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversationId", conversationId);

        const res = await fetch("/api/chat/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }

        return {
          url: data.url as string,
          name: data.fileName as string,
          size: data.fileSize as number,
          mimeType: data.mimeType as string,
          messageType: data.messageType as "IMAGE" | "DOCUMENT" | "FILE",
        };
      });

      const uploadedResults = await Promise.all(uploadPromises);
      setStagedAttachments((prev) => [...prev, ...uploadedResults]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload file(s).");
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveStaged = (indexToRemove: number) => {
    setStagedAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed && stagedAttachments.length === 0) return;
    if (isSending || isUploading) return;

    setIsSending(true);
    try {
      const firstAtt = stagedAttachments[0];

      await onSendMessage({
        content: trimmed || undefined,
        attachments: stagedAttachments.length > 0 ? stagedAttachments : undefined,
        attachmentUrl: firstAtt?.url,
        attachmentName: firstAtt?.name,
        attachmentSize: firstAtt?.size,
        attachmentMimeType: firstAtt?.mimeType,
        messageType:
          firstAtt?.messageType === "IMAGE"
            ? "IMAGE"
            : firstAtt?.messageType === "DOCUMENT"
            ? "DOCUMENT"
            : firstAtt
            ? "FILE"
            : "TEXT",
      });

      setText("");
      setStagedAttachments([]);
      setIsEmojiPickerOpen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-3 sm:p-4 bg-white/85 backdrop-blur-md border-t border-slate-200/70 shrink-0">
      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center gap-2 text-xs text-[#3D6472] animate-in fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#588594]" />
          <span>{uploadStatus || "Uploading attachments..."}</span>
        </div>
      )}

      {/* Multiple Staged Attachments Preview Carousel / Chips */}
      {stagedAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 animate-in fade-in">
          {stagedAttachments.map((att, idx) => {
            const isImg = att.messageType === "IMAGE" || att.mimeType.startsWith("image/");
            return (
              <div
                key={idx}
                className="group relative flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs max-w-[220px]"
              >
                {isImg ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="w-7 h-7 rounded-lg object-cover border border-slate-200/80 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3F6] border border-[#ACCAD5]/40 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-[#588594]" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 text-[11px] truncate">
                    {att.name}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {formatSize(att.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveStaged(idx)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Remove this attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input with 'multiple' enabled */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip"
        />

        {/* Paperclip Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || isSending}
          className="h-10 w-10 rounded-2xl text-slate-500 hover:text-[#588594] hover:bg-[#EBF3F6]/80 shrink-0 transition-colors"
          title="Attach photos, documents, or spreadsheets (supports multiple files)"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#588594]" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>

        {/* Emoji Picker Button & Popover */}
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
            disabled={disabled || isSending}
            className={`h-10 w-10 rounded-2xl shrink-0 transition-colors ${
              isEmojiPickerOpen
                ? "text-[#588594] bg-[#EBF3F6]"
                : "text-slate-500 hover:text-[#588594] hover:bg-[#EBF3F6]/80"
            }`}
            title="Insert emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>

          <EmojiPickerPopover
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelectEmoji={handleInsertEmoji}
            position="top-left"
            title="Emojis"
          />
        </div>

        {/* Textarea */}
        <div className="flex-1 rounded-2xl bg-slate-50 border border-slate-200/80 focus-within:border-[#588594] focus-within:ring-1 focus-within:ring-[#588594] focus-within:bg-white transition-all overflow-hidden p-1.5 flex items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="w-full bg-transparent px-2.5 py-1 text-xs text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none max-h-28 overflow-y-auto"
          />
        </div>

        {/* Send Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={
            disabled ||
            isSending ||
            isUploading ||
            (!text.trim() && stagedAttachments.length === 0)
          }
          className="h-10 w-10 rounded-2xl bg-[#588594] hover:bg-[#466C78] text-white shadow-sm flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-50"
          title="Send message (Enter)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4 fill-white text-white ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
