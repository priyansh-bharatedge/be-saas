"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  LeaveType,
  ApprovalStatus,
  Role,
  SystemRole,
  NotificationType,
  HrmsWorkflowModule,
  WorkflowTriggerAction,
} from "@prisma/client";
import {
  applyLeaveSchema,
  ApplyLeaveInput,
  ReviewLeaveInput,
  adjustLeaveBalanceSchema,
  AdjustLeaveBalanceInput,
} from "@/lib/validations/leave";
import { createNotification, notifyHRAdmins } from "@/lib/actions/notifications";
import { evaluateHrmsWorkflow } from "@/lib/hrms/workflow-engine";

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
 * Fetches the logged-in employee's leave balances and personal requests.
 * Strictly 2 Categories: Paid Leave (12 annual quota, 1 day/mo accrual) and Short Leave (max 2/mo, max 3.0h/mo, max 1.5h/req).
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
    paidLeaveAccrual: {
      totalQuota: number;
      accruedDays: number;
      usedDays: number;
      remainingDays: number;
    };
    shortLeaveMonthly: {
      maxMonthlyCount: number;
      usedCount: number;
      remainingCount: number;
      maxMonthlyHours: number;
      usedHours: number;
      remainingHours: number;
    };
    requests: {
      id: string;
      leaveType: LeaveType;
      startDate: string;
      endDate: string;
      totalDays: number;
      startTime: string | null;
      endTime: string | null;
      durationHours: number | null;
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
    const now = new Date();

    // Ensure strictly PAID_LEAVE and SHORT_LEAVE exist for current year
    let rawBalances = await db.leaveBalance.findMany({
      where: { employeeId: employee.id, year: currentYear },
    });

    const hasPaid = rawBalances.some((b) => b.leaveType === LeaveType.PAID_LEAVE);
    const hasShort = rawBalances.some((b) => b.leaveType === LeaveType.SHORT_LEAVE);

    if (!hasPaid) {
      await db.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveType: LeaveType.PAID_LEAVE,
          year: currentYear,
          allocatedDays: 12,
          usedDays: 0,
          remainingDays: 12,
          accruedDays: Math.min(12, now.getMonth() + 1),
        },
      });
    }

    if (!hasShort) {
      await db.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveType: LeaveType.SHORT_LEAVE,
          year: currentYear,
          allocatedDays: 0,
          usedDays: 0,
          remainingDays: 0,
        },
      });
    }

    rawBalances = await db.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        year: currentYear,
        leaveType: { in: [LeaveType.PAID_LEAVE, LeaveType.SHORT_LEAVE] },
      },
    });

    // Fetch personal requests
    const rawRequests = await db.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      include: {
        teamLeader: { select: { firstName: true, lastName: true } },
        hrAdmin: { select: { firstName: true, lastName: true } },
      },
    });

    // Dynamic Short Leave calculation for current calendar month
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

    const currentMonthShortLeaves = await db.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        leaveType: LeaveType.SHORT_LEAVE,
        startDate: { gte: startOfMonth, lte: endOfMonth },
        finalStatus: { not: ApprovalStatus.REJECTED },
      },
    });

    const usedShortCount = currentMonthShortLeaves.length;
    const usedShortHours = parseFloat(
      currentMonthShortLeaves.reduce((sum, r) => sum + (r.durationHours || 0), 0).toFixed(1)
    );
    const remainingShortCount = Math.max(0, 2 - usedShortCount);
    const remainingShortHours = Math.max(0, parseFloat((3.0 - usedShortHours).toFixed(1)));

    // Paid Leave dynamic monthly accrual: 1 day per month up to 12
    const accruedPaidDays = Math.min(12, Math.max(1, now.getMonth() + 1));
    const paidRecord = rawBalances.find((b) => b.leaveType === LeaveType.PAID_LEAVE);
    const paidUsed = paidRecord ? paidRecord.usedDays : 0;
    const paidAllocated = paidRecord ? paidRecord.allocatedDays : 12;
    const paidRemaining = paidRecord ? paidRecord.remainingDays : 12;

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
      startTime: r.startTime,
      endTime: r.endTime,
      durationHours: r.durationHours,
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
        paidLeaveAccrual: {
          totalQuota: paidAllocated,
          accruedDays: accruedPaidDays,
          usedDays: paidUsed,
          remainingDays: paidRemaining,
        },
        shortLeaveMonthly: {
          maxMonthlyCount: 2,
          usedCount: usedShortCount,
          remainingCount: remainingShortCount,
          maxMonthlyHours: 3.0,
          usedHours: usedShortHours,
          remainingHours: remainingShortHours,
        },
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
 * Submits a new leave request (PAID_LEAVE or SHORT_LEAVE) with Zod validation & balance enforcement
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

    const {
      leaveType,
      startDate: startStr,
      endDate: endStr,
      startTime,
      endTime,
      reason,
    } = parseResult.data;

    const employee = await resolveCurrentEmployee();
    if (!employee) {
      return { success: false, error: "Authenticated employee record not found." };
    }

    const currentYear = new Date().getFullYear();
    const startDate = getNormalizedDate(startStr);
    const endDate = getNormalizedDate(endStr);

    let durationHours: number | null = null;
    let totalDays = 0;

    if (leaveType === "SHORT_LEAVE") {
      if (!startTime || !endTime) {
        return { success: false, error: "Start time and end time are required for Short Leave." };
      }

      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

      if (durationMinutes <= 0) {
        return { success: false, error: "End time must be after start time." };
      }

      durationHours = parseFloat((durationMinutes / 60).toFixed(2));

      // Rule 1: Max 1.5 hours per single request
      if (durationHours > 1.5) {
        return {
          success: false,
          error: `Single Short Leave request cannot exceed 1.5 hours (requested ${durationHours} hrs).`,
        };
      }

      // Rule 2 & 3: Monthly quotas (max 2 leaves, max 3.0 hours)
      const now = new Date(startDate);
      const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

      const monthlyRequests = await db.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          leaveType: LeaveType.SHORT_LEAVE,
          startDate: { gte: startOfMonth, lte: endOfMonth },
          finalStatus: { not: ApprovalStatus.REJECTED },
        },
      });

      if (monthlyRequests.length >= 2) {
        return {
          success: false,
          error: "You have already reached the limit of 2 Short Leaves for this calendar month.",
        };
      }

      const currentMonthlyHours = monthlyRequests.reduce(
        (sum, r) => sum + (r.durationHours || 0),
        0
      );

      if (currentMonthlyHours + durationHours > 3.0) {
        const remaining = Math.max(0, 3.0 - currentMonthlyHours);
        return {
          success: false,
          error: `Requesting ${durationHours} hrs would exceed your monthly Short Leave limit of 3.0 hrs (remaining: ${remaining.toFixed(1)} hrs).`,
        };
      }

      totalDays = 0; // Short leave tracked by durationHours
    } else {
      // Paid Leave
      totalDays = calculateDays(startDate, endDate);
      if (totalDays <= 0) {
        return { success: false, error: "Leave duration must be at least 1 day." };
      }

      let balance = await db.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: employee.id,
            leaveType: LeaveType.PAID_LEAVE,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        balance = await db.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: LeaveType.PAID_LEAVE,
            year: currentYear,
            allocatedDays: 12,
            usedDays: 0,
            remainingDays: 12,
          },
        });
      }

      if (balance.remainingDays < totalDays) {
        return {
          success: false,
          error: `Insufficient balance! You requested ${totalDays} day(s), but only have ${balance.remainingDays} day(s) remaining for Paid Leave.`,
        };
      }
    }

    const teamLeaderId = employee.teamLeaderId || null;
    const hrAdmin = await db.employee.findFirst({
      where: {
        OR: [
          { systemRole: SystemRole.HR_ADMIN },
          { systemRole: SystemRole.SUPER_ADMIN },
        ],
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const request = await db.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: leaveType as LeaveType,
        startDate,
        endDate,
        totalDays,
        startTime: startTime || null,
        endTime: endTime || null,
        durationHours,
        reason: reason.trim(),
        teamLeaderId,
        hrAdminId: hrAdmin ? hrAdmin.id : null,
        tlStatus: teamLeaderId ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED,
        hrStatus: ApprovalStatus.PENDING,
        finalStatus: ApprovalStatus.PENDING,
      },
    });

    // Evaluate Dynamic HRMS Workflow Engine
    const workflowResult = await evaluateHrmsWorkflow({
      module: HrmsWorkflowModule.LEAVE,
      triggerAction: WorkflowTriggerAction.ON_CREATE,
      recordId: request.id,
      employeeId: employee.id,
      department: employee.department,
      title: `${leaveType === "SHORT_LEAVE" ? "Short Leave" : "Paid Leave"}: ${employee.firstName} ${employee.lastName}`,
      details:
        leaveType === "SHORT_LEAVE"
          ? `${durationHours} hrs on ${startStr} (${startTime} - ${endTime}). Reason: ${reason}`
          : `${totalDays} day(s) from ${startStr} to ${endStr}. Reason: ${reason}`,
    });

    // Default notifications if no matching custom workflow was configured
    if (!workflowResult.hasCustomWorkflow) {
      if (employee.teamLeaderId) {
        await createNotification({
          recipientUserId: employee.teamLeaderId,
          title: "Leave Application Awaiting Review",
          message: `${employee.firstName} ${employee.lastName} submitted a ${leaveType.replace("_", " ")} request (${totalDays > 0 ? `${totalDays} days` : `${durationHours} hrs`}). Action required.`,
          type: NotificationType.ACTION_REQUIRED,
          actionUrl: "/hrms/leave",
        });
      }

      await notifyHRAdmins({
        title: "New Leave Application",
        message: `${employee.firstName} ${employee.lastName} requested ${leaveType.replace("_", " ")} (${startStr}).`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/leave",
      });
    }

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

    if (input.status === ApprovalStatus.APPROVED) {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Approved by Team Leader",
        message: `Your ${request.leaveType.replace("_", " ")} request was approved by your Team Leader and forwarded to HR Admin for final sign-off.`,
        type: NotificationType.SUCCESS,
        actionUrl: "/hrms/leave",
      });

      await notifyHRAdmins({
        title: "Leave Ready for Final Sign-off",
        message: `${request.employee.firstName} ${request.employee.lastName}'s leave request was approved by TL and awaits your final sign-off.`,
        type: NotificationType.ACTION_REQUIRED,
        actionUrl: "/hrms/leave",
      });
    } else {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Request Declined by Team Leader",
        message: `Your ${request.leaveType.replace("_", " ")} request was declined by your Team Leader.${input.comments ? ` Remarks: "${input.comments}"` : ""}`,
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
 * Tier 2: HR Admin reviews employee leave request & automatically deducts balance on approval
 * (or restores balance if a previously approved leave is cancelled/rejected).
 */
export async function reviewLeaveAsHRAction(
  input: ReviewLeaveInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
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

      // 2. Automatically deduct balance upon approval for PAID_LEAVE
      if (isApproved && request.leaveType === LeaveType.PAID_LEAVE && request.totalDays > 0) {
        const year = request.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: request.employeeId,
              leaveType: LeaveType.PAID_LEAVE,
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
      } else if (
        !isApproved &&
        request.finalStatus === ApprovalStatus.APPROVED &&
        request.leaveType === LeaveType.PAID_LEAVE &&
        request.totalDays > 0
      ) {
        // Automatically restore balance if a previously approved leave is rejected/cancelled
        const year = request.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: request.employeeId,
              leaveType: LeaveType.PAID_LEAVE,
              year,
            },
          },
        });

        if (balance) {
          const newUsed = Math.max(0, balance.usedDays - request.totalDays);
          const newRemaining = Math.min(balance.allocatedDays, balance.remainingDays + request.totalDays);

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

    if (isApproved) {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Application Fully Approved",
        message: `Your ${request.leaveType.replace("_", " ")} request was approved by HR Admin.`,
        type: NotificationType.SUCCESS,
        actionUrl: "/hrms/leave",
      });
    } else {
      await createNotification({
        recipientUserId: request.employeeId,
        recipientEmail: request.employee.workEmail,
        title: "Leave Application Declined by HR",
        message: `Your ${request.leaveType.replace("_", " ")} application was declined by HR.${input.comments ? ` Remarks: "${input.comments}"` : ""}`,
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
 * HR Admin: Dedicated Leave Balance Adjustment Control (with mandatory audit reason)
 */
export async function adjustEmployeeLeaveBalanceAction(
  input: AdjustLeaveBalanceInput
): Promise<ActionResult<{ success: boolean; logId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return {
        success: false,
        error: "Access Denied: Only HR Admin or Super Admin can adjust leave balances.",
      };
    }

    const parseResult = adjustLeaveBalanceSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Validation error",
      };
    }

    const {
      employeeId,
      leaveType,
      newAllocatedDays,
      newRemainingDays,
      newMonthlyShortLeaves,
      newMonthlyShortHours,
      reason,
    } = parseResult.data;

    const currentYear = new Date().getFullYear();

    const targetEmployee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, workEmail: true },
    });

    if (!targetEmployee) {
      return { success: false, error: "Target employee record not found." };
    }

    const result = await db.$transaction(async (tx) => {
      let balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId,
            leaveType: leaveType as LeaveType,
            year: currentYear,
          },
        },
      });

      if (!balance) {
        balance = await tx.leaveBalance.create({
          data: {
            employeeId,
            leaveType: leaveType as LeaveType,
            year: currentYear,
            allocatedDays: leaveType === "PAID_LEAVE" ? 12 : 0,
            usedDays: 0,
            remainingDays: leaveType === "PAID_LEAVE" ? 12 : 0,
          },
        });
      }

      const prevBal =
        leaveType === "PAID_LEAVE" ? balance.remainingDays : balance.monthlyShortHours;
      let newBal = prevBal;
      let diff = 0;

      if (leaveType === "PAID_LEAVE") {
        const allocated =
          newAllocatedDays !== undefined ? newAllocatedDays : balance.allocatedDays;
        const remaining =
          newRemainingDays !== undefined ? newRemainingDays : balance.remainingDays;
        const used = Math.max(0, allocated - remaining);
        newBal = remaining;
        diff = newBal - prevBal;

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            allocatedDays: allocated,
            remainingDays: remaining,
            usedDays: used,
            lastAdjustedAt: new Date(),
            lastAdjustedById: user.id,
            lastAdjustmentReason: reason,
          },
        });
      } else {
        const hours =
          newMonthlyShortHours !== undefined ? newMonthlyShortHours : balance.monthlyShortHours;
        const leaves =
          newMonthlyShortLeaves !== undefined ? newMonthlyShortLeaves : balance.monthlyShortLeaves;
        newBal = hours;
        diff = newBal - prevBal;

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            monthlyShortHours: hours,
            monthlyShortLeaves: leaves,
            lastAdjustedAt: new Date(),
            lastAdjustedById: user.id,
            lastAdjustmentReason: reason,
          },
        });
      }

      // Record Audit Log
      const log = await tx.leaveAdjustmentLog.create({
        data: {
          employeeId,
          leaveType: leaveType as LeaveType,
          previousBalance: prevBal,
          newBalance: newBal,
          adjustmentAmount: diff,
          unit: leaveType === "PAID_LEAVE" ? "DAYS" : "HOURS",
          reason,
          adjustedById: user.id,
        },
      });

      return log;
    });

    // Notify employee of administrative balance adjustment
    await createNotification({
      recipientUserId: employeeId,
      recipientEmail: targetEmployee.workEmail,
      title: "Leave Balance Adjusted by HR Admin",
      message: `Your ${leaveType.replace("_", " ")} balance was adjusted by HR Admin. Reason: "${reason}"`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/leave",
    });

    revalidatePath("/hrms/leave");
    revalidatePath("/hrms/directory");
    revalidatePath("/hrms");

    return { success: true, data: { success: true, logId: result.id } };
  } catch (error) {
    console.error("Error in adjustEmployeeLeaveBalanceAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to adjust leave balance.",
    };
  }
}

