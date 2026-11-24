"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { SystemRole, ChatMessageType } from "@prisma/client";
import { ActionResult, MessageItem, ChatAttachmentItem, MessageReactionGroup } from "./chat";

export interface AuditConversationSummary {
  id: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string | null;
  displayTitle: string;
  displaySubtitle: string;
  departments: string[];
  participantCount: number;
  participants: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    role: string;
    isOnline: boolean;
    lastSeen: string | null;
  }[];
  lastMessage?: {
    id: string;
    content: string | null;
    senderName: string;
    messageType: ChatMessageType;
    createdAt: string;
    isDeleted: boolean;
  } | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface AuditConversationsFilter {
  chatType?: "ALL" | "DMS" | "GROUPS";
  department?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Super Admin audit action to query all conversations across the organization.
 * Strictly gated by user.systemRole === 'SUPER_ADMIN' (403 Forbidden for all other roles).
 */
export async function getAdminConversationsAction(
  filter: AuditConversationsFilter = {}
): Promise<ActionResult<AuditConversationSummary[]>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.systemRole !== SystemRole.SUPER_ADMIN) {
      return { success: false, error: "Forbidden: Super Admin access required." };
    }

    const { chatType = "ALL", department, search, limit = 50 } = filter;
    const q = search?.trim().toLowerCase() || "";

    const whereClause: any = {};

    if (chatType === "GROUPS") {
      whereClause.isGroup = true;
    } else if (chatType === "DMS") {
      whereClause.isGroup = false;
    }

    if (department && department !== "ALL") {
      whereClause.participants = {
        some: {
          employee: {
            department: {
              equals: department,
              mode: "insensitive",
            },
          },
        },
      };
    }

    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        {
          participants: {
            some: {
              employee: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { workEmail: { contains: q, mode: "insensitive" } },
                  { department: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
        },
        {
          messages: {
            some: {
              content: { contains: q, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const conversations = await db.chatConversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                workEmail: true,
                department: true,
                designation: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const formatted: AuditConversationSummary[] = conversations.map((conv) => {
      const parts = conv.participants.map((p) => ({
        id: p.id,
        employeeId: p.employee.id,
        name: `${p.employee.firstName} ${p.employee.lastName}`.trim(),
        email: p.employee.workEmail,
        department: p.employee.department,
        designation: p.employee.designation,
        role: p.role,
        isOnline: p.employee.isOnline,
        lastSeen: p.employee.lastSeen ? p.employee.lastSeen.toISOString() : null,
      }));

      const depts = Array.from(
        new Set(parts.map((p) => p.department).filter(Boolean))
      );

      let displayTitle = conv.name || "Chat";
      let displaySubtitle = "";

      if (conv.isGroup) {
        displayTitle = conv.name || "Group Discussion";
        displaySubtitle = `${parts.length} members • ${depts.join(", ") || "General"}`;
      } else {
        if (parts.length >= 2) {
          displayTitle = `${parts[0].name} ↔ ${parts[1].name}`;
          displaySubtitle = `${parts[0].department || "Employee"} • ${parts[1].department || "Employee"}`;
        } else if (parts.length === 1) {
          displayTitle = parts[0].name;
          displaySubtitle = parts[0].department;
        } else {
          displayTitle = "Direct Message";
          displaySubtitle = "Empty chat";
        }
      }

      const lastMsg = conv.messages[0] || null;

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        name: conv.name || displayTitle,
        avatarUrl: conv.avatarUrl,
        displayTitle,
        displaySubtitle,
        departments: depts,
        participantCount: parts.length,
        participants: parts,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`.trim(),
              messageType: lastMsg.messageType,
              createdAt: lastMsg.createdAt.toISOString(),
              isDeleted: lastMsg.isDeleted,
            }
          : null,
        messageCount: conv._count.messages,
        updatedAt: conv.updatedAt.toISOString(),
        createdAt: conv.createdAt.toISOString(),
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error in getAdminConversationsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load audit conversations.",
    };
  }
}

/**
 * Super Admin audit action to query all messages in a conversation.
 * Strictly read-only & silent:
 * - Does NOT add Super Admin to ChatParticipant.
 * - Does NOT update any participant's lastReadAt.
 * - Does NOT clear unread counts for participants.
 * - Includes soft-deleted messages marked with isDeleted: true.
 * Strictly gated by user.systemRole === 'SUPER_ADMIN' (403 Forbidden for all other roles).
 */
export async function getAdminMessagesAction(
  conversationId: string,
  limit = 100,
  before?: string
): Promise<ActionResult<MessageItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.systemRole !== SystemRole.SUPER_ADMIN) {
      return { success: false, error: "Forbidden: Super Admin access required." };
    }

    if (!conversationId) {
      return { success: false, error: "conversationId is required." };
    }

    const conv = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conv) {
      return { success: false, error: "Conversation not found." };
    }

    // Query messages including soft-deleted ones for full audit trail
    const messages = await db.chatMessage.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
        reactions: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const formatted: MessageItem[] = messages.map((m) => {
      const first = m.sender?.firstName || "U";
      const last = m.sender?.lastName || "";
      const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

      // Parse multi-attachment JSON or fallback
      let parsedAttachments: ChatAttachmentItem[] | undefined = undefined;
      if (m.attachments && Array.isArray(m.attachments)) {
        parsedAttachments = m.attachments as unknown as ChatAttachmentItem[];
      } else if (m.attachmentUrl) {
        parsedAttachments = [
          {
            url: m.attachmentUrl,
            name: m.attachmentName || "Attachment",
            size: m.attachmentSize || 0,
            mimeType: m.attachmentMimeType || "application/octet-stream",
            messageType:
              m.messageType === "IMAGE"
                ? "IMAGE"
                : m.messageType === "DOCUMENT"
                ? "DOCUMENT"
                : "FILE",
          },
        ];
      }

      // Group reactions by emoji
      const reactionMap = new Map<
        string,
        { count: number; users: { id: string; name: string }[]; hasReacted: boolean }
      >();
      (m.reactions || []).forEach((r) => {
        const group = reactionMap.get(r.emoji) || {
          count: 0,
          users: [],
          hasReacted: false,
        };
        group.count += 1;
        const userName = `${r.employee.firstName} ${r.employee.lastName}`.trim();
        group.users.push({ id: r.employee.id, name: userName });
        reactionMap.set(r.emoji, group);
      });

      const formattedReactions: MessageReactionGroup[] = Array.from(
        reactionMap.entries()
      ).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        users: data.users,
        hasReacted: false,
      }));

      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: `${first} ${last}`.trim(),
        senderInitials: initials,
        senderDepartment: m.sender?.department,
        content: m.isDeleted ? "[Deleted by sender]" : m.content,
        messageType: m.messageType,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentSize: m.attachmentSize,
        attachmentMimeType: m.attachmentMimeType,
        attachments: parsedAttachments,
        createdAt: m.createdAt.toISOString(),
        isSelf: m.senderId === user.id,
        status: "DELIVERED",
        reactions: formattedReactions,
        isDeleted: m.isDeleted,
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error in getAdminMessagesAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load audit messages.",
    };
  }
}

/**
 * Returns distinct departments across employees for Super Admin audit filtering.
 */
export async function getAvailableDepartmentsAction(): Promise<ActionResult<string[]>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.systemRole !== SystemRole.SUPER_ADMIN) {
      return { success: false, error: "Forbidden: Super Admin access required." };
    }

    const records = await db.employee.findMany({
      select: { department: true },
      distinct: ["department"],
      where: { department: { not: "" } },
    });

    const depts = records
      .map((r) => r.department)
      .filter((d): d is string => !!d && d.trim().length > 0)
      .sort();

    return { success: true, data: depts };
  } catch (error) {
    console.error("Error in getAvailableDepartmentsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load departments.",
    };
  }
}

