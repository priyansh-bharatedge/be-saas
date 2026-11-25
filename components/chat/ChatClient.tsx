"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationSummary, MessageItem } from "@/lib/actions/chat";
import { AuditConversationSummary } from "@/lib/actions/chat-audit";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { NewGroupModal } from "./NewGroupModal";
import { GroupInfoDrawer } from "./GroupInfoDrawer";
import { ContactInfoDrawer, ContactInfoProfile } from "./ContactInfoDrawer";
import { PhotoLightboxModal } from "./PhotoLightboxModal";
import { StagedAttachment } from "./MessageComposer";
import { playSendSound, playReceiveSound } from "@/lib/chat/audio";
import { toast } from "sonner";

interface ChatClientProps {
  initialConversations: ConversationSummary[];
  currentUserId: string;
  initialColleagues: {
    id: string;
    name: string;
    department: string;
    designation: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
    lastSeen?: string | null;
  }[];
  isSuperAdmin?: boolean;
}

export function ChatClient({
  initialConversations,
  currentUserId,
  initialColleagues,
  isSuperAdmin = false,
}: ChatClientProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const searchParams = useSearchParams();
  const urlConvId = searchParams.get("c");

  // Mode Switcher for Super Admin: "MY_CHATS" vs "ALL_ORG_CHATS"
  const [chatMode, setChatMode] = useState<"MY_CHATS" | "ALL_ORG_CHATS">("MY_CHATS");

  // Super Admin Audit State
  const [auditConversations, setAuditConversations] = useState<AuditConversationSummary[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditTypeFilter, setAuditTypeFilter] = useState<"ALL" | "DMS" | "GROUPS">("ALL");
  const [auditDepartmentFilter, setAuditDepartmentFilter] = useState<string>("ALL");
  const [auditSearch, setAuditSearch] = useState("");
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);

  // Active chat state
  const [activeId, setActiveId] = useState<string | null>(urlConvId || null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(!!urlConvId);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);

  // WhatsApp-Style Contact Info Drawer state
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactInfoProfile | null>(null);

  // AI Agent Copilot state
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Full-Screen Photo Lightbox Modal state
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    photoUrl: string | null;
    title: string;
    subtitle?: string;
    canEdit?: boolean;
    onUpload?: (f: File) => Promise<void>;
    onRemove?: () => Promise<void>;
  }>({
    isOpen: false,
    photoUrl: null,
    title: "",
  });

  const handleOpenLightbox = useCallback(
    (
      photoUrl: string,
      title: string,
      subtitle?: string,
      canEdit?: boolean,
      onUpload?: (f: File) => Promise<void>,
      onRemove?: () => Promise<void>
    ) => {
      setLightboxState({
        isOpen: true,
        photoUrl,
        title,
        subtitle,
        canEdit,
        onUpload,
        onRemove,
      });
    },
    []
  );

  const handleCloseLightbox = useCallback(() => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Self photo update handlers for lightbox
  const handleSelfPhotoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/user/profile-photo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to upload photo");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("be_avatar_updated", {
          detail: { employeeId: currentUserId, avatarUrl: data.avatarUrl },
        })
      );
    }
    setLightboxState((prev) => ({ ...prev, photoUrl: data.avatarUrl }));
  };

  const handleSelfPhotoRemove = async () => {
    const res = await fetch("/api/user/profile-photo", {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to remove photo");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("be_avatar_updated", {
          detail: { employeeId: currentUserId, avatarUrl: null },
        })
      );
    }
    setLightboxState((prev) => ({ ...prev, isOpen: false, photoUrl: null }));
  };

  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;

  const chatModeRef = useRef<"MY_CHATS" | "ALL_ORG_CHATS">(chatMode);
  chatModeRef.current = chatMode;

  // Active conversation mapping based on mode
  const activeAuditConv = auditConversations.find((c) => c.id === activeId);
  const activeConversation: ConversationSummary | null =
    chatMode === "ALL_ORG_CHATS" && activeAuditConv
      ? {
          id: activeAuditConv.id,
          isGroup: activeAuditConv.isGroup,
          name: activeAuditConv.displayTitle,
          avatarUrl: activeAuditConv.avatarUrl,
          subtitle: activeAuditConv.displaySubtitle,
          unreadCount: 0,
          updatedAt: activeAuditConv.updatedAt,
          participants: activeAuditConv.participants.map((p) => ({
            id: p.id,
            employeeId: p.employeeId,
            name: p.name,
            email: p.email,
            department: p.department,
            designation: p.designation,
            role: p.role as any,
            canSendMessages: true,
            lastReadAt: null,
            isOnline: p.isOnline,
            lastSeen: p.lastSeen,
          })),
          isOnline: false,
          lastSeen: null,
        }
      : conversations.find((c) => c.id === activeId) || null;

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

  // Fetch messages for active conversation in normal user mode
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

  // Fetch audit messages for Super Admin (SILENT: zero read receipt or unread count side effects)
  const fetchAuditMessages = useCallback(
    async (convId: string, showLoading = false) => {
      if (showLoading) setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/admin/conversations/${convId}/messages?limit=100`);
        const data = await res.json();
        if (data.success && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Error fetching audit messages:", err);
      } finally {
        if (showLoading) setIsLoadingMessages(false);
      }
    },
    []
  );

  // Fetch conversations list in normal user mode
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

  // Fetch audit conversations for Super Admin
  const fetchAuditConversations = useCallback(async () => {
    if (!isSuperAdmin) return;
    setIsLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (auditTypeFilter !== "ALL") params.set("chatType", auditTypeFilter);
      if (auditDepartmentFilter !== "ALL") params.set("department", auditDepartmentFilter);
      if (auditSearch.trim()) params.set("search", auditSearch.trim());

      const res = await fetch(`/api/chat/admin/conversations?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.conversations) {
        setAuditConversations(data.conversations);

        // Derive department list dynamically from conversations
        const depts = Array.from(
          new Set(
            (data.conversations as AuditConversationSummary[])
              .flatMap((c) => c.departments)
              .filter(Boolean)
          )
        ).sort();
        setDepartmentsList(depts);
      }
    } catch (err) {
      console.error("Error fetching audit conversations:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [isSuperAdmin, auditTypeFilter, auditDepartmentFilter, auditSearch]);

  // When activeId changes, load messages based on mode
  useEffect(() => {
    if (activeId) {
      if (chatMode === "ALL_ORG_CHATS") {
        // Silent oversight inspection
        fetchAuditMessages(activeId, true);
      } else {
        // Standard user view: loads messages and marks as read
        initialFetchDoneRef.current = false;
        fetchMessages(activeId, true);
        setConversations((prev) => {
          const next = prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c));
          dispatchTopBarUnread(next);
          return next;
        });
        fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeId }),
        }).catch((err) => console.error("Error marking read:", err));
      }
    } else {
      setMessages([]);
    }
  }, [activeId, chatMode, fetchMessages, fetchAuditMessages, dispatchTopBarUnread]);

  // When chatMode or audit filters change, reload audit conversations
  useEffect(() => {
    if (chatMode === "ALL_ORG_CHATS") {
      fetchAuditConversations();
    }
  }, [chatMode, fetchAuditConversations]);

  // Live polling ticker (runs every 3.5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (chatModeRef.current === "ALL_ORG_CHATS") {
        // Silent refresh of audit conversations
        fetchAuditConversations();
        if (activeIdRef.current) {
          fetchAuditMessages(activeIdRef.current, false);
        }
      } else {
        // Standard user polling
        fetchConversations();
        if (activeIdRef.current) {
          fetchMessages(activeIdRef.current, false);
        }
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [fetchConversations, fetchMessages, fetchAuditConversations, fetchAuditMessages]);

  // Handle switching mode between My Chats and All Org Chats
  const handleModeChange = (newMode: "MY_CHATS" | "ALL_ORG_CHATS") => {
    setChatMode(newMode);
    setActiveId(null);
    setMessages([]);
    setShowMobileChat(false);
  };

  // Handle select conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setShowMobileChat(true);

    if (chatMode === "ALL_ORG_CHATS") {
      fetchAuditMessages(id, true);
      return;
    }

    setConversations((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c));
      dispatchTopBarUnread(next);
      return next;
    });

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

  // Trigger On-Demand AI Scheduled Briefing (Dev Test Menu)
  const handleTriggerTestReport = async (reportSlug: string) => {
    if (!activeId) return;
    try {
      const res = await fetch(`/api/cron/ai-agent/${reportSlug}?force=true`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Generated ${reportSlug.replace("-", " ")} briefing!`);
        await fetchMessages(activeId, false);
        await fetchConversations();
      } else {
        toast.error(data.error || "Failed to trigger report.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger report.");
    }
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
    // In Oversight Mode, message sending is blocked
    if (!activeId || chatMode === "ALL_ORG_CHATS") return;

    // AI Agent Conversation Handler
    if (activeConversation?.isAiAgent) {
      if (!payload.content?.trim()) return;

      playSendSound();

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: MessageItem = {
        id: tempId,
        conversationId: activeId,
        senderId: currentUserId,
        senderName: "You",
        senderInitials: "YO",
        content: payload.content || null,
        messageType: "TEXT",
        attachmentUrl: null,
        attachmentName: null,
        attachmentSize: null,
        attachmentMimeType: null,
        createdAt: new Date().toISOString(),
        isSelf: true,
        status: "SENT",
        reactions: [],
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      prevMessageIdsRef.current.add(tempId);
      setIsAiThinking(true);

      try {
        const res = await fetch("/api/ai-agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: payload.content,
            conversationId: activeId,
          }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          playReceiveSound();
          const userMsg: MessageItem = {
            id: data.data.userMessage.id,
            conversationId: activeId,
            senderId: currentUserId,
            senderName: data.data.userMessage.senderName,
            senderAvatarUrl: data.data.userMessage.senderAvatar,
            senderInitials: "YO",
            content: data.data.userMessage.content,
            messageType: data.data.userMessage.messageType,
            attachmentUrl: null,
            attachmentName: null,
            attachmentSize: null,
            attachmentMimeType: null,
            createdAt: data.data.userMessage.createdAt,
            isSelf: true,
            status: "SENT",
            reactions: [],
          };
          const botMsg: MessageItem = {
            id: data.data.botMessage.id,
            conversationId: activeId,
            senderId: data.data.botMessage.senderId,
            senderName: data.data.botMessage.senderName,
            senderAvatarUrl: data.data.botMessage.senderAvatar,
            senderInitials: "AI",
            content: data.data.botMessage.content,
            messageType: data.data.botMessage.messageType,
            attachmentUrl: null,
            attachmentName: null,
            attachmentSize: null,
            attachmentMimeType: null,
            createdAt: data.data.botMessage.createdAt,
            isSelf: false,
            status: "SENT",
            reactions: [],
          };

          setMessages((prev) => [
            ...prev.map((m) => (m.id === tempId ? userMsg : m)),
            botMsg,
          ]);
          prevMessageIdsRef.current.delete(tempId);
          prevMessageIdsRef.current.add(botMsg.id);
          fetchConversations();
        } else {
          toast.error(data.error || "Failed to get AI response.");
        }
      } catch (err: any) {
        console.error("AI chat error:", err);
        toast.error("Network error communicating with BharatEdge AI.");
      } finally {
        setIsAiThinking(false);
      }
      return;
    }

    playSendSound();

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      conversationId: activeId,
      senderId: currentUserId,
      senderName: "You",
      senderInitials: "YO",
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
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    prevMessageIdsRef.current.add(tempId);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          content: payload.content,
          attachmentUrl: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
          attachmentSize: payload.attachmentSize,
          attachmentMimeType: payload.attachmentMimeType,
          messageType: payload.messageType,
          attachments: payload.attachments,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...data.message, isSelf: true } : m))
        );
        prevMessageIdsRef.current.delete(tempId);
        prevMessageIdsRef.current.add(data.message.id);
        fetchConversations();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Handle toggle emoji reaction on a message (WhatsApp style)
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (chatMode === "ALL_ORG_CHATS") return; // Read-only in oversight mode

    // 1. Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const existingMyReaction = currentReactions.find((r) => r.hasReacted);
        let nextReactions = [...currentReactions];

        if (existingMyReaction && existingMyReaction.emoji === emoji) {
          if (existingMyReaction.count <= 1) {
            nextReactions = nextReactions.filter((r) => r.emoji !== emoji);
          } else {
            nextReactions = nextReactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count - 1,
                    hasReacted: false,
                    users: r.users.filter((u) => u.id !== currentUserId),
                  }
                : r
            );
          }
        } else {
          if (existingMyReaction) {
            if (existingMyReaction.count <= 1) {
              nextReactions = nextReactions.filter(
                (r) => r.emoji !== existingMyReaction.emoji
              );
            } else {
              nextReactions = nextReactions.map((r) =>
                r.emoji === existingMyReaction.emoji
                  ? {
                      ...r,
                      count: r.count - 1,
                      hasReacted: false,
                      users: r.users.filter((u) => u.id !== currentUserId),
                    }
                  : r
              );
            }
          }

          const targetGroup = nextReactions.find((r) => r.emoji === emoji);
          if (targetGroup) {
            nextReactions = nextReactions.map((r) =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    hasReacted: true,
                    users: [...r.users, { id: currentUserId, name: "You" }],
                  }
                : r
            );
          } else {
            nextReactions.push({
              emoji,
              count: 1,
              hasReacted: true,
              users: [{ id: currentUserId, name: "You" }],
            });
          }
        }

        return { ...msg, reactions: nextReactions };
      })
    );

    // 2. Persist to PostgreSQL via /api/chat/reactions
    try {
      const res = await fetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (data.success && data.reactions) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions: data.reactions } : msg
          )
        );
      }
    } catch (err) {
      console.error("Error toggling message reaction:", err);
    }
  };

  // Handle updating group messaging permission (Only Admins / All Members)
  const handleUpdateGroupPermission = async (perm: "ALL_MEMBERS" | "ONLY_ADMINS") => {
    if (!activeId || chatMode === "ALL_ORG_CHATS") return;
    try {
      const res = await fetch("/api/chat/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", conversationId: activeId, permission: perm }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, sendMessagePermission: perm } : c
          )
        );
        fetchMessages(activeId, false);
      }
    } catch (err) {
      console.error("Failed to update group permission:", err);
    }
  };

  // Handle restricting / allowing individual member messaging
  const handleUpdateMemberPermission = async (
    employeeId: string,
    canSendMessages: boolean
  ) => {
    if (!activeId || chatMode === "ALL_ORG_CHATS") return;
    try {
      const res = await fetch("/api/chat/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "member",
          conversationId: activeId,
          employeeId,
          canSendMessages,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeId) return c;
            return {
              ...c,
              participants: c.participants.map((p) =>
                p.employeeId === employeeId ? { ...p, canSendMessages } : p
              ),
            };
          })
        );
        fetchMessages(activeId, false);
      }
    } catch (err) {
      console.error("Failed to update member permission:", err);
    }
  };

  // Handle leave group
  const handleLeaveGroup = async () => {
    setInfoDrawerOpen(false);
    await fetchConversations();
    setActiveId(null);
    setShowMobileChat(false);
  };

  // Handle group avatar update
  const handleUpdateGroupAvatar = (newAvatarUrl: string | null) => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, avatarUrl: newAvatarUrl } : c))
    );
    fetchMessages(activeId, false);
  };

  // Open Contact Info Drawer (WhatsApp style)
  const handleOpenContactInfo = useCallback(
    (contact?: ContactInfoProfile | null) => {
      if (contact) {
        setSelectedContact(contact);
        setContactDrawerOpen(true);
      } else if (activeConversation && !activeConversation.isGroup) {
        const other =
          activeConversation.otherParticipant ||
          activeConversation.participants.find((p) => p.employeeId !== currentUserId) ||
          activeConversation.participants[0];

        if (other) {
          setSelectedContact({
            id: other.employeeId,
            employeeId: other.employeeId,
            name: other.name,
            email: other.email,
            department: other.department,
            designation: other.designation,
            avatarUrl: other.avatarUrl || activeConversation.avatarUrl,
            isOnline: other.isOnline,
            lastSeen: other.lastSeen,
          });
          setContactDrawerOpen(true);
        }
      }
    },
    [activeConversation, currentUserId]
  );

  const handleCloseContactInfo = useCallback(() => {
    setContactDrawerOpen(false);
  }, []);

  // Real-time dynamic avatar synchronization across conversation list, chat window, and drawers
  useEffect(() => {
    const handleAvatarSync = (e: Event) => {
      const customEvt = e as CustomEvent<{ employeeId: string; avatarUrl: string | null }>;
      if (!customEvt.detail?.employeeId) return;
      const { employeeId, avatarUrl } = customEvt.detail;

      // 1. Update conversations
      setConversations((prev) =>
        prev.map((c) => {
          let updated = false;
          let newAvatarUrl = c.avatarUrl;
          if (
            !c.isGroup &&
            (c.otherParticipant?.employeeId === employeeId ||
              c.participants.some(
                (p) => p.employeeId === employeeId && p.employeeId !== currentUserId
              ))
          ) {
            newAvatarUrl = avatarUrl;
            updated = true;
          }
          const newParticipants = c.participants.map((p) => {
            if (p.employeeId === employeeId) {
              updated = true;
              return { ...p, avatarUrl };
            }
            return p;
          });

          const newOther =
            c.otherParticipant && c.otherParticipant.employeeId === employeeId
              ? { ...c.otherParticipant, avatarUrl }
              : c.otherParticipant;

          return updated
            ? {
                ...c,
                avatarUrl: newAvatarUrl,
                participants: newParticipants,
                otherParticipant: newOther,
              }
            : c;
        })
      );

      // 2. Update message bubbles
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === employeeId ? { ...m, senderAvatarUrl: avatarUrl } : m
        )
      );

      // 3. Update active contact drawer if open
      setSelectedContact((prev) => {
        if (!prev) return null;
        if (prev.employeeId === employeeId || prev.id === employeeId) {
          return { ...prev, avatarUrl };
        }
        return prev;
      });
    };

    window.addEventListener("be_avatar_updated", handleAvatarSync);
    return () => window.removeEventListener("be_avatar_updated", handleAvatarSync);
  }, [currentUserId]);

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
          isSuperAdmin={isSuperAdmin}
          chatMode={chatMode}
          onModeChange={handleModeChange}
          auditConversations={auditConversations}
          isLoadingAudit={isLoadingAudit}
          auditTypeFilter={auditTypeFilter}
          onAuditTypeFilterChange={setAuditTypeFilter}
          auditDepartmentFilter={auditDepartmentFilter}
          onAuditDepartmentFilterChange={setAuditDepartmentFilter}
          auditSearch={auditSearch}
          onAuditSearchChange={setAuditSearch}
          departmentsList={departmentsList}
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
          onOpenInfo={() => {
            if (activeConversation?.isGroup) {
              setInfoDrawerOpen(true);
            } else {
              handleOpenContactInfo();
            }
          }}
          onOpenContactInfo={() => handleOpenContactInfo()}
          onOpenLightbox={handleOpenLightbox}
          onBackMobile={() => setShowMobileChat(false)}
          isLoadingMessages={isLoadingMessages}
          onToggleReaction={handleToggleReaction}
          isOversightMode={chatMode === "ALL_ORG_CHATS"}
          isAiThinking={isAiThinking}
          onTriggerTestReport={handleTriggerTestReport}
        />
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Group Info Drawer */}
      {activeConversation && activeConversation.isGroup && (
        <GroupInfoDrawer
          isOpen={infoDrawerOpen}
          onClose={() => setInfoDrawerOpen(false)}
          conversationName={activeConversation.name}
          isGroup={activeConversation.isGroup}
          avatarUrl={activeConversation.avatarUrl}
          sendMessagePermission={activeConversation.sendMessagePermission}
          participants={activeConversation.participants}
          currentUserId={currentUserId}
          conversationId={activeConversation.id}
          onLeaveGroup={handleLeaveGroup}
          onUpdateGroupPermission={handleUpdateGroupPermission}
          onUpdateMemberPermission={handleUpdateMemberPermission}
          onUpdateGroupAvatar={handleUpdateGroupAvatar}
          onSelectMember={(p) => handleOpenContactInfo(p)}
          onOpenLightbox={handleOpenLightbox}
        />
      )}

      {/* WhatsApp-Style Contact Info Drawer */}
      <ContactInfoDrawer
        isOpen={contactDrawerOpen}
        onClose={handleCloseContactInfo}
        contact={selectedContact}
        messages={messages}
        currentUserId={currentUserId}
        onOpenLightbox={(photoUrl, title, subtitle, canEdit) =>
          handleOpenLightbox(
            photoUrl,
            title,
            subtitle,
            canEdit,
            canEdit ? handleSelfPhotoUpload : undefined,
            canEdit ? handleSelfPhotoRemove : undefined
          )
        }
        onStartDM={handleStartDM}
      />

      {/* Full-Screen Photo Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={lightboxState.isOpen}
        onClose={handleCloseLightbox}
        photoUrl={lightboxState.photoUrl}
        title={lightboxState.title}
        subtitle={lightboxState.subtitle}
        canEdit={lightboxState.canEdit}
        onUploadPhoto={lightboxState.onUpload}
        onRemovePhoto={lightboxState.onRemove}
      />
    </div>
  );
}