/**
 * Fetches an employee's leave balances & adjustment history for HR Admin (used in Directory & Edit modal)
 */
export async function getEmployeeLeaveBalancesAction(employeeId: string): Promise<
  ActionResult<{
    paidBalance: { allocated: number; used: number; remaining: number };
    shortBalance: { monthlyLeaves: number; monthlyHours: number };
    adjustmentLogs: any[];
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const currentYear = new Date().getFullYear();

    const [balances, logs] = await Promise.all([
      db.leaveBalance.findMany({
        where: { employeeId, year: currentYear },
      }),
      db.leaveAdjustmentLog.findMany({
        where: { employeeId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          adjustedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const paid = balances.find((b) => b.leaveType === LeaveType.PAID_LEAVE);
    const short = balances.find((b) => b.leaveType === LeaveType.SHORT_LEAVE);

    return {
      success: true,
      data: {
        paidBalance: {
          allocated: paid?.allocatedDays ?? 12,
          used: paid?.usedDays ?? 0,
          remaining: paid?.remainingDays ?? 12,
        },
        shortBalance: {
          monthlyLeaves: short?.monthlyShortLeaves ?? 0,
          monthlyHours: short?.monthlyShortHours ?? 0,
        },
        adjustmentLogs: logs.map((l) => ({
          id: l.id,
          leaveType: l.leaveType,
          previousBalance: l.previousBalance,
          newBalance: l.newBalance,
          adjustmentAmount: l.adjustmentAmount,
          unit: l.unit,
          reason: l.reason,
          adjustedByName: `${l.adjustedBy.firstName} ${l.adjustedBy.lastName}`,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching employee leave balances:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load employee leave balance.",
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
        startTime: r.startTime,
        endTime: r.endTime,
        durationHours: r.durationHours,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      }));
    }

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
        startTime: r.startTime,
        endTime: r.endTime,
        durationHours: r.durationHours,
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
export async function getAllLeaveRequestsAction(
  params: {
    department?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<
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
      startTime: r.startTime,
      endTime: r.endTime,
      durationHours: r.durationHours,
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
 * Employee cancels their own PENDING or APPROVED leave request
 * (If approved PAID_LEAVE, restores balance).
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

    if (!isHR && request.employeeId !== employee?.id) {
      return { success: false, error: "You can only cancel your own leave requests." };
    }

    await db.$transaction(async (tx) => {
      // If was APPROVED PAID_LEAVE, restore balance
      if (request.finalStatus === ApprovalStatus.APPROVED && request.leaveType === LeaveType.PAID_LEAVE && request.totalDays > 0) {
        const year = request.startDate.getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId: request.employeeId,
              leaveType: LeaveType.PAID_LEAVE,
              year,
            },
          },
        });

        if (balance) {
          const newUsed = Math.max(0, balance.usedDays - request.totalDays);
          const newRemaining = Math.min(balance.allocatedDays, balance.remainingDays + request.totalDays);

          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: newUsed,
              remainingDays: newRemaining,
            },
          });
        }
      }

      await tx.leaveRequest.delete({
        where: { id: requestId },
      });
    });

    revalidatePath("/hrms/leave");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error cancelling leave request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel leave request.",
    };
  }
}

