"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Users,
  MessageSquarePlus,
  Image as ImageIcon,
  File,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationSummary } from "@/lib/actions/chat";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenNewGroup: () => void;
  onStartDM: (targetEmployeeId: string) => void;
  colleagues: { id: string; name: string; department: string; designation: string }[];
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onOpenNewGroup,
  onStartDM,
  colleagues,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [showColleagueDropdown, setShowColleagueDropdown] = useState(false);

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const filteredColleagues = colleagues.filter(
    (col) =>
      col.name.toLowerCase().includes(search.toLowerCase()) ||
      col.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-slate-200/80 bg-white/60 backdrop-blur-xl flex flex-col h-full shrink-0">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-150/70">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Team Messages</h2>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF3F6] text-[#3D6472] border border-[#ACCAD5]/40">
              Live
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* New Group Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenNewGroup}
              title="Create new group chat"
              className="h-8 px-2.5 rounded-xl border-slate-200 bg-white hover:bg-[#EBF3F6] text-[#3D6472] text-xs font-semibold shadow-2xs gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Group</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search chats or find a colleague..."
            value={search}
            onFocus={() => setShowColleagueDropdown(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowColleagueDropdown(true);
            }}
            className="pl-9 pr-8 h-9 rounded-xl bg-slate-50/90 border-slate-200/80 text-xs focus-visible:ring-1 focus-visible:ring-[#588594]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setShowColleagueDropdown(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-mono"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Quick Colleague Picker Dropdown (When typing search) */}
      {showColleagueDropdown && search.trim() && (
        <div className="border-b border-slate-200 bg-slate-50/95 p-3 space-y-2 max-h-48 overflow-y-auto shadow-inner">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Direct Message Colleague</span>
            <button
              onClick={() => setShowColleagueDropdown(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              Close
            </button>
          </div>
          {filteredColleagues.length === 0 ? (
            <div className="text-xs text-slate-400 p-2">No matching colleagues found.</div>
          ) : (
            filteredColleagues.slice(0, 5).map((col) => (
              <div
                key={col.id}
                onClick={() => {
                  onStartDM(col.id);
                  setShowColleagueDropdown(false);
                  setSearch("");
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 hover:border-[#ACCAD5] hover:bg-[#EBF3F6]/50 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-[10px]">
                    {col.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{col.name}</div>
                    <div className="text-[10px] text-slate-400">{col.department}</div>
                  </div>
                </div>
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#588594]" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF3F6] border border-[#ACCAD5]/40 flex items-center justify-center text-[#588594] mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No conversations yet</p>
            <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
              Search any colleague above to start a direct message or create a team group.
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeId;
            const hasUnread = conv.unreadCount > 0;
            const initial = conv.name.charAt(0).toUpperCase();

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer transition-all ${
                  isActive
                    ? "bg-[#EBF3F6]/80 border-l-4 border-l-[#588594] shadow-xs"
                    : "hover:bg-slate-50/80"
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs transition-transform ${
                    conv.isGroup
                      ? "bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white border border-white"
                      : "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C] text-[#C66318] border border-[#F0944D]/30"
                  }`}
                >
                  {conv.isGroup ? <Users className="h-5 w-5" /> : initial}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={`text-xs truncate ${
                        hasUnread
                          ? "font-bold text-slate-900"
                          : isActive
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-800"
                      }`}
                    >
                      {conv.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatTimestamp(conv.updatedAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mb-1">
                    {conv.subtitle}
                  </p>

                  {/* Last Message Snippet */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate flex items-center gap-1 ${
                        hasUnread ? "font-semibold text-slate-800" : "text-slate-500"
                      }`}
                    >
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.messageType === "IMAGE" && (
                            <ImageIcon className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          {(conv.lastMessage.messageType === "DOCUMENT" ||
                            conv.lastMessage.messageType === "FILE") && (
                            <File className="h-3 w-3 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {conv.lastMessage.content ||
                              (conv.lastMessage.messageType === "IMAGE" ? "Photo" : "File")}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No messages yet</span>
                      )}
                    </p>

                    {/* Unread Count Badge (WhatsApp Emerald Style) */}
                    {hasUnread && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs animate-in zoom-in-75">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
