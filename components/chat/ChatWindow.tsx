"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Users,
  Info,
  MessageSquare,
  ShieldCheck,
  Lock,
  Sparkles,
  ChevronDown,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem, ConversationSummary } from "@/lib/actions/chat";
import { MessageItemBubble } from "./MessageItemBubble";
import { MessageComposer, StagedAttachment } from "./MessageComposer";
import { formatWhatsAppLastSeen } from "@/lib/chat/presence";

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
    attachments?: StagedAttachment[];
  }) => Promise<void>;
  onOpenInfo: () => void;
  onOpenContactInfo?: () => void;
  onOpenLightbox?: (
    photoUrl: string,
    title: string,
    subtitle?: string,
    canEdit?: boolean
  ) => void;
  onBackMobile: () => void;
  isLoadingMessages?: boolean;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  isOversightMode?: boolean;
  isAiThinking?: boolean;
  onTriggerTestReport?: (reportType: string) => Promise<void>;
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onOpenInfo,
  onOpenContactInfo,
  onOpenLightbox,
  onBackMobile,
  isLoadingMessages,
  onToggleReaction,
  isOversightMode = false,
  isAiThinking = false,
  onTriggerTestReport,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const testMenuRef = useRef<HTMLDivElement>(null);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);

  // Close test menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (testMenuRef.current && !testMenuRef.current.contains(e.target as Node)) {
        setIsTestMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const AI_QUICK_PROMPTS = [
    { label: "📊 Revenue Summary (Today)", prompt: "Give me the live revenue summary for today across BSPL and BSAPL with verified vs unverified collections." },
    { label: "👥 Department Attendance", prompt: "Show me today's department-wise attendance summary and active headcounts." },
    { label: "⚠️ Active BDMs with ₹0 Revenue", prompt: "Which sales BDMs have clocked in today but have ₹0 revenue so far?" },
    { label: "💰 Outsource Costs This Month", prompt: "What are our total outsourced vendor and advocate costs for this month?" },
    { label: "📈 Top Selling Services", prompt: "What are our top selling services this month ranked by volume and revenue?" },
    { label: "⏳ Pending Deal Conversions", prompt: "Are there any verified payment receipts waiting to be converted into Deals?" },
    { label: "⚖️ Legal Pipeline Status", prompt: "What is the status of our legal cases, agreements, and delayed filings?" },
    { label: "🎫 Support Tickets Overview", prompt: "Give me a summary of open support tickets and high priority escalations." },
  ];

  // Determine if current user is restricted from sending messages in this conversation
  const currentParticipant = conversation?.participants.find(
    (p) => p.employeeId === currentUserId
  );
  const isCurrentUserAdmin = currentParticipant?.role === "ADMIN";

  let restrictionNotice: string | null = null;
  if (conversation?.isGroup) {
    if (conversation.sendMessagePermission === "ONLY_ADMINS" && !isCurrentUserAdmin) {
      restrictionNotice = "Only admins can send messages";
    } else if (currentParticipant?.canSendMessages === false) {
      restrictionNotice = "You are restricted from sending messages in this group";
    }
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Default Empty State (WhatsApp Web Style)
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#FCFAF7]/90 to-[#F4F7F9]/80 h-full relative select-none overflow-hidden">
        {/* Soft background ambient blurs */}
        <div className="pointer-events-none absolute w-72 h-72 rounded-full bg-[#ACCAD5]/20 blur-3xl -top-10 -right-10" />
        <div className="pointer-events-none absolute w-72 h-72 rounded-full bg-[#F0944D]/15 blur-3xl -bottom-10 -left-10" />

        <div className="relative z-10 max-w-md flex flex-col items-center">
          {/* Logo Badge */}
          <div className="w-20 h-20 rounded-3xl bg-white border border-[#ACCAD5]/50 flex items-center justify-center shadow-lg shadow-[#ACCAD5]/20 mb-5 relative group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EBF3F6] to-[#CBDDE4] flex items-center justify-center text-[#3D6472]">
              <MessageSquare className="h-8 w-8 text-[#588594]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#F0944D] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            BharatEdge Team Chat
          </h2>

          {/* Prompt */}
          <div className="mt-6 p-3 px-4 rounded-2xl bg-white/80 border border-slate-200/60 shadow-xs text-xs text-slate-600">
            👈 Select a conversation on the left or use the search bar to find a colleague.
          </div>

          {/* Encrypted Notice */}
          <div className="mt-8 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <Lock className="h-3 w-3 text-slate-400" />
            <span>Encrypted internal corporate network</span>
          </div>
        </div>
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
    <div className="flex-1 flex flex-col h-full bg-[#FCFAF7]/60 overflow-hidden min-h-0">
      {/* Active Chat Header */}
      <div className="px-4 py-3 sm:px-6 bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0 z-10">
        <div
          onClick={() => {
            if (conversation.isGroup) {
              onOpenInfo();
            } else if (onOpenContactInfo) {
              onOpenContactInfo();
            } else {
              onOpenInfo();
            }
          }}
          className="flex items-center gap-3 min-w-0 cursor-pointer group/header select-none flex-1"
          title={
            conversation.isGroup
              ? "View group details & participants"
              : `View ${conversation.name}'s contact info`
          }
        >
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onBackMobile();
            }}
            className="md:hidden h-8 w-8 rounded-full text-slate-500 hover:text-slate-800 -ml-1 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Avatar with WhatsApp Online Badge */}
          <div
            className="relative shrink-0"
            onClick={(e) => {
              if (conversation.avatarUrl && onOpenLightbox) {
                e.stopPropagation();
                onOpenLightbox(
                  conversation.avatarUrl,
                  conversation.name,
                  conversation.isGroup ? "Group Profile Photo" : conversation.subtitle
                );
              }
            }}
          >
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shadow-2xs overflow-hidden transition-transform group-hover/header:scale-105 ${
                conversation.isAiAgent
                  ? "bg-gradient-to-br from-[#F0944D] to-[#E06D1B] text-white shadow-orange-200"
                  : conversation.avatarUrl
                  ? "border border-slate-200/80 bg-slate-100"
                  : conversation.isGroup
                  ? "bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white"
                  : "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C] text-[#C66318]"
              }`}
            >
              {conversation.isAiAgent ? (
                <Sparkles className="h-5 w-5 text-white" />
              ) : conversation.avatarUrl ? (
                <img
                  src={conversation.avatarUrl}
                  alt={conversation.name}
                  className="w-full h-full object-cover"
                />
              ) : conversation.isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                conversation.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Green Online Dot for 1-on-1 or AI Agent */}
            {(conversation.isAiAgent || (!conversation.isGroup && conversation.otherParticipant?.isOnline)) && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                title="Online"
              />
            )}
          </div>

          {/* Title & WhatsApp-Style Online / Last Seen Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900 group-hover/header:text-[#C66318] transition-colors truncate">
                {conversation.name}
              </h3>
              {conversation.isAiAgent && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-orange-100 text-[#C66318] border border-orange-200">
                  AI Copilot
                </span>
              )}
            </div>

            {conversation.isAiAgent ? (
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Executive Copilot • 24/7 Live Intelligence</span>
              </p>
            ) : conversation.isGroup ? (
              <p className="text-[11px] text-slate-500 truncate">
                {conversation.subtitle}
              </p>
            ) : conversation.otherParticipant?.isOnline ? (
              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 truncate">
                {formatWhatsAppLastSeen(
                  conversation.otherParticipant?.lastSeen,
                  conversation.subtitle
                )}
              </p>
            )}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* AI Briefing Test Trigger Menu (Super Admin Only) */}
          {conversation.isAiAgent && onTriggerTestReport && (
            <div className="relative" ref={testMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTestMenuOpen(!isTestMenuOpen)}
                className="h-8 px-2.5 rounded-full text-xs font-semibold gap-1.5 border-[#F0944D]/40 bg-orange-50/60 hover:bg-orange-100/70 text-[#C66318] shadow-2xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#F0944D]" />
                <span className="hidden sm:inline">Trigger Test Report</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>

              {isTestMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Scheduled AI Briefings
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTestMenuOpen(false);
                      onTriggerTestReport("morning-greeting");
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-orange-50/80 flex items-center gap-2.5 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="text-base">🌅</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">Morning Greeting</div>
                      <div className="text-[10px] text-slate-400">9:00 AM IST daily kickoff</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTestMenuOpen(false);
                      onTriggerTestReport("attendance-report");
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-orange-50/80 flex items-center gap-2.5 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="text-base">📋</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">Attendance Report</div>
                      <div className="text-[10px] text-slate-400">10:15 AM department cutoff</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTestMenuOpen(false);
                      onTriggerTestReport("midday-revenue");
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-orange-50/80 flex items-center gap-2.5 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="text-base">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">Mid-Day Revenue Check</div>
                      <div className="text-[10px] text-slate-400">2:30 PM & ₹0 BDMs alert</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTestMenuOpen(false);
                      onTriggerTestReport("evening-wrapup");
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-orange-50/80 flex items-center gap-2.5 text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    <span className="text-base">🏁</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">Evening Revenue Wrap-up</div>
                      <div className="text-[10px] text-slate-400">6:30 PM final collections</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info / Drawer Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!conversation.isGroup && onOpenContactInfo) {
                onOpenContactInfo();
              } else {
                onOpenInfo();
              }
            }}
            className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-[#EBF3F6]/60 transition-colors"
            title={conversation.isGroup ? "Group details & settings" : "Contact info & shared files"}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Super Admin Oversight Mode Banner */}
      {isOversightMode && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/10 via-[#ACCAD5]/20 to-transparent border-b border-amber-200/70 flex items-center justify-between text-xs text-amber-950 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-bold">Super Admin Oversight Mode — Read Only</span>
              <span className="hidden sm:inline text-[11px] text-amber-800/80 ml-2">
                (Silent audit: messaging disabled & employee unread status untouched)
              </span>
            </div>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            Audit Archive
          </span>
        </div>
      )}

      {/* Messages Scroll Area (Internally scrolling, flex-1 min-h-0) */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 scroll-smooth"
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
                isGroup={conversation.isGroup || isOversightMode}
                onToggleReaction={isOversightMode ? undefined : onToggleReaction}
                isOversightMode={isOversightMode}
              />
            );
          })
        )}

        {/* AI Analyzing / Thinking Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#F0944D]/30 shadow-md max-w-sm animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800">BharatEdge AI Copilot</div>
              <div className="text-[11px] text-slate-500">Querying live PostgreSQL CRM & HRMS records...</div>
            </div>
          </div>
        )}
      </div>

      {/* AI Quick Prompts Carousel / Chips */}
      {conversation.isAiAgent && !isOversightMode && (
        <div className="px-4 py-2 bg-white/80 backdrop-blur-md border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="h-3 w-3 text-[#F0944D]" />
            <span>Ask:</span>
          </div>
          {AI_QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isAiThinking}
              onClick={() => onSendMessage({ content: qp.prompt, messageType: "TEXT" })}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-orange-50 border border-slate-200/90 hover:border-[#F0944D]/50 text-slate-700 hover:text-[#C66318] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Sticky Message Composer or WhatsApp-Style Restriction Notice */}
      {isOversightMode ? (
        <div className="p-3.5 bg-slate-50/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium select-none shadow-xs">
          <Lock className="h-4 w-4 text-slate-400 shrink-0" />
          <span>Super Admin Oversight Mode — Message sending disabled for audit review</span>
        </div>
      ) : restrictionNotice ? (
        <div className="p-4 bg-slate-50/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium select-none shadow-xs">
          <Lock className="h-4 w-4 text-slate-400 shrink-0" />
          <span>{restrictionNotice}</span>
        </div>
      ) : (
        <MessageComposer
          conversationId={conversation.id}
          onSendMessage={onSendMessage}
        />
      )}
    </div>
  );
}
