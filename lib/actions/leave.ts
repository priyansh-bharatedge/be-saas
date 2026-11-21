"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { LeaveType, ApprovalStatus, Role, SystemRole, NotificationType } from "@prisma/client";
import { applyLeaveSchema, ApplyLeaveInput, ReviewLeaveInput } from "@/lib/validations/leave";
import { createNotification, notifyHRAdmins } from "@/lib/actions/notifications";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Normalizes date to UTC midnight
 */
function getNormalizedDate(dateStr: string | Date): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates calendar business/days between two dates (inclusive)
 */
function calculateDays(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Resolves the logged-in employee record
 */
async function resolveCurrentEmployee() {
  const user = await getCurrentUser();
  if (!user) return null;

  let employee = await db.employee.findUnique({
    where: { id: user.id },
    include: { teamLeader: true },
  });

  if (!employee && user.email) {
    employee = await db.employee.findUnique({
      where: { workEmail: user.email },
      include: { teamLeader: true },
    });
  }

  if (!employee) {
    employee = await db.employee.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { teamLeader: true },
    });
  }

  return employee;
}

/**
 * Fetches the logged-in employee's leave balances and personal requests
 */
export async function getMyLeaveDataAction(): Promise<
  ActionResult<{
    balances: {
      leaveType: LeaveType;
      allocatedDays: number;
      usedDays: number;
      remainingDays: number;
      year: number;
    }[];
    requests: {
      id: string;
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      totalDays: number;
      reason: string;
      tlStatus: ApprovalStatus;
      tlComments: string | null;
      tlReviewedAt: string | null;
      teamLeaderName: string | null;
      hrStatus: ApprovalStatus;
      hrComments: string | null;
      hrReviewedAt: string | null;
      hrAdminName: string | null;
      finalStatus: ApprovalStatus;
      createdAt: string;
    }[];
    employeeInfo: {
      id: string;
      name: string;
      employeeId: string;
      department: string;
      designation: string;
      teamLeaderName: string | null;
    };
  }>
> {
  try {
    const employee = await resolveCurrentEmployee();
    if (!employee) {
      return { success: false, error: "Employee record not found." };
    }

    const currentYear = new Date().getFullYear();

    // Ensure balances exist for current year, if not initialize them
    let rawBalances = await db.leaveBalance.findMany({
      where: { employeeId: employee.id, year: currentYear },
    });

    if (rawBalances.length === 0) {
      const defaultTypes = [
        { leaveType: LeaveType.CASUAL, allocatedDays: 12 },
        { leaveType: LeaveType.SICK, allocatedDays: 10 },
        { leaveType: LeaveType.EARNED, allocatedDays: 15 },
      ];

      for (const def of defaultTypes) {
        await db.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: def.leaveType,
            year: currentYear,
            allocatedDays: def.allocatedDays,
            usedDays: 0,
            remainingDays: def.allocatedDays,
          },
        });
      }

      rawBalances = await db.leaveBalance.findMany({
        where: { employeeId: employee.id, year: currentYear },
      });
    }

    const rawRequests = await db.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      include: {
        teamLeader: { select: { firstName: true, lastName: true } },
        hrAdmin: { select: { firstName: true, lastName: true } },
      },
    });

    const balances = rawBalances.map((b) => ({
      leaveType: b.leaveType,
      allocatedDays: b.allocatedDays,
      usedDays: b.usedDays,
      remainingDays: b.remainingDays,
      year: b.year,
    }));

    const requests = rawRequests.map((r) => ({
      id: r.id,
      leaveType: r.leaveType,
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      totalDays: r.totalDays,
      reason: r.reason,
      tlStatus: r.tlStatus,
      tlComments: r.tlComments,
      tlReviewedAt: r.tlReviewedAt ? r.tlReviewedAt.toISOString() : null,
      teamLeaderName: r.teamLeader ? `${r.teamLeader.firstName} ${r.teamLeader.lastName}` : null,
      hrStatus: r.hrStatus,
      hrComments: r.hrComments,
      hrReviewedAt: r.hrReviewedAt ? r.hrReviewedAt.toISOString() : null,
      hrAdminName: r.hrAdmin ? `${r.hrAdmin.firstName} ${r.hrAdmin.lastName}` : null,
      finalStatus: r.finalStatus,
      createdAt: r.createdAt.toISOString(),
    }));

    const teamLeaderName = employee.teamLeader
      ? `${employee.teamLeader.firstName} ${employee.teamLeader.lastName}`
      : null;

    return {
      success: true,
      data: {
        balances,
        requests,
        employeeInfo: {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.designation,
          teamLeaderName,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching leave data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load leave records.",
    };
  }
}

