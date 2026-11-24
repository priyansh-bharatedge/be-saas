"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ChatMessageType,
  ChatParticipantRole,
  TrackerStatus,
  GroupSendMessagePermission,
} from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatParticipantInfo {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  profilePic?: string | null;
  role: ChatParticipantRole;
  canSendMessages: boolean;
  lastReadAt: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

export interface ChatAttachmentItem {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  messageType: "IMAGE" | "DOCUMENT" | "FILE";
}

export interface ConversationSummary {
  id: string;
  isGroup: boolean;
  name: string;
  avatarUrl?: string | null;
  sendMessagePermission?: GroupSendMessagePermission;
  subtitle: string; // Other participant's department or "Group (X members)"
  lastMessage?: {
    id: string;
    content: string | null;
    senderId: string;
    senderName: string;
    messageType: ChatMessageType;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  participants: ChatParticipantInfo[];
  otherParticipant?: ChatParticipantInfo | null;
  isOnline?: boolean;
  lastSeen?: string | null;
  onlineCount?: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderDepartment?: string;
  content: string | null;
  messageType: ChatMessageType;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentMimeType: string | null;
  attachments?: ChatAttachmentItem[];
  createdAt: string;
  isSelf: boolean;
  status: "SENT" | "DELIVERED" | "READ";
  reactions?: MessageReactionGroup[];
}

export interface MessageReactionGroup {
  emoji: string;
  count: number;
  users: { id: string; name: string }[];
  hasReacted: boolean;
}

/**
 * Validates that the current logged-in employee belongs to the conversation.
 * Returns the participant record or throws a 403 Forbidden error.
 */
export async function assertConversationMembership(conversationId: string, employeeId: string) {
  const membership = await db.chatParticipant.findUnique({
    where: {
      conversationId_employeeId: {
        conversationId,
        employeeId,
      },
    },
  });

  if (!membership) {
    throw new Error("Forbidden: You are not an active participant in this conversation.");
  }

  return membership;
}

/**
 * Returns all conversations for the current employee with unread badges, last message, and recipient details
 */
export async function getConversationsAction(): Promise<ActionResult<ConversationSummary[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const participantRecords = await db.chatParticipant.findMany({
      where: { employeeId: user.id },
      include: {
        conversation: {
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
                    status: true,
                    isOnline: true,
                    lastSeen: true,
                    lastActiveAt: true,
                    attendances: {
                      where: { date: todayDate },
                      select: { currentStatus: true },
                      take: 1,
                    },
                  },
                },
              },
            },
            messages: {
              where: { isDeleted: false },
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
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    const ONLINE_THRESHOLD_MS = 60 * 1000; // 60 seconds
    const nowMs = Date.now();

    // Compute unread counts & online presence in parallel
    const summaries: ConversationSummary[] = await Promise.all(
      participantRecords.map(async (record) => {
        const conv = record.conversation;
        const lastRead = record.lastReadAt;

        const unreadCount = await db.chatMessage.count({
          where: {
            conversationId: conv.id,
            isDeleted: false,
            senderId: { not: user.id },
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        });

        const formattedParticipants: ChatParticipantInfo[] = conv.participants.map((p) => {
          const emp = p.employee;
          const todayAttendance = emp.attendances?.[0];
          const isTimerRunning =
            todayAttendance?.currentStatus === TrackerStatus.ACTIVE ||
            todayAttendance?.currentStatus === TrackerStatus.MEETING_MODE;

          const isUserOnline =
            emp.isOnline &&
            isTimerRunning &&
            emp.lastActiveAt !== null &&
            nowMs - new Date(emp.lastActiveAt).getTime() <= ONLINE_THRESHOLD_MS;

          return {
            id: p.id,
            employeeId: emp.id,
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            email: emp.workEmail,
            department: emp.department,
            designation: emp.designation,
            role: p.role,
            canSendMessages: p.canSendMessages ?? true,
            lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
            isOnline: isUserOnline,
            lastSeen: emp.lastSeen ? emp.lastSeen.toISOString() : null,
          };
        });

        const other = formattedParticipants.find((p) => p.employeeId !== user.id) || null;
        const onlineCount = formattedParticipants.filter((p) => p.isOnline).length;

        let title = conv.name || "Chat";
        let subtitle = "";

        if (conv.isGroup) {
          title = conv.name || "Group Discussion";
          subtitle =
            onlineCount > 0
              ? `${formattedParticipants.length} members, ${onlineCount} online`
              : `${formattedParticipants.length} members`;
        } else if (other) {
          title = other.name;
          subtitle = `${other.designation} • ${other.department}`;
        }

        const lastMsg = conv.messages[0] || null;

        return {
          id: conv.id,
          isGroup: conv.isGroup,
          name: title,
          avatarUrl: conv.avatarUrl,
          sendMessagePermission: conv.sendMessagePermission || "ALL_MEMBERS",
          subtitle,
          unreadCount,
          updatedAt: conv.updatedAt.toISOString(),
          participants: formattedParticipants,
          otherParticipant: other,
          isOnline: other?.isOnline || false,
          lastSeen: other?.lastSeen || null,
          onlineCount,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                senderId: lastMsg.senderId,
                senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
                messageType: lastMsg.messageType,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : null,
        };
      })
    );

    return { success: true, data: summaries };
  } catch (error) {
    console.error("Error retrieving chat conversations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load conversations.",
    };
  }
}

/**
 * Retrieves or creates a 1-on-1 Direct Message conversation between current user and target colleague
 */
export async function getOrCreateDMAction(
  targetEmployeeId: string
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    if (user.id === targetEmployeeId) {
      return { success: false, error: "Cannot create a direct conversation with yourself." };
    }

    const target = await db.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!target) {
      return { success: false, error: "Selected colleague record was not found." };
    }

    // Check for an existing 1-on-1 direct conversation
    const existingConvs = await db.chatConversation.findMany({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { employeeId: user.id } } },
          { participants: { some: { employeeId: targetEmployeeId } } },
        ],
      },
      select: { id: true },
    });

    if (existingConvs.length > 0) {
      return { success: true, data: { conversationId: existingConvs[0].id } };
    }

    // Create a new DM conversation
    const newConv = await db.chatConversation.create({
      data: {
        isGroup: false,
        createdById: user.id,
        participants: {
          create: [
            { employeeId: user.id, role: ChatParticipantRole.ADMIN },
            { employeeId: targetEmployeeId, role: ChatParticipantRole.MEMBER },
          ],
        },
      },
    });

    revalidatePath("/chat");
    return { success: true, data: { conversationId: newConv.id } };
  } catch (error) {
    console.error("Error creating DM:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open direct conversation.",
    };
  }
}

