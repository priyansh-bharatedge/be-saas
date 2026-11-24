"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationSummary, MessageItem } from "@/lib/actions/chat";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewGroupModal } from "./NewGroupModal";
import { GroupInfoDrawer } from "./GroupInfoDrawer";
import { StagedAttachment } from "./MessageComposer";
import { playSendSound, playReceiveSound } from "@/lib/chat/audio";

interface ChatClientProps {
  initialConversations: ConversationSummary[];
  currentUserId: string;
  initialColleagues: { id: string; name: string; department: string; designation: string }[];
}

export function ChatClient({
  initialConversations,
  currentUserId,
  initialColleagues,
}: ChatClientProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get("c");

  // Requirement 2: Default empty state - do not auto-select unless directed by URL param (e.g. from top notification click)
  const [activeId, setActiveId] = useState<string | null>(urlConvId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(!!urlConvId);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;

  // Sync with URL query param ?c=...
  useEffect(() => {
    if (urlConvId && urlConvId !== activeId) {
      setActiveId(urlConvId);
      setShowMobileChat(true);
    }
  }, [urlConvId, activeId]);

  // Dispatch custom event to sync top bar chat icon instantly
  const dispatchTopBarUnread = useCallback((updatedConvs: ConversationSummary[]) => {
    if (typeof window !== "undefined") {
      const total = updatedConvs.reduce((acc, c) => acc + c.unreadCount, 0);
      window.dispatchEvent(
        new CustomEvent("chat:unread-updated", { detail: { unreadCount: total } })
      );
    }
  }, []);

  // Sound detection refs
  const prevMessageIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDoneRef = useRef<boolean>(false);
  const prevTotalUnreadRef = useRef<number>(
    initialConversations.reduce((acc, c) => acc + c.unreadCount, 0)
  );

  // Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (convId: string, showLoading = false) => {
      if (showLoading) setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${convId}&limit=100`);
        const data = await res.json();
        if (data.success && data.messages) {
          const incoming: MessageItem[] = data.messages;

          // Detect new incoming messages from other participants to play sound
          if (initialFetchDoneRef.current) {
            const hasNewIncoming = incoming.some(
              (m) => !prevMessageIdsRef.current.has(m.id) && m.senderId !== currentUserId
            );
            if (hasNewIncoming) {
              playReceiveSound();
            }
          } else {
            initialFetchDoneRef.current = true;
          }

          prevMessageIdsRef.current = new Set(incoming.map((m) => m.id));
          setMessages(incoming);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        if (showLoading) setIsLoadingMessages(false);
      }
    },
    [currentUserId]
  );

  // Fetch conversation list for unread badges and order
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.success && data.conversations) {
        const updatedList: ConversationSummary[] = data.conversations;

        // If unread count increased across any conversation, play notification chime
        const totalUnread = updatedList.reduce((acc, c) => acc + c.unreadCount, 0);
        if (totalUnread > prevTotalUnreadRef.current) {
          playReceiveSound();
        }
        prevTotalUnreadRef.current = totalUnread;

        setConversations(updatedList);
        dispatchTopBarUnread(updatedList);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }, [dispatchTopBarUnread]);

  // When activeId changes, load messages and mark as read
  useEffect(() => {
    if (activeId) {
      initialFetchDoneRef.current = false;
      fetchMessages(activeId, true);
      // Reset unread count locally for active conversation
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c));
        dispatchTopBarUnread(next);
        return next;
      });
      // Persist read state in PostgreSQL & clear bell notifications
      fetch("/api/chat/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId }),
      }).catch((err) => console.error("Error marking read:", err));
    } else {
      setMessages([]);
    }
  }, [activeId, fetchMessages, dispatchTopBarUnread]);

  // Live polling ticker (runs every 3.5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Refresh conversations & unread badges
      fetchConversations();
      // 2. Refresh active chat messages
      if (activeIdRef.current) {
        fetchMessages(activeIdRef.current, false);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [fetchConversations, fetchMessages]);

  // Handle select conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setShowMobileChat(true);
    // Immediately clear unread badge in sidebar
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c));
      dispatchTopBarUnread(next);
      return next;
    });
    // Update DB
    fetch("/api/chat/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id }),
    }).catch((err) => console.error("Error marking read:", err));
  };

  // Start 1-on-1 DM
  const handleStartDM = async (targetEmployeeId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isGroup: false, targetEmployeeId }),
      });
      const data = await res.json();
      if (data.success && data.conversationId) {
        await fetchConversations();
        setActiveId(data.conversationId);
        setShowMobileChat(true);
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
    }
  };

  // On group created callback
  const handleGroupCreated = async (conversationId: string) => {
    await fetchConversations();
    setActiveId(conversationId);
    setShowMobileChat(true);
  };

  // Handle send message with optimistic UI and notification sound
  const handleSendMessage = async (payload: {
    content?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
    attachmentMimeType?: string;
    messageType?: "TEXT" | "IMAGE" | "DOCUMENT" | "FILE";
    attachments?: StagedAttachment[];
  }) => {
    if (!activeId) return;

    // Requirement 3: Play send sound
    playSendSound();

    // Optimistic message with status "SENT" (single grey tick)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeId,
      senderId: currentUserId,
      senderName: "You",
      senderInitials: "ME",
      content: payload.content || null,
      messageType: payload.messageType || "TEXT",
      attachmentUrl: payload.attachmentUrl || null,
      attachmentName: payload.attachmentName || null,
      attachmentSize: payload.attachmentSize || null,
      attachmentMimeType: payload.attachmentMimeType || null,
      attachments: payload.attachments,
      createdAt: new Date().toISOString(),
      isSelf: true,
      status: "SENT",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    prevMessageIdsRef.current.add(tempId);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          ...payload,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        );
        prevMessageIdsRef.current.delete(tempId);
        prevMessageIdsRef.current.add(data.message.id);
        fetchConversations();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    setInfoDrawerOpen(false);
    await fetchConversations();
    setActiveId(null);
    setShowMobileChat(false);
  };

  return (
    <div className="relative h-full w-full rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden flex flex-row min-h-0">
      {/* Ambient background blur */}
      <div className="pointer-events-none absolute -left-20 -top-20 w-80 h-80 rounded-full bg-[#ACCAD5]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#F0944D]/15 blur-3xl" />

      {/* Left Pane: Conversations List */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } w-full md:w-auto h-full shrink-0 z-10`}
      >
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onOpenNewGroup={() => setGroupModalOpen(true)}
          onStartDM={handleStartDM}
          colleagues={initialColleagues}
        />
      </div>

      {/* Right Pane: Active Chat Window */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-1 h-full z-10 flex-col overflow-hidden min-h-0`}
      >
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId={currentUserId}
          onSendMessage={handleSendMessage}
          onOpenInfo={() => setInfoDrawerOpen(true)}
          onBackMobile={() => setShowMobileChat(false)}
          isLoadingMessages={isLoadingMessages}
        />
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Group Info Drawer */}
      {activeConversation && (
        <GroupInfoDrawer
          isOpen={infoDrawerOpen}
          onClose={() => setInfoDrawerOpen(false)}
          conversationName={activeConversation.name}
          isGroup={activeConversation.isGroup}
          participants={activeConversation.participants}
          currentUserId={currentUserId}
          conversationId={activeConversation.id}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
    </div>
  );
}
