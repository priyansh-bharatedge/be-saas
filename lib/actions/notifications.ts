"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { NotificationType, Role } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SerializedNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

/**
 * Creates a notification for a specific user ID
 */
export async function createNotification({
  recipientUserId,
  recipientEmail,
  title,
  message,
  type = NotificationType.INFO,
  actionUrl,
}: {
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}): Promise<boolean> {
  try {
    let targetUserId = recipientUserId;

    if (!targetUserId && recipientEmail) {
      const emp = await db.employee.findUnique({
        where: { workEmail: recipientEmail },
        select: { id: true },
      });
      targetUserId = emp?.id;
    }

    if (!targetUserId) {
      // Cannot send notification without user
      return false;
    }

    await db.notification.create({
      data: {
        recipientId: targetUserId,
        title: title.trim(),
        message: message.trim(),
        type,
        actionUrl: actionUrl?.trim() || null,
      },
    });

    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}

/**
 * Sends a notification to all HR Admins and Super Admins
 */
export async function notifyHRAdmins({
  title,
  message,
  type = NotificationType.ACTION_REQUIRED,
  actionUrl,
}: {
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}) {
  try {
    const adminEmployees = await db.employee.findMany({
      where: {
        OR: [{ role: Role.Admin }, { role: Role.HRMS }],
      },
      select: { id: true },
    });

    if (adminEmployees.length === 0) return;

    await db.notification.createMany({
      data: adminEmployees.map((u) => ({
        recipientId: u.id,
        title: title.trim(),
        message: message.trim(),
        type,
        actionUrl: actionUrl?.trim() || null,
      })),
    });
  } catch (error) {
    console.error("Error notifying HR admins:", error);
  }
}

/**
 * Sends a notification to all active system users (e.g. For new company policy or holiday)
 */
export async function notifyAllUsers({
  title,
  message,
  type = NotificationType.INFO,
  actionUrl,
}: {
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}) {
  try {
    const employees = await db.employee.findMany({
      select: { id: true },
    });

    if (employees.length === 0) return;

    await db.notification.createMany({
      data: employees.map((u) => ({
        recipientId: u.id,
        title: title.trim(),
        message: message.trim(),
        type,
        actionUrl: actionUrl?.trim() || null,
      })),
    });
  } catch (error) {
    console.error("Error notifying all users:", error);
  }
}

/**
 * Retrieves the logged-in user's notifications and unread count
 */
export async function getMyNotificationsAction(): Promise<
  ActionResult<{
    notifications: SerializedNotification[];
    unreadCount: number;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized." };
    }

    const [unreadCount, rawNotifications] = await Promise.all([
      db.notification.count({
        where: { recipientId: user.id, isRead: false },
      }),
      db.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const notifications: SerializedNotification[] = rawNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      actionUrl: n.actionUrl,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    };
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load notifications.",
    };
  }
}

/**
 * Marks a single notification as read
 */
export async function markNotificationAsReadAction(
  id: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.notification.updateMany({
      where: { id, recipientId: user.id },
      data: { isRead: true },
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error marking notification read:", error);
    return { success: false, error: "Failed to mark as read." };
  }
}

/**
 * Marks all notifications for current user as read
 */
export async function markAllNotificationsAsReadAction(): Promise<
  ActionResult<{ success: boolean }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.notification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true },
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error marking all read:", error);
    return { success: false, error: "Failed to mark all as read." };
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotificationAction(
  id: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.notification.deleteMany({
      where: { id, recipientId: user.id },
    });

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification." };
  }
}