/**
 * Creates a new Group Conversation with selected colleagues
 */
export async function createGroupAction({
  name,
  participantIds,
}: {
  name: string;
  participantIds: string[];
}): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Please provide a valid group name." };
    }

    // Filter out current user from participantIds and ensure uniqueness
    const uniqueIds = Array.from(new Set(participantIds.filter((id) => id !== user.id)));

    if (uniqueIds.length === 0) {
      return { success: false, error: "Please select at least one colleague to add to the group." };
    }

    const group = await db.chatConversation.create({
      data: {
        isGroup: true,
        name: trimmedName,
        createdById: user.id,
        participants: {
          create: [
            { employeeId: user.id, role: ChatParticipantRole.ADMIN },
            ...uniqueIds.map((id) => ({
              employeeId: id,
              role: ChatParticipantRole.MEMBER,
            })),
          ],
        },
        messages: {
          create: {
            senderId: user.id,
            content: `Group "${trimmedName}" was created.`,
            messageType: ChatMessageType.TEXT,
          },
        },
      },
    });

    revalidatePath("/chat");
    return { success: true, data: { conversationId: group.id } };
  } catch (error) {
    console.error("Error creating group:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group conversation.",
    };
  }
}

/**
 * Retrieves message history for a conversation (strictly verifies user membership)
 */
