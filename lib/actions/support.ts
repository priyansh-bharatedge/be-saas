"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  ticketCreateSchema,
  ticketStatusUpdateSchema,
  qualityAuditSchema,
  TicketCreateData,
  TicketStatusUpdateData,
  QualityAuditData,
} from "@/lib/validations/support";
import { TicketPriority, TicketStatus, NotificationType } from "@prisma/client";
import { createNotification } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetTicketsParams {
  search?: string;
  status?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieves support tickets scoped strictly to the employee's RBAC role and department
 */
export async function getTicketsAction(params: GetTicketsParams = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const scope = await getScopeFilter(user, "support");

    const {
      search = "",
      status = "ALL",
      priority = "ALL",
      page = 1,
      pageSize = 10,
    } = params;

    const whereClause: Record<string, unknown> = {};

    // Enforce strict enterprise RBAC scoping
    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      whereClause.assignedEmployeeId = { in: scope.allowedEmployeeIds };
    }

    if (search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { ticketNumber: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status && status !== "ALL" && Object.values(TicketStatus).includes(status as TicketStatus)) {
      whereClause.status = status as TicketStatus;
    }

    if (priority && priority !== "ALL" && Object.values(TicketPriority).includes(priority as TicketPriority)) {
      whereClause.priority = priority as TicketPriority;
    }

    const [total, rawTickets] = await Promise.all([
      db.ticket.count({ where: whereClause }),
      db.ticket.findMany({
        where: whereClause,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedEmployee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              workEmail: true,
              department: true,
              designation: true,
            },
          },
          auditLogs: {
            orderBy: [{ createdAt: "desc" }],
            take: 3,
            include: {
              auditor: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const tickets = rawTickets.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
      auditLogs: t.auditLogs.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    }));

    return {
      success: true,
      data: {
        tickets,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        userScope: {
          canManageAll: scope.canManageAll,
          isQualityDept: scope.department.toLowerCase().includes("quality") || scope.isSuperAdmin,
        },
      },
    };
  } catch (error) {
    console.error("Error retrieving tickets:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load tickets.",
    };
  }
}

/**
 * Creates a new support ticket
 */
export async function createTicketAction(formData: TicketCreateData): Promise<ActionResult<{ id: string; ticketNumber: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const parseResult = ticketCreateSchema.safeParse(formData);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const data = parseResult.data;

    // Generate unique ticket number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `TK-${timestamp}-${random}`;

    // Auto-assign to creating user if not specified
    const assignedEmployeeId = data.assignedEmployeeId || user.id;

    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        source: data.source || "PORTAL",
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone || null,
        assignedEmployeeId,
      },
    });

    revalidatePath("/support/tickets");
    revalidatePath("/support");

    return {
      success: true,
      data: { id: ticket.id, ticketNumber: ticket.ticketNumber },
    };
  } catch (error) {
    console.error("Error creating ticket:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket.",
    };
  }
}

/**
 * Updates a ticket's status and records resolution timestamp if resolved
 */
export async function updateTicketStatusAction(data: TicketStatusUpdateData): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const parseResult = ticketStatusUpdateSchema.safeParse(data);
    if (!parseResult.success) {
      return { success: false, error: "Invalid status update payload." };
    }

    const { ticketId, status } = parseResult.data;

    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, assignedEmployeeId: true, ticketNumber: true },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found." };
    }

    const isResolved = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;

    await db.ticket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: isResolved ? new Date() : null,
      },
    });

    revalidatePath("/support/tickets");
    revalidatePath("/support");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update ticket status.",
    };
  }
}

/**
 * Assigns a ticket to a staff member
 */
export async function assignTicketAction(ticketId: string, employeeId: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const scope = await getScopeFilter(user, "support");
    if (!scope.canManageAll && !scope.isHod && !scope.isTl) {
      return { success: false, error: "Access Denied: Only Managers, Quality Auditors, or Admins can reassign tickets." };
    }

    await db.ticket.update({
      where: { id: ticketId },
      data: { assignedEmployeeId: employeeId },
    });

    revalidatePath("/support/tickets");
    revalidatePath("/support");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign ticket.",
    };
  }
}

