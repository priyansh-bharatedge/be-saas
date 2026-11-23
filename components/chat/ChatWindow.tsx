"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, Users, Info, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem, ConversationSummary } from "@/lib/actions/chat";
import { MessageItemBubble } from "./MessageItemBubble";
import { MessageComposer } from "./MessageComposer";

interface ChatWindowProps {
  conversation: ConversationSummary | null;
  messages: MessageItem[];
  currentUserId: string;
  onSendMessage: (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentMimeType?: string;
    messageType?: "TEXT" | "IMAGE" | "DOCUMENT" | "FILE";
  }) => Promise<void>;
  onOpenInfo: () => void;
  onBackMobile: () => void;
  isLoadingMessages?: boolean;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onOpenInfo,
  onBackMobile,
  isLoadingMessages,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-16 h-16 rounded-3xl bg-[#EBF3F6] border border-[#ACCAD5]/50 flex items-center justify-center text-[#588594] mb-4 shadow-sm">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Pick a chat from the left panel or search any team member to start collaborating.
        </p>
      </div>
    );
  }

  // Helper to format date labels for separators
  const getDateLabel = (isoDate: string) => {
    const d = new Date(isoDate);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FCFAF7]/60 overflow-hidden">
      {/* Active Chat Header */}
      <div className="px-4 py-3 sm:px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackMobile}
            className="md:hidden h-8 w-8 rounded-full text-slate-500 hover:text-slate-800 -ml-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Avatar */}
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
              conversation.isGroup
                ? "bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white"
                : "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C] text-[#C66318]"
            }`}
          >
            {conversation.isGroup ? (
              <Users className="h-5 w-5" />
            ) : (
              conversation.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {conversation.name}
            </h3>
            <p className="text-[11px] text-slate-500 truncate">
              {conversation.subtitle}
            </p>
          </div>
        </div>

        {/* Info / Drawer Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenInfo}
          className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#EBF3F6]/60 transition-colors"
          title="Conversation details & participants"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth"
      >
        {isLoadingMessages && messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading chat history...</div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            This is the start of your conversation. Say hello! 👋
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const msgDate = new Date(msg.createdAt).toDateString();
            const prevDate = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
            const isFirstOfDay = msgDate !== prevDate;

            return (
              <MessageItemBubble
                key={msg.id}
                message={msg}
                showDateSeparator={isFirstOfDay}
                dateLabel={isFirstOfDay ? getDateLabel(msg.createdAt) : undefined}
                isGroup={conversation.isGroup}
              />
            );
          })
        )}
      </div>

      {/* Message Composer */}
      <MessageComposer
        conversationId={conversation.id}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