export async function getMessagesAction(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<ActionResult<MessageItem[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    // 403 Security Check
    await assertConversationMembership(conversationId, user.id);

    // Update lastReadAt for current user
    await db.chatParticipant.update({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Query participants to compute read receipts (lastReadAt)
    const participants = await db.chatParticipant.findMany({
      where: { conversationId },
      select: { employeeId: true, lastReadAt: true },
    });

    const otherParticipants = participants.filter((p) => p.employeeId !== user.id);
    const maxOtherReadAt = otherParticipants.reduce<Date | null>((latest, p) => {
      if (!p.lastReadAt) return latest;
      if (!latest || p.lastReadAt > latest) return p.lastReadAt;
      return latest;
    }, null);

    const messages = await db.chatMessage.findMany({
      where: {
        conversationId,
        isDeleted: false,
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
      const isSelf = m.senderId === user.id;
      const first = m.sender?.firstName || "U";
      const last = m.sender?.lastName || "";
      const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

      let status: "SENT" | "DELIVERED" | "READ" = "DELIVERED";
      if (isSelf) {
        if (maxOtherReadAt && new Date(m.createdAt) <= maxOtherReadAt) {
          status = "READ";
        } else {
          status = "DELIVERED";
        }
      } else {
        status = "READ";
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
        if (r.employee.id === user.id) {
          group.hasReacted = true;
        }
        reactionMap.set(r.emoji, group);
      });

      const formattedReactions: MessageReactionGroup[] = Array.from(
        reactionMap.entries()
      ).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        users: data.users,
        hasReacted: data.hasReacted,
      }));

      // Parse multi-attachment JSON or fallback to legacy single attachment fields
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

      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: `${first} ${last}`.trim(),
        senderInitials: initials,
        senderDepartment: m.sender?.department,
        content: m.content,
        messageType: m.messageType,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentSize: m.attachmentSize,
        attachmentMimeType: m.attachmentMimeType,
        attachments: parsedAttachments,
        createdAt: m.createdAt.toISOString(),
        isSelf,
        status,
        reactions: formattedReactions,
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load chat messages.",
    };
  }
}

/**
 * Sends a message in a conversation (strictly verifies user membership)
 */