/**
 * Submits a new leave request with Zod validation & balance enforcement
 */
export async function applyLeaveRequestAction(
  formData: ApplyLeaveInput
): Promise<ActionResult<{ requestId: string }>> {
  try {
    const parseResult = applyLeaveSchema.safeParse(formData);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Validation error",
      };
    }

    const { leaveType, startDate: startStr, endDate: endStr, reason } = parseResult.data;

    const startDate = getNormalizedDate(startStr);
    const endDate = getNormalizedDate(endStr);

    if (endDate < startDate) {
      return { success: false, error: "End date cannot be prior to start date." };
    }

    const totalDays = calculateDays(startDate, endDate);
    if (totalDays <= 0) {
      return { success: false, error: "Leave duration must be at least 1 day." };
    }

    const employee = await resolveCurrentEmployee();
    if (!employee) {
      return { success: false, error: "Authenticated employee record not found." };
    }

    const currentYear = new Date().getFullYear();

    // Check balance for this category
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: employee.id,
          leaveType,
          year: currentYear,
        },
      },
    });

    if (!balance || balance.remainingDays < totalDays) {
      const remaining = balance ? balance.remainingDays : 0;
      return {
        success: false,
        error: `Insufficient leave balance! You requested ${totalDays} day(s), but only have ${remaining} day(s) remaining for ${leaveType} leave.`,
      };
    }

    // Determine assigned Team Leader
    const teamLeaderId = employee.teamLeaderId || null;

    // Determine HR Admin
    const hrAdmin = await db.employee.findFirst({
      where: { systemRole: SystemRole.HR_ADMIN },
      select: { id: true },
    });

    const request = await db.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate,
        endDate,
        totalDays,
        reason,
        teamLeaderId,
        hrAdminId: hrAdmin ? hrAdmin.id : null,
        tlStatus: teamLeaderId ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED, // If no TL assigned, auto-clears tier 1
        hrStatus: ApprovalStatus.PENDING,
        finalStatus: ApprovalStatus.PENDING,
      },
    });

    // Targeted Notification Triggers:
    // 1. Notify assigned Team Leader
    if (employee.teamLeaderId) {
      await createNotification({
        recipientUserId: employee.teamLeaderId,
        title: "Leave Application Awaiting Review",
        message: `${employee.firstName} ${employee.lastName} submitted a ${leaveType} leave request for ${totalDays} day(s). Action required.`,
        type: NotificationType.ACTION_REQUIRED,
        actionUrl: "/hrms/leave",
      });
    }

    // 2. Notify HR Admins
    await notifyHRAdmins({
      title: "New Leave Application",
      message: `${employee.firstName} ${employee.lastName} requested ${totalDays} day(s) of ${leaveType} leave (${startStr} to ${endStr}).`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/leave",
    });

    revalidatePath("/hrms/leave");
    revalidatePath("/hrms");

    return {
      success: true,
      data: { requestId: request.id },
    };
  } catch (error) {
    console.error("Error submitting leave request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit leave request.",
    };
  }
}

/**
 * Tier 1: Team Leader reviews employee leave request
 */
