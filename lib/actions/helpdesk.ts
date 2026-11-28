"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  HelpdeskCategory,
  HelpdeskStatus,
  TicketPriority,
  NotificationType,
  HrmsWorkflowModule,
  WorkflowTriggerAction,
} from "@prisma/client";
import { createNotification, notifyHRAdmins } from "@/lib/actions/notifications";
import { evaluateHrmsWorkflow } from "@/lib/hrms/workflow-engine";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateTicketInput {
  targetDepartment: string;
  category: HelpdeskCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  attachments?: string[];
}

/**
 * Creates a new HRMS helpdesk ticket
 */
export async function createHelpdeskTicketAction(
  input: CreateTicketInput
): Promise<ActionResult<{ ticketId: string; ticketNumber: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await db.employee.findUnique({
      where: { id: user.id },
    });

    if (!employee) return { success: false, error: "Employee record not found." };

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `HD-${new Date().getFullYear()}-${randomSuffix}`;

    const ticket = await db.hrmsHelpdesk.create({
      data: {
        ticketNumber,
        employeeId: employee.id,
        targetDepartment: input.targetDepartment,
        category: input.category,
        priority: input.priority,
        subject: input.subject.trim(),
        description: input.description.trim(),
        attachments: input.attachments || [],
        status: HelpdeskStatus.OPEN,
      },
    });

    // Evaluate dynamic workflow
    await evaluateHrmsWorkflow({
      module: HrmsWorkflowModule.HELPDESK,
      triggerAction: WorkflowTriggerAction.ON_CREATE,
      recordId: ticket.id,
      employeeId: employee.id,
      department: input.targetDepartment,
      title: `Helpdesk Ticket ${ticketNumber}: ${input.subject}`,
      details: `${employee.firstName} ${employee.lastName} filed ${input.category} (${input.priority} priority).`,
    });

    // Default notifications
    await notifyHRAdmins({
      title: `New Helpdesk Ticket (${ticketNumber})`,
      message: `${employee.firstName} ${employee.lastName} raised ticket for ${input.targetDepartment}: "${input.subject}".`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/helpdesk",
    });

    revalidatePath("/hrms/helpdesk");
    revalidatePath("/hrms");

    return { success: true, data: { ticketId: ticket.id, ticketNumber } };
  } catch (error) {
    console.error("Error creating helpdesk ticket:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create helpdesk ticket.",
    };
  }
}

/**
 * Fetches personal tickets filed by the logged-in employee
 */
export async function getMyHelpdeskTicketsAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const tickets = await db.hrmsHelpdesk.findMany({
      where: { employeeId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: {
          select: { firstName: true, lastName: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { firstName: true, lastName: true, employeeId: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        targetDepartment: t.targetDepartment,
        category: t.category,
        priority: t.priority,
        subject: t.subject,
        description: t.description,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        status: t.status,
        assignedToName: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null,
        createdAt: t.createdAt.toISOString(),
        comments: t.comments.map((c) => ({
          id: c.id,
          authorName: `${c.author.firstName} ${c.author.lastName}`,
          message: c.message,
          createdAt: c.createdAt.toISOString(),
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching my helpdesk tickets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load tickets.",
    };
  }
}

/**
 * Fetches all tickets for Helpdesk resolution desk
 */
export async function getAllHelpdeskTicketsAction(params: {
  status?: string;
  department?: string;
} = {}): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");

    const where: any = {};
    if (params.status && params.status !== "ALL") {
      where.status = params.status as HelpdeskStatus;
    }
    if (params.department && params.department !== "ALL") {
      where.targetDepartment = params.department;
    }

    const tickets = await db.hrmsHelpdesk.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true },
        },
        assignedTo: {
          select: { firstName: true, lastName: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        employeeName: `${t.employee.firstName} ${t.employee.lastName}`,
        employeeId: t.employee.employeeId,
        department: t.employee.department,
        targetDepartment: t.targetDepartment,
        category: t.category,
        priority: t.priority,
        subject: t.subject,
        description: t.description,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        status: t.status,
        assignedToName: t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : null,
        createdAt: t.createdAt.toISOString(),
        commentsCount: t.comments.length,
      })),
    };
  } catch (error) {
    console.error("Error fetching all helpdesk tickets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load helpdesk tickets.",
    };
  }
}

/**
 * Adds a comment to a ticket thread
 */
export async function addHelpdeskCommentAction(input: {
  ticketId: string;
  message: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const ticket = await db.hrmsHelpdesk.findUnique({
      where: { id: input.ticketId },
      include: { employee: true },
    });

    if (!ticket) return { success: false, error: "Ticket not found." };

    await db.helpdeskComment.create({
      data: {
        ticketId: input.ticketId,
        authorId: user.id,
        message: input.message.trim(),
      },
    });

    // Notify the other party
    const recipientId = ticket.employeeId === user.id ? ticket.assignedToId : ticket.employeeId;
    if (recipientId) {
      await createNotification({
        recipientUserId: recipientId,
        title: `New Comment on ${ticket.ticketNumber}`,
        message: `A new reply was posted on ticket "${ticket.subject}".`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/helpdesk",
      });
    }

    revalidatePath("/hrms/helpdesk");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post comment.",
    };
  }
}

/**
 * Updates status of a helpdesk ticket
 */
export async function updateHelpdeskStatusAction(input: {
  ticketId: string;
  status: HelpdeskStatus;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const ticket = await db.hrmsHelpdesk.update({
      where: { id: input.ticketId },
      data: { status: input.status },
      include: { employee: true },
    });

    await createNotification({
      recipientUserId: ticket.employeeId,
      recipientEmail: ticket.employee.workEmail,
      title: `Ticket Status Updated: ${ticket.ticketNumber}`,
      message: `Your ticket "${ticket.subject}" has been marked ${input.status}.`,
      type: input.status === HelpdeskStatus.RESOLVED || input.status === HelpdeskStatus.CLOSED ? NotificationType.SUCCESS : NotificationType.INFO,
      actionUrl: "/hrms/helpdesk",
    });

    revalidatePath("/hrms/helpdesk");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ticket status.",
    };
  }
}