export async function sendMessageAction(data: {
  conversationId: string;
  content?: string;
  messageType?: ChatMessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMimeType?: string;
  attachments?: ChatAttachmentItem[];
}): Promise<ActionResult<MessageItem>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const {
      conversationId,
      content,
      attachments,
    } = data;

    let {
      messageType = ChatMessageType.TEXT,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      attachmentMimeType,
    } = data;

    // If attachments array is provided and non-empty, sync first attachment for backward compatibility
    if (attachments && attachments.length > 0) {
      const first = attachments[0];
      if (!attachmentUrl) attachmentUrl = first.url;
      if (!attachmentName) attachmentName = first.name;
      if (!attachmentSize) attachmentSize = first.size;
      if (!attachmentMimeType) attachmentMimeType = first.mimeType;
      if (messageType === ChatMessageType.TEXT) {
        messageType =
          first.messageType === "IMAGE"
            ? ChatMessageType.IMAGE
            : first.messageType === "DOCUMENT"
            ? ChatMessageType.DOCUMENT
            : ChatMessageType.FILE;
      }
    }

    // 403 Security Check
    await assertConversationMembership(conversationId, user.id);

    // Group-level & member-level messaging permissions enforcement
    const conv = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { isGroup: true, sendMessagePermission: true },
    });

    if (conv?.isGroup) {
      const participant = await db.chatParticipant.findUnique({
        where: {
          conversationId_employeeId: {
            conversationId,
            employeeId: user.id,
          },
        },
        select: { role: true, canSendMessages: true },
      });

      if (
        conv.sendMessagePermission === GroupSendMessagePermission.ONLY_ADMINS &&
        participant?.role !== ChatParticipantRole.ADMIN
      ) {
        return {
          success: false,
          error: "Only admins are allowed to send messages in this group.",
        };
      }

      if (participant?.canSendMessages === false) {
        return {
          success: false,
          error: "You are restricted from sending messages in this group.",
        };
      }
    }

    const textContent = content?.trim() || null;
    if (!textContent && !attachmentUrl && (!attachments || attachments.length === 0)) {
      return { success: false, error: "Cannot send an empty message." };
    }

    const now = new Date();
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: todayDate,
        },
      },
      select: { currentStatus: true },
    });

    const isTimerRunning =
      attendance?.currentStatus === TrackerStatus.ACTIVE ||
      attendance?.currentStatus === TrackerStatus.MEETING_MODE;

    const [message] = await db.$transaction([
      db.chatMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          content: textContent,
          messageType,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          attachmentSize: attachmentSize || null,
          attachmentMimeType: attachmentMimeType || null,
          attachments: attachments && attachments.length > 0 ? (attachments as any) : undefined,
        },
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
        },
      }),
      db.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      }),
      db.chatParticipant.update({
        where: {
          conversationId_employeeId: {
            conversationId,
            employeeId: user.id,
          },
        },
        data: { lastReadAt: now },
      }),
      db.employee.update({
        where: { id: user.id },
        data: isTimerRunning
          ? {
              isOnline: true,
              lastActiveAt: now,
              lastSeen: now,
            }
          : {
              isOnline: false,
              lastSeen: now,
            },
      }),
    ]);

    const first = message.sender?.firstName || "U";
    const last = message.sender?.lastName || "";
    const senderFullName = `${first} ${last}`.trim() || "A colleague";

    // Generate notifications for other conversation participants
    try {
      const otherParticipants = await db.chatParticipant.findMany({
        where: {
          conversationId,
          employeeId: { not: user.id },
        },
        include: {
          conversation: {
            select: { isGroup: true, name: true },
          },
        },
      });

      if (otherParticipants.length > 0) {
        const isGroupConv = otherParticipants[0].conversation.isGroup;
        const groupTitle = otherParticipants[0].conversation.name || "Group";
        const notifTitle = isGroupConv
          ? `${senderFullName} (${groupTitle})`
          : `New message from ${senderFullName}`;

        const notifSnippet = textContent
          ? textContent.length > 90
            ? textContent.slice(0, 87) + "..."
            : textContent
          : messageType === "IMAGE"
          ? "📷 Photo attachment"
          : messageType === "DOCUMENT"
          ? "📄 Document attachment"
          : "📎 File attachment";

        await db.notification.createMany({
          data: otherParticipants.map((p) => ({
            recipientId: p.employeeId,
            title: notifTitle,
            message: notifSnippet,
            type: "INFO",
            actionUrl: `/chat?c=${conversationId}`,
          })),
        });
      }
    } catch (notifErr) {
      console.error("Failed to generate chat notifications:", notifErr);
    }

    const formatted: MessageItem = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName: `${first} ${last}`.trim(),
      senderInitials: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase(),
      senderDepartment: message.sender?.department,
      content: message.content,
      messageType: message.messageType,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      attachmentSize: message.attachmentSize,
      attachmentMimeType: message.attachmentMimeType,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      createdAt: message.createdAt.toISOString(),
      isSelf: true,
      status: "DELIVERED",
      reactions: [],
    };

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message.",
    };
  }
}

/**
 * Searches active employees to start new 1-on-1 DMs or add to a group
 */