export async function reviewLeaveAsTLAction(
  input: ReviewLeaveInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await resolveCurrentEmployee();
    if (!employee) return { success: false, error: "Employee record not found." };

    const request = await db.leaveRequest.findUnique({
      where: { id: input.requestId },
      include: { employee: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };

    // RBAC: Must be the designated TL, Admin, or HR
    const isAuthorized =
      request.teamLeaderId === employee.id ||
      employee.systemRole === SystemRole.SUPER_ADMIN ||
      employee.systemRole === SystemRole.HR_ADMIN ||
      user.role === Role.Admin ||
      user.role === Role.HRMS;

    if (!isAuthorized) {
      return { success: false, error: "You are not authorized to review this request as Team Leader." };
    }

    const now = new Date();
    const finalStatus =
      input.status === ApprovalStatus.REJECTED ? ApprovalStatus.REJECTED : ApprovalStatus.PENDING;

    await db.leaveRequest.update({
      where: { id: input.requestId },
      data: {
        tlStatus: input.status,
        tlComments: input.comments?.trim() || null,
        tlReviewedAt: now,
        finalStatus,
      },
    });

    // Targeted Notification:
    if (input.status === ApprovalStatus.APPROVED) {
      // 1. Notify Employee of TL Approval
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Approved by Team Leader",
        message: `Your ${request.leaveType} leave request was approved by your Team Leader and forwarded to HR Admin for final approval.`,
        type: NotificationType.SUCCESS,
        actionUrl: "/hrms/leave",
      });

      // 2. Notify HR Admins of pending Tier-2 review
      await notifyHRAdmins({
        title: "Leave Ready for Final Sign-off",
        message: `${request.employee.firstName} ${request.employee.lastName}'s leave request was approved by TL and awaits your final sign-off.`,
        type: NotificationType.ACTION_REQUIRED,
        actionUrl: "/hrms/leave",
      });
    } else {
      // Notify Employee of Rejection
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Request Declined by Team Leader",
        message: `Your ${request.leaveType} leave request was not approved by your Team Leader.${input.comments ? ` Remarks: "${input.comments}"` : ""}`,
        type: NotificationType.WARNING,
        actionUrl: "/hrms/leave",
      });
    }

    revalidatePath("/hrms/leave");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error in TL review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record TL review.",
    };
  }
}

/**
 * Tier 2: HR Admin reviews employee leave request & deducts balance on approval
 */
export async function reviewLeaveAsHRAction(
  input: ReviewLeaveInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    if (user.role !== Role.Admin && user.role !== Role.HRMS) {
      return { success: false, error: "Access Denied: Only HR Admins can perform final leave approval." };
    }

    const employee = await resolveCurrentEmployee();
    const request = await db.leaveRequest.findUnique({
      where: { id: input.requestId },
      include: { employee: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };

    const now = new Date();
    const isApproved = input.status === ApprovalStatus.APPROVED;
    const finalStatus = isApproved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

    await db.$transaction(async (tx) => {
      // 1. Update request status
      await tx.leaveRequest.update({
        where: { id: input.requestId },
        data: {
          hrStatus: input.status,
          hrComments: input.comments?.trim() || null,
          hrReviewedAt: now,
          hrAdminId: employee ? employee.id : request.hrAdminId,
          finalStatus,
        },
      });

      // 2. If approved, deduct days from Employee LeaveBalance!
      if (isApproved) {
        const year = request.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: request.employeeId,
              leaveType: request.leaveType,
              year,
            },
          },
        });

        if (balance) {
          const newUsed = balance.usedDays + request.totalDays;
          const newRemaining = Math.max(0, balance.allocatedDays - newUsed);

          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsed,
              remainingDays: newRemaining,
            },
          });
        }
      }
    });

    // Targeted Notification to Employee regarding Final HR Outcome:
    if (isApproved) {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Application Fully Approved",
        message: `Your ${request.leaveType} leave for ${request.totalDays} day(s) was approved by HR Admin. Quota has been deducted.`,
        type: NotificationType.SUCCESS,
        actionUrl: "/hrms/leave",
      });
    } else {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Application Declined by HR",
        message: `Your ${request.leaveType} leave application was declined during final HR review.${input.comments ? ` Remarks: "${input.comments}"` : ""}`,
        type: NotificationType.WARNING,
        actionUrl: "/hrms/leave",
      });
    }

    revalidatePath("/hrms/leave");
    revalidatePath("/hrms");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error in HR review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record HR final approval.",
    };
  }
}

/**
 * Fetches pending approval queue for TLs and HR Admins
 */
