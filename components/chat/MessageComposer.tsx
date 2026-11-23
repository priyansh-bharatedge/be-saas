"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X, Loader2, File, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StagedAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  messageType: "TEXT" | "IMAGE" | "DOCUMENT" | "FILE";
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
  }) => Promise<void>;
  disabled?: boolean;
}

export function MessageComposer({
  conversationId,
  onSendMessage,
  disabled = false,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", conversationId);

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "File upload failed");
      }

      setStagedAttachment({
        url: data.url,
        name: data.fileName,
        size: data.fileSize,
        mimeType: data.mimeType,
        messageType: data.messageType,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to upload attachment");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed && !stagedAttachment) return;
    if (isSending || isUploading) return;

    setIsSending(true);
    try {
      await onSendMessage({
        content: trimmed || undefined,
        attachmentUrl: stagedAttachment?.url,
        attachmentName: stagedAttachment?.name,
        attachmentSize: stagedAttachment?.size,
        attachmentMimeType: stagedAttachment?.mimeType,
        messageType: stagedAttachment?.messageType || "TEXT",
      });

      setText("");
      setStagedAttachment(null);
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

  return (
    <div className="p-3 sm:p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/70">
      {/* Staged Attachment Preview */}
      {stagedAttachment && (
        <div className="mb-2 p-2 rounded-xl bg-[#EBF3F6]/80 border border-[#ACCAD5]/50 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            {stagedAttachment.messageType === "IMAGE" ? (
              <ImageIcon className="h-4 w-4 text-[#588594] shrink-0" />
            ) : (
              <File className="h-4 w-4 text-[#588594] shrink-0" />
            )}
            <span className="font-semibold text-slate-800 truncate">
              {stagedAttachment.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              ({(stagedAttachment.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStagedAttachment(null)}
            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip"
        />

        {/* Attachment Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || isSending}
          className="h-10 w-10 rounded-2xl text-slate-500 hover:text-[#588594] hover:bg-[#EBF3F6]/80 shrink-0 transition-colors"
          title="Attach document, photo, or spreadsheet"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#588594]" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>

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
          disabled={disabled || isSending || isUploading || (!text.trim() && !stagedAttachment)}
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