export async function searchEmployeesForChatAction(
  query: string
): Promise<ActionResult<{ id: string; name: string; email: string; department: string; designation: string }[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const q = query.trim();
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const employees = await db.employee.findMany({
      where: {
        status: "ACTIVE",
        id: { not: user.id },
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { workEmail: { contains: q, mode: "insensitive" } },
                { department: { contains: q, mode: "insensitive" } },
                { designation: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        department: true,
        designation: true,
        isOnline: true,
        lastSeen: true,
        lastActiveAt: true,
        attendances: {
          where: { date: todayDate },
          select: { currentStatus: true },
          take: 1,
        },
      },
      take: 20,
      orderBy: { firstName: "asc" },
    });

    const ONLINE_THRESHOLD_MS = 60 * 1000;
    const nowMs = Date.now();

    const mapped = employees.map((e) => {
      const todayAttendance = e.attendances?.[0];
      const isTimerRunning =
        todayAttendance?.currentStatus === TrackerStatus.ACTIVE ||
        todayAttendance?.currentStatus === TrackerStatus.MEETING_MODE;

      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        email: e.workEmail,
        department: e.department,
        designation: e.designation,
        isOnline:
          e.isOnline &&
          isTimerRunning &&
          e.lastActiveAt !== null &&
          nowMs - new Date(e.lastActiveAt).getTime() <= ONLINE_THRESHOLD_MS,
        lastSeen: e.lastSeen ? e.lastSeen.toISOString() : null,
      };
    });

    return { success: true, data: mapped };
  } catch (error) {
    console.error("Error searching employees for chat:", error);
    return { success: false, error: "Failed to search employees." };
  }
}

/**
 * Leaves a group chat
 */
export async function leaveGroupAction(conversationId: string): Promise<ActionResult<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const conv = await db.chatConversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conv || !conv.isGroup) {
      return { success: false, error: "Only group conversations can be left." };
    }

    await db.chatParticipant.delete({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
    });

    // Post leaving system message
    await db.chatMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content: `${user.name || "A member"} left the group.`,
        messageType: ChatMessageType.TEXT,
      },
    });

    revalidatePath("/chat");
    // Also touch user presence based on active working hours
    const now = new Date();
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: todayDate,
        },
      },
      select: { currentStatus: true },
    });

    const isTimerRunning =
      attendance?.currentStatus === TrackerStatus.ACTIVE ||
      attendance?.currentStatus === TrackerStatus.MEETING_MODE;

    await db.employee.update({
      where: { id: user.id },
      data: isTimerRunning
        ? {
            isOnline: true,
            lastActiveAt: now,
            lastSeen: now,
          }
        : {
            isOnline: false,
            lastSeen: now,
          },
    });

    return { success: true, data: true };
  } catch (error) {
    console.error("Error leaving group:", error);
    return { success: false, error: "Failed to leave group." };
  }
}

/**
 * Marks all messages in a conversation as read by updating current user's lastReadAt
 */
export async function markConversationAsReadAction(
  conversationId: string
): Promise<ActionResult<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    await assertConversationMembership(conversationId, user.id);

    await db.chatParticipant.update({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    // Also mark any unread notifications for this conversation as read
    await db.notification.updateMany({
      where: {
        recipientId: user.id,
        actionUrl: { contains: conversationId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Also touch user presence based on active working hours
    const now = new Date();
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: todayDate,
        },
      },
      select: { currentStatus: true },
    });

    const isTimerRunning =
      attendance?.currentStatus === TrackerStatus.ACTIVE ||
      attendance?.currentStatus === TrackerStatus.MEETING_MODE;

    await db.employee.update({
      where: { id: user.id },
      data: isTimerRunning
        ? {
            isOnline: true,
            lastActiveAt: now,
            lastSeen: now,
          }
        : {
            isOnline: false,
            lastSeen: now,
          },
    });

    return { success: true, data: true };
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as read.",
    };
  }
}

/**
 * Fast aggregate query returning total unread chat count across all conversations
 */
export async function getUnreadChatCountAction(): Promise<
  ActionResult<{ unreadCount: number }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const participants = await db.chatParticipant.findMany({
      where: { employeeId: user.id },
      select: { conversationId: true, lastReadAt: true },
    });

    if (participants.length === 0) {
      return { success: true, data: { unreadCount: 0 } };
    }

    const counts = await Promise.all(
      participants.map((p) =>
        db.chatMessage.count({
          where: {
            conversationId: p.conversationId,
            isDeleted: false,
            senderId: { not: user.id },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        })
      )
    );

    const totalUnread = counts.reduce((acc, curr) => acc + curr, 0);
    return { success: true, data: { unreadCount: totalUnread } };
  } catch (error) {
    console.error("Error counting unread messages:", error);
    return { success: false, error: "Failed to count unread messages." };
  }
}