export async function getApprovalsQueueAction(): Promise<
  ActionResult<{
    tlQueue: any[];
    hrQueue: any[];
    isHR: boolean;
    isTL: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    const employee = await resolveCurrentEmployee();
    const isHR = scope.isHrAdmin || scope.canManageAll;
    const isTL = scope.isTl || scope.isHod || isHR;

    let tlQueue: any[] = [];
    let hrQueue: any[] = [];

    // TL Queue: Requests where tlStatus == PENDING and teamLeaderId == employee.id (or team members if HOD/TL, or all if admin)
    if (isTL && employee) {
      const tlWhere: any = {
        tlStatus: ApprovalStatus.PENDING,
        finalStatus: ApprovalStatus.PENDING,
      };

      if (!isHR) {
        tlWhere.OR = [
          { teamLeaderId: employee.id },
          { employeeId: { in: scope.subordinateIds } },
          ...(scope.isHod ? [{ employee: { department: scope.department } }] : []),
        ];
      }

      const rawTL = await db.leaveRequest.findMany({
        where: tlWhere,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
        },
      });

      tlQueue = rawTL.map((r) => ({
        id: r.id,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeId: r.employee.employeeId,
        department: r.employee.department,
        designation: r.employee.designation,
        leaveType: r.leaveType,
        startDate: r.startDate.toISOString().split("T")[0],
        endDate: r.endDate.toISOString().split("T")[0],
        totalDays: r.totalDays,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    // HR Queue: Requests where tlStatus == APPROVED and hrStatus == PENDING
    if (isHR) {
      const rawHR = await db.leaveRequest.findMany({
        where: {
          tlStatus: ApprovalStatus.APPROVED,
          hrStatus: ApprovalStatus.PENDING,
          finalStatus: ApprovalStatus.PENDING,
        },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
          teamLeader: { select: { firstName: true, lastName: true } },
        },
      });

      hrQueue = rawHR.map((r) => ({
        id: r.id,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeId: r.employee.employeeId,
        department: r.employee.department,
        designation: r.employee.designation,
        leaveType: r.leaveType,
        startDate: r.startDate.toISOString().split("T")[0],
        endDate: r.endDate.toISOString().split("T")[0],
        totalDays: r.totalDays,
        reason: r.reason,
        tlComments: r.tlComments,
        teamLeaderName: r.teamLeader ? `${r.teamLeader.firstName} ${r.teamLeader.lastName}` : "Self/Direct",
        createdAt: r.createdAt.toISOString(),
      }));
    }

    return {
      success: true,
      data: {
        tlQueue,
        hrQueue,
        isHR,
        isTL,
      },
    };
  } catch (error) {
    console.error("Error fetching approval queue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load approval queue.",
    };
  }
}

/**
 * HR Admin: View all company leave requests with filters
 */
export async function getAllLeaveRequestsAction(params: {
  department?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<
  ActionResult<{
    requests: any[];
    total: number;
    totalPages: number;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized access to company leave logs." };
    }

    const scope = await getScopeFilter(user, "hrms");

    const { department = "ALL", status = "ALL", search = "", page = 1, pageSize = 10 } = params;

    const where: any = {};

    // Enforce Hierarchy Scoping
    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      where.employeeId = { in: scope.allowedEmployeeIds };
    }

    if (status && status !== "ALL") {
      where.finalStatus = status as ApprovalStatus;
    }

    const employeeWhere: any = {};
    if (department && department !== "ALL") {
      employeeWhere.department = department;
    }

    if (search.trim()) {
      const q = search.trim();
      employeeWhere.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
      ];
    }

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = employeeWhere;
    }

    const [total, rawRequests] = await Promise.all([
      db.leaveRequest.count({ where }),
      db.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          employee: {
            select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
          },
          teamLeader: { select: { firstName: true, lastName: true } },
          hrAdmin: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const requests = rawRequests.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      department: r.employee.department,
      designation: r.employee.designation,
      leaveType: r.leaveType,
      startDate: r.startDate.toISOString().split("T")[0],
      endDate: r.endDate.toISOString().split("T")[0],
      totalDays: r.totalDays,
      reason: r.reason,
      tlStatus: r.tlStatus,
      teamLeaderName: r.teamLeader ? `${r.teamLeader.firstName} ${r.teamLeader.lastName}` : null,
      hrStatus: r.hrStatus,
      hrAdminName: r.hrAdmin ? `${r.hrAdmin.firstName} ${r.hrAdmin.lastName}` : null,
      finalStatus: r.finalStatus,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        requests,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  } catch (error) {
    console.error("Error fetching all leave requests:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load leave logs.",
    };
  }
}

/**
 * HR Admin: Adjusts employee leave balance
 */
