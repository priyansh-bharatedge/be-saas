"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ChatMessageType, ChatParticipantRole } from "@prisma/client";

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
  lastReadAt: string | null;
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

    // Compute unread counts in parallel
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

        const formattedParticipants: ChatParticipantInfo[] = conv.participants.map((p) => ({
          id: p.id,
          employeeId: p.employee.id,
          name: `${p.employee.firstName} ${p.employee.lastName}`,
          email: p.employee.workEmail,
          department: p.employee.department,
          designation: p.employee.designation,
          role: p.role,
          lastReadAt: p.lastReadAt ? p.lastReadAt.toISOString() : null,
        }));

        const other = formattedParticipants.find((p) => p.employeeId !== user.id) || null;

        let title = conv.name || "Chat";
        let subtitle = "";

        if (conv.isGroup) {
          title = conv.name || "Group Discussion";
          subtitle = `${formattedParticipants.length} members`;
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
          subtitle,
          unreadCount,
          updatedAt: conv.updatedAt.toISOString(),
          participants: formattedParticipants,
          otherParticipant: other,
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

    const textContent = content?.trim() || null;
    if (!textContent && !attachmentUrl && (!attachments || attachments.length === 0)) {
      return { success: false, error: "Cannot send an empty message." };
    }

    const now = new Date();

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
    ]);

    const first = message.sender?.firstName || "U";
    const last = message.sender?.lastName || "";

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
      },
      take: 20,
      orderBy: { firstName: "asc" },
    });

    const mapped = employees.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      email: e.workEmail,
      department: e.department,
      designation: e.designation,
    }));

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

    return { success: true, data: true };
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as read.",
    };
  }
}