/**
 * Lightweight heartbeat action to track online presence and last seen,
 * strictly bound to active working hours (Attendance timer status).
 */
export async function updatePresenceAction(
  status: "online" | "offline" = "online"
): Promise<ActionResult<{ isOnline: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const now = new Date();

    if (status === "offline") {
      await db.employee.update({
        where: { id: user.id },
        data: {
          isOnline: false,
          lastSeen: now,
        },
      });
      return { success: true, data: { isOnline: false } };
    }

    // Check today's attendance timer status
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);

    const attendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: user.id,
          date: todayDate,
        },
      },
      select: { currentStatus: true },
    });

    const isTimerRunning =
      attendance?.currentStatus === TrackerStatus.ACTIVE ||
      attendance?.currentStatus === TrackerStatus.MEETING_MODE;

    if (!isTimerRunning) {
      // Working hours timer is paused (IDLE), punched out, or not started - mark Offline
      await db.employee.update({
        where: { id: user.id },
        data: {
          isOnline: false,
          lastSeen: now,
        },
      });
      return { success: true, data: { isOnline: false } };
    }

    // Both browser session heartbeat AND working hours timer are actively running
    await db.employee.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastActiveAt: now,
        lastSeen: now,
      },
    });

    return { success: true, data: { isOnline: true } };
  } catch (error) {
    console.error("Error updating presence:", error);
    return { success: false, error: "Failed to update presence." };
  }
}

/**
 * Toggles an emoji reaction on a message for the current user.
 * - If the user has already reacted with the same emoji, the reaction is removed.
 * - If the user has reacted with a different emoji, it is updated to the new emoji.
 * - If the user has not reacted, a new reaction is created.
 * Returns the aggregated reactions for the message.
 */
export async function toggleMessageReactionAction({
  messageId,
  emoji,
}: {
  messageId: string;
  emoji: string;
}): Promise<ActionResult<{ reactions: MessageReactionGroup[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const trimmedEmoji = emoji.trim();
    if (!trimmedEmoji) {
      return { success: false, error: "Emoji cannot be empty." };
    }

    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });

    if (!message) {
      return { success: false, error: "Message not found." };
    }

    // 403 Security Check: Current user must be a participant in the conversation
    await assertConversationMembership(message.conversationId, user.id);

    // Look for existing reaction by this user on this message
    const existing = await db.chatMessageReaction.findUnique({
      where: {
        messageId_employeeId: {
          messageId,
          employeeId: user.id,
        },
      },
    });

    if (existing) {
      if (existing.emoji === trimmedEmoji) {
        // Toggle off (remove)
        await db.chatMessageReaction.delete({
          where: { id: existing.id },
        });
      } else {
        // Switch to new emoji
        await db.chatMessageReaction.update({
          where: { id: existing.id },
          data: { emoji: trimmedEmoji },
        });
      }
    } else {
      // Create new reaction
      await db.chatMessageReaction.create({
        data: {
          messageId,
          employeeId: user.id,
          emoji: trimmedEmoji,
        },
      });
    }

    // Fetch updated reactions for this message to return real-time grouped state
    const allReactions = await db.chatMessageReaction.findMany({
      where: { messageId },
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
    });

    const reactionMap = new Map<
      string,
      { count: number; users: { id: string; name: string }[]; hasReacted: boolean }
    >();
    allReactions.forEach((r) => {
      const group = reactionMap.get(r.emoji) || {
        count: 0,
        users: [],
        hasReacted: false,
      };
      group.count += 1;
      const userName = `${r.employee.firstName} ${r.employee.lastName}`.trim();
      group.users.push({ id: r.employee.id, name: userName });
      if (r.employee.id === user.id) {
        group.hasReacted = true;
      }
      reactionMap.set(r.emoji, group);
    });

    const formattedReactions: MessageReactionGroup[] = Array.from(
      reactionMap.entries()
    ).map(([emojiKey, data]) => ({
      emoji: emojiKey,
      count: data.count,
      users: data.users,
      hasReacted: data.hasReacted,
    }));

    return { success: true, data: { reactions: formattedReactions } };
  } catch (error) {
    console.error("Error toggling message reaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle reaction.",
    };
  }
}