export async function adjustLeaveBalanceAction(input: {
  employeeId: string;
  leaveType: LeaveType;
  year?: number;
  allocatedDays: number;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.Admin && user.role !== Role.HRMS)) {
      return { success: false, error: "Unauthorized." };
    }

    const year = input.year || new Date().getFullYear();

    const existing = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: input.employeeId,
          leaveType: input.leaveType,
          year,
        },
      },
    });

    const used = existing ? existing.usedDays : 0;
    const remaining = Math.max(0, input.allocatedDays - used);

    await db.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId: input.employeeId,
          leaveType: input.leaveType,
          year,
        },
      },
      update: {
        allocatedDays: input.allocatedDays,
        remainingDays: remaining,
      },
      create: {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        year,
        allocatedDays: input.allocatedDays,
        usedDays: 0,
        remainingDays: input.allocatedDays,
      },
    });

    revalidatePath("/hrms/leave");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error adjusting leave balance:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update leave balance.",
    };
  }
}

/**
 * Employee edits their own PENDING leave request
 */
export async function updateMyLeaveRequestAction(input: {
  requestId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await resolveCurrentEmployee();
    if (!employee) return { success: false, error: "Employee record not found." };

    const request = await db.leaveRequest.findUnique({
      where: { id: input.requestId },
      include: { employee: true, teamLeader: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };

    // RBAC: Only owner can edit, and only while PENDING
    if (request.employeeId !== employee.id) {
      return { success: false, error: "You can only edit your own leave requests." };
    }

    if (request.finalStatus !== ApprovalStatus.PENDING || request.tlStatus !== ApprovalStatus.PENDING) {
      return { success: false, error: "Cannot edit this request once review has commenced or completed." };
    }

    const startDate = getNormalizedDate(input.startDate);
    const endDate = getNormalizedDate(input.endDate);

    if (endDate < startDate) {
      return { success: false, error: "End date cannot be prior to start date." };
    }

    const totalDays = calculateDays(startDate, endDate);
    const currentYear = startDate.getFullYear();

    // Check balance
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: employee.id,
          leaveType: input.leaveType,
          year: currentYear,
        },
      },
    });

    if (!balance || balance.remainingDays < totalDays) {
      const remaining = balance ? balance.remainingDays : 0;
      return {
        success: false,
        error: `Insufficient balance! You requested ${totalDays} day(s), but only have ${remaining} day(s) remaining for ${input.leaveType} leave.`,
      };
    }

    await db.leaveRequest.update({
      where: { id: input.requestId },
      data: {
        leaveType: input.leaveType,
        startDate,
        endDate,
        totalDays,
        reason: input.reason.trim(),
      },
    });

    // Notify TL of updated submission
    if (request.teamLeaderId) {
      await createNotification({
        recipientUserId: request.teamLeaderId,
        title: "Leave Request Modified",
        message: `${employee.firstName} ${employee.lastName} updated their pending ${input.leaveType} leave application (${totalDays} days).`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/leave",
      });
    }

    revalidatePath("/hrms/leave");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating leave request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update leave request.",
    };
  }
}

/**
 * Employee cancels or deletes their own PENDING leave request
 */
export async function cancelMyLeaveRequestAction(
  requestId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await resolveCurrentEmployee();
    const isHR = user.role === Role.Admin || user.role === Role.HRMS;

    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { teamLeader: true, employee: true },
    });

    if (!request) return { success: false, error: "Leave request not found." };

    // Owner or HR Admin can cancel pending request
    if (!isHR && request.employeeId !== employee?.id) {
      return { success: false, error: "You can only cancel your own leave requests." };
    }

    if (request.finalStatus !== ApprovalStatus.PENDING) {
      return { success: false, error: "Cannot cancel a request that has already been finalized." };
    }

    await db.leaveRequest.delete({
      where: { id: requestId },
    });

    // Notify Team Leader
    if (request.teamLeaderId) {
      await createNotification({
        recipientUserId: request.teamLeaderId,
        title: "Leave Request Cancelled",
        message: `${request.employee.firstName} ${request.employee.lastName} cancelled their pending ${request.leaveType} leave application.`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/leave",
      });
    }

    revalidatePath("/hrms/leave");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error cancelling leave request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel leave request.",
    };
  }
}