/**
 * Updates an existing PENDING leave request
 */
export async function updateMyLeaveRequestAction(input: {
  requestId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await resolveCurrentEmployee();
    if (!employee) return { success: false, error: "Employee record not found." };

    const request = await db.leaveRequest.findUnique({
      where: { id: input.requestId },
    });

    if (!request) return { success: false, error: "Leave request not found." };

    if (request.employeeId !== employee.id) {
      return { success: false, error: "You can only edit your own leave requests." };
    }

    if (request.finalStatus !== ApprovalStatus.PENDING) {
      return { success: false, error: "Only PENDING requests can be edited." };
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const totalDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let durationHours: number | null = null;
    if (input.leaveType === LeaveType.SHORT_LEAVE && input.startTime && input.endTime) {
      const [sh, sm] = input.startTime.split(":").map(Number);
      const [eh, em] = input.endTime.split(":").map(Number);
      durationHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 10) / 10;
    }

    await db.leaveRequest.update({
      where: { id: input.requestId },
      data: {
        leaveType: input.leaveType,
        startDate: start,
        endDate: end,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        durationHours,
        totalDays: input.leaveType === LeaveType.SHORT_LEAVE ? 0 : totalDays,
        reason: input.reason.trim(),
      },
    });

    revalidatePath("/hrms/leave");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating leave request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update leave request.",
    };
  }
}