/**
 * Updates the group-level message sending permission ('ALL_MEMBERS' | 'ONLY_ADMINS').
 * Enforces that only group ADMINs can change this setting.
 * Automatically logs a system notice in the chat timeline.
 */
export async function updateGroupSendMessagePermissionAction({
  conversationId,
  permission,
}: {
  conversationId: string;
  permission: GroupSendMessagePermission;
}): Promise<ActionResult<{ permission: GroupSendMessagePermission }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const membership = await db.chatParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
      include: {
        conversation: { select: { isGroup: true, name: true } },
      },
    });

    if (!membership || !membership.conversation.isGroup) {
      return { success: false, error: "Conversation not found or not a group." };
    }

    if (membership.role !== ChatParticipantRole.ADMIN) {
      return { success: false, error: "Forbidden: Only group admins can change messaging permissions." };
    }

    await db.chatConversation.update({
      where: { id: conversationId },
      data: { sendMessagePermission: permission },
    });

    const adminName = user.name?.trim() || "An admin";
    const systemNotice =
      permission === GroupSendMessagePermission.ONLY_ADMINS
        ? `${adminName} changed this group's settings to allow only admins to send messages.`
        : `${adminName} changed this group's settings to allow all members to send messages.`;

    await db.chatMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content: systemNotice,
        messageType: ChatMessageType.TEXT,
      },
    });

    revalidatePath("/chat");
    return { success: true, data: { permission } };
  } catch (error) {
    console.error("Error updating group messaging permission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group permissions.",
    };
  }
}

/**
 * Updates an individual member's messaging permission in a group.
 * Enforces that only group ADMINs can mute/allow members.
 * Automatically logs a system notice in the chat timeline.
 */
export async function updateMemberMessagingPermissionAction({
  conversationId,
  employeeId,
  canSendMessages,
}: {
  conversationId: string;
  employeeId: string;
  canSendMessages: boolean;
}): Promise<ActionResult<{ canSendMessages: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please log in." };
    }

    const adminMembership = await db.chatParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId: user.id,
        },
      },
      include: {
        conversation: { select: { isGroup: true } },
      },
    });

    if (!adminMembership || !adminMembership.conversation.isGroup) {
      return { success: false, error: "Conversation not found or not a group." };
    }

    if (adminMembership.role !== ChatParticipantRole.ADMIN) {
      return { success: false, error: "Forbidden: Only group admins can change member permissions." };
    }

    const targetParticipant = await db.chatParticipant.findUnique({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId,
        },
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    if (!targetParticipant) {
      return { success: false, error: "Target group member was not found." };
    }

    if (targetParticipant.role === ChatParticipantRole.ADMIN && !canSendMessages) {
      return { success: false, error: "Cannot restrict an admin from sending messages." };
    }

    await db.chatParticipant.update({
      where: {
        conversationId_employeeId: {
          conversationId,
          employeeId,
        },
      },
      data: { canSendMessages },
    });

    const adminName = user.name?.trim() || "An admin";
    const targetName =
      `${targetParticipant.employee.firstName || ""} ${targetParticipant.employee.lastName || ""}`.trim() ||
      "A member";

    const systemNotice = canSendMessages
      ? `${adminName} allowed ${targetName} to send messages.`
      : `${adminName} restricted ${targetName} from sending messages in this group.`;

    await db.chatMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content: systemNotice,
        messageType: ChatMessageType.TEXT,
      },
    });

    revalidatePath("/chat");
    return { success: true, data: { canSendMessages } };
  } catch (error) {
    console.error("Error updating member messaging permission:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member permission.",
    };
  }
}