/**
 * Quality Department: Logs an inspection / audit report on a ticket
 */
export async function createQualityAuditAction(formData: QualityAuditData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const scope = await getScopeFilter(user, "support");
    const isQuality = scope.department.toLowerCase().includes("quality") || scope.isSuperAdmin;

    if (!isQuality) {
      return {
        success: false,
        error: "Access Denied: Quality Audit logs can only be created by the Quality Department or Super Admin.",
      };
    }

    const parseResult = qualityAuditSchema.safeParse(formData);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const data = parseResult.data;

    const ticket = await db.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        assignedEmployee: {
          select: { id: true, firstName: true, lastName: true, teamLeaderId: true, department: true },
        },
      },
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found." };
    }

    const audit = await db.auditLog.create({
      data: {
        ticketId: data.ticketId,
        auditorId: user.id,
        qualityScore: data.qualityScore,
        complianceStatus: data.complianceStatus,
        feedbackComments: data.feedbackComments,
        escalatedToHOD: data.escalatedToHOD,
      },
    });

    // If escalated to HOD, create a critical notification
    if (data.escalatedToHOD && ticket.assignedEmployee) {
      // Find HOD for the employee's department
      const hod = await db.employee.findFirst({
        where: {
          department: ticket.assignedEmployee.department,
          systemRole: "ADMIN_HOD",
        },
        select: { id: true },
      });

      if (hod) {
        await createNotification({
          recipientUserId: hod.id,
          title: `Quality Audit Escalation: Ticket ${ticket.ticketNumber}`,
          message: `Quality audit flagged ticket ${ticket.ticketNumber} (Assigned: ${ticket.assignedEmployee.firstName} ${ticket.assignedEmployee.lastName}) with score ${data.qualityScore}/100: "${data.feedbackComments}".`,
          type: NotificationType.WARNING,
          actionUrl: `/support/quality`,
        });
      }
    }

    revalidatePath("/support/quality");
    revalidatePath("/support/tickets");
    revalidatePath("/support");

    return { success: true, data: { id: audit.id } };
  } catch (error) {
    console.error("Error creating quality audit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record quality audit.",
    };
  }
}

/**
 * Quality Department: Retrieves audit overview and flagged tickets
 */
export async function getQualityAuditDashboardAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized. Please log in." };

    const [totalTickets, auditedTicketsCount, auditLogs, escalatedLogs] = await Promise.all([
      db.ticket.count(),
      db.auditLog.groupBy({
        by: ["ticketId"],
      }),
      db.auditLog.findMany({
        take: 20,
        orderBy: [{ createdAt: "desc" }],
        include: {
          ticket: {
            select: {
              ticketNumber: true,
              subject: true,
              status: true,
              priority: true,
              assignedEmployee: {
                select: { firstName: true, lastName: true, department: true },
              },
            },
          },
          auditor: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      db.auditLog.count({
        where: { escalatedToHOD: true },
      }),
    ]);

    // Calculate average score
    const allScores = await db.auditLog.findMany({ select: { qualityScore: true } });
    const avgScore = allScores.length > 0
      ? Math.round(allScores.reduce((acc, a) => acc + a.qualityScore, 0) / allScores.length)
      : 0;

    const formattedLogs = auditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        totalTickets,
        auditedCount: auditedTicketsCount.length,
        unauditedCount: Math.max(0, totalTickets - auditedTicketsCount.length),
        escalatedCount: escalatedLogs,
        averageScore: avgScore,
        recentAudits: formattedLogs,
      },
    };
  } catch (error) {
    console.error("Error loading quality audit dashboard:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load quality audit metrics.",
    };
  }
}
