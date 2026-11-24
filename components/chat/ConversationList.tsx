"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Users,
  MessageSquarePlus,
  MessageSquare,
  Image as ImageIcon,
  File,
  Sparkles,
  Shield,
  Filter,
  Layers,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationSummary } from "@/lib/actions/chat";
import { AuditConversationSummary } from "@/lib/actions/chat-audit";

interface ConversationListProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenNewGroup: () => void;
  onStartDM: (targetEmployeeId: string) => void;
  colleagues: {
    id: string;
    name: string;
    department: string;
    designation: string;
    isOnline?: boolean;
    lastSeen?: string | null;
  }[];
  // Super Admin Organization Oversight Props
  isSuperAdmin?: boolean;
  chatMode?: "MY_CHATS" | "ALL_ORG_CHATS";
  onModeChange?: (mode: "MY_CHATS" | "ALL_ORG_CHATS") => void;
  auditConversations?: AuditConversationSummary[];
  isLoadingAudit?: boolean;
  auditTypeFilter?: "ALL" | "DMS" | "GROUPS";
  onAuditTypeFilterChange?: (type: "ALL" | "DMS" | "GROUPS") => void;
  auditDepartmentFilter?: string;
  onAuditDepartmentFilterChange?: (dept: string) => void;
  auditSearch?: string;
  onAuditSearchChange?: (val: string) => void;
  departmentsList?: string[];
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onOpenNewGroup,
  onStartDM,
  colleagues,
  isSuperAdmin = false,
  chatMode = "MY_CHATS",
  onModeChange,
  auditConversations = [],
  isLoadingAudit = false,
  auditTypeFilter = "ALL",
  onAuditTypeFilterChange,
  auditDepartmentFilter = "ALL",
  onAuditDepartmentFilterChange,
  auditSearch = "",
  onAuditSearchChange,
  departmentsList = [],
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
      <div className="p-4 border-b border-slate-150/70 space-y-3">
        {/* Title & Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {chatMode === "ALL_ORG_CHATS" ? "Org Chat Audit" : "Team Messages"}
            </h2>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                chatMode === "ALL_ORG_CHATS"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-[#EBF3F6] text-[#3D6472] border-[#ACCAD5]/40"
              }`}
            >
              {chatMode === "ALL_ORG_CHATS" ? "Oversight" : "Live"}
            </span>
          </div>

          {chatMode === "MY_CHATS" && (
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
          )}
        </div>

        {/* Super Admin Mode Switcher Segmented Control */}
        {isSuperAdmin && onModeChange && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs font-semibold select-none">
            <button
              type="button"
              onClick={() => onModeChange("MY_CHATS")}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                chatMode === "MY_CHATS"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>My Chats</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange("ALL_ORG_CHATS")}
              className={`py-1.5 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                chatMode === "ALL_ORG_CHATS"
                  ? "bg-[#588594] text-white shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>All Org Chats</span>
            </button>
          </div>
        )}

        {/* Normal Search Bar (My Chats Mode) */}
        {chatMode === "MY_CHATS" ? (
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
        ) : (
          /* Super Admin Audit Filters (All Org Chats Mode) */
          <div className="space-y-2.5 pt-1">
            {/* Search Input for Super Admin */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search participant, group, message..."
                value={auditSearch}
                onChange={(e) => onAuditSearchChange?.(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-xl bg-slate-50/90 border-slate-200/80 text-xs focus-visible:ring-1 focus-visible:ring-[#588594]"
              />
              {auditSearch && (
                <button
                  onClick={() => onAuditSearchChange?.("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-mono"
                >
                  ×
                </button>
              )}
            </div>

            {/* Chat Type Filter Pills & Department Selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                {(["ALL", "DMS", "GROUPS"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onAuditTypeFilterChange?.(t)}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                      auditTypeFilter === t
                        ? "bg-[#EBF3F6] border-[#ACCAD5] text-[#3D6472] shadow-2xs"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {t === "ALL" ? "All" : t === "DMS" ? "1-on-1 DMs" : "Groups"}
                  </button>
                ))}
              </div>

              {/* Department Dropdown */}
              <div className="relative flex items-center">
                <Building2 className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={auditDepartmentFilter}
                  onChange={(e) => onAuditDepartmentFilterChange?.(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-[11px] rounded-lg bg-white border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-[#588594] appearance-none cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 h-3 w-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Colleague Picker Dropdown (Only in My Chats mode) */}
      {chatMode === "MY_CHATS" && showColleagueDropdown && search.trim() && (
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
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-[10px]">
                      {col.name.charAt(0)}
                    </div>
                    {col.isOnline && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"
                        title="Online"
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{col.name}</span>
                      {col.isOnline && (
                        <span className="text-[9px] text-emerald-600 font-medium">• online</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{col.department}</div>
                  </div>
                </div>
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#588594]" />
              </div>
            ))
          )}
        </div>
      )}

      {/* Main Conversations Scroll List */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
        {chatMode === "ALL_ORG_CHATS" ? (
          /* Super Admin Audit List */
          isLoadingAudit ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Loading organization chats...
            </div>
          ) : auditConversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Shield className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No chats found</p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                No organization conversations match your selected filters.
              </p>
            </div>
          ) : (
            auditConversations.map((conv) => {
              const isActive = conv.id === activeId;
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
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shadow-2xs ${
                        conv.isGroup
                          ? "bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white border border-white"
                          : "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C] text-[#C66318] border border-[#F0944D]/30"
                      }`}
                    >
                      {conv.isGroup ? <Users className="h-5 w-5" /> : initial}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          isActive
                            ? "font-bold text-slate-900"
                            : "font-semibold text-slate-800"
                        }`}
                      >
                        {conv.displayTitle}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatTimestamp(conv.updatedAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mb-1">
                      {conv.displaySubtitle}
                    </p>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1">
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
                              <span className="font-semibold text-slate-600">
                                {conv.lastMessage.senderName}:{" "}
                              </span>
                              {conv.lastMessage.isDeleted
                                ? "[Deleted by sender]"
                                : conv.lastMessage.content || "Attachment"}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No messages</span>
                        )}
                      </p>

                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-[9px] font-bold shrink-0">
                        {conv.messageCount} msgs
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Regular My Chats List */
          filteredConversations.length === 0 ? (
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
                  {/* Avatar Icon with Online Badge */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shadow-2xs transition-transform ${
                        conv.isGroup
                          ? "bg-gradient-to-br from-[#ACCAD5] to-[#7EA9B8] text-white border border-white"
                          : "bg-gradient-to-br from-[#FDEFE6] to-[#F7BA8C] text-[#C66318] border border-[#F0944D]/30"
                      }`}
                    >
                      {conv.isGroup ? <Users className="h-5 w-5" /> : initial}
                    </div>

                    {/* Green Online Dot for 1-on-1 */}
                    {!conv.isGroup && (conv.otherParticipant?.isOnline || conv.isOnline) && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                        title="Online"
                      />
                    )}
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
          )
        )}
      </div>
    </div>
  );
}
