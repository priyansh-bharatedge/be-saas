"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  ApprovalStatus,
  RegularizationType,
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

export interface CreateRegularizationInput {
  date: string; // "YYYY-MM-DD"
  requestedClockIn: string; // ISO string or "YYYY-MM-DDTHH:MM"
  requestedClockOut: string; // ISO string or "YYYY-MM-DDTHH:MM"
  regularizationType: RegularizationType;
  reason: string;
  attachmentUrl?: string | null;
}

export interface ReviewRegularizationInput {
  regularizationId: string;
  status: ApprovalStatus;
  remarks?: string;
}

/**
 * Submits a new Attendance Regularization (AR) request
 */
export async function createRegularizationAction(
  input: CreateRegularizationInput
): Promise<ActionResult<{ regularizationId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const employee = await db.employee.findUnique({
      where: { id: user.id },
      include: { teamLeader: true },
    });

    if (!employee) {
      return { success: false, error: "Authenticated employee record not found." };
    }

    const reqDate = new Date(input.date);
    reqDate.setUTCHours(0, 0, 0, 0);

    const clockIn = new Date(input.requestedClockIn);
    const clockOut = new Date(input.requestedClockOut);

    if (isNaN(clockIn.getTime()) || isNaN(clockOut.getTime())) {
      return { success: false, error: "Invalid clock-in or clock-out timestamps provided." };
    }

    if (clockOut <= clockIn) {
      return { success: false, error: "Requested clock-out time must be later than clock-in time." };
    }

    // Check if an existing attendance record exists for this date
    const existingAttendance = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: reqDate,
        },
      },
    });

    // Check if there is already a pending regularization for this date
    const pendingExisting = await db.attendanceRegularization.findFirst({
      where: {
        employeeId: employee.id,
        date: reqDate,
        status: ApprovalStatus.PENDING,
      },
    });

    if (pendingExisting) {
      return {
        success: false,
        error: "You already have a pending regularization request for this date.",
      };
    }

    const regularization = await db.attendanceRegularization.create({
      data: {
        employeeId: employee.id,
        attendanceId: existingAttendance?.id || null,
        date: reqDate,
        requestedClockIn: clockIn,
        requestedClockOut: clockOut,
        regularizationType: input.regularizationType,
        reason: input.reason.trim(),
        attachmentUrl: input.attachmentUrl || null,
        status: ApprovalStatus.PENDING,
      },
    });

    // Evaluate Dynamic Workflow Engine
    const workflowResult = await evaluateHrmsWorkflow({
      module: HrmsWorkflowModule.ATTENDANCE_REGULARIZATION,
      triggerAction: WorkflowTriggerAction.ON_CREATE,
      recordId: regularization.id,
      employeeId: employee.id,
      department: employee.department,
      title: `Attendance Regularization: ${employee.firstName} ${employee.lastName}`,
      details: `${input.regularizationType.replace("_", " ")} on ${input.date}. Reason: ${input.reason}`,
    });

    // Default enterprise fallback if no custom workflow was assigned
    if (!workflowResult.hasCustomWorkflow) {
      // 1. Notify assigned Team Leader
      if (employee.teamLeaderId) {
        await createNotification({
          recipientUserId: employee.teamLeaderId,
          title: "Attendance Regularization Request",
          message: `${employee.firstName} ${employee.lastName} requested attendance regularization for ${input.date} (${input.regularizationType.replace("_", " ")}).`,
          type: NotificationType.ACTION_REQUIRED,
          actionUrl: "/hrms/attendance",
        });
      }

      // 2. Notify HR Admins
      await notifyHRAdmins({
        title: "New Attendance Regularization (AR)",
        message: `${employee.firstName} ${employee.lastName} (${employee.department}) requested attendance regularization for ${input.date}.`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/attendance",
      });
    }

    revalidatePath("/hrms/attendance");
    revalidatePath("/hrms");

    return {
      success: true,
      data: { regularizationId: regularization.id },
    };
  } catch (error) {
    console.error("Error creating attendance regularization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit regularization request.",
    };
  }
}

/**
 * Reviews (Approves or Rejects) an Attendance Regularization request
 */
export async function reviewRegularizationAction(
  input: ReviewRegularizationInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    const reviewer = await db.employee.findUnique({
      where: { id: user.id },
    });

    const regularization = await db.attendanceRegularization.findUnique({
      where: { id: input.regularizationId },
      include: { employee: true, attendance: true },
    });

    if (!regularization) {
      return { success: false, error: "Regularization request not found." };
    }

    // RBAC: HR Admin, Super Admin, Dept HOD, or direct TL
    const isOwnerTL = regularization.employee.teamLeaderId === user.id;
    const isAuthorized =
      scope.isHrAdmin ||
      scope.isSuperAdmin ||
      scope.isHod ||
      isOwnerTL;

    if (!isAuthorized) {
      return { success: false, error: "Access Denied: You are not authorized to review this regularization request." };
    }

    const now = new Date();
    const isApproved = input.status === ApprovalStatus.APPROVED;

    await db.$transaction(async (tx) => {
      // 1. Update regularization status
      await tx.attendanceRegularization.update({
        where: { id: input.regularizationId },
        data: {
          status: input.status,
          reviewedById: reviewer?.id || user.id,
          reviewedAt: now,
          reviewRemarks: input.remarks?.trim() || null,
        },
      });

      // 2. If approved, automatically update or create the AttendanceRecord
      if (isApproved) {
        const clockIn = new Date(regularization.requestedClockIn);
        const clockOut = new Date(regularization.requestedClockOut);
        const durationHours = Math.max(
          0,
          parseFloat(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(2))
        );

        const remarksText = `Regularized [${regularization.regularizationType}]: ${regularization.reason}`;

        // Upsert Attendance Record
        const updatedAttendance = await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: regularization.employeeId,
              date: regularization.date,
            },
          },
          update: {
            clockInTime: clockIn,
            clockOutTime: clockOut,
            totalActiveHours: durationHours,
            currentStatus: "CLOCKED_OUT",
            remarks: remarksText,
          },
          create: {
            employeeId: regularization.employeeId,
            date: regularization.date,
            clockInTime: clockIn,
            clockOutTime: clockOut,
            totalActiveHours: durationHours,
            currentStatus: "CLOCKED_OUT",
            remarks: remarksText,
          },
        });

        // Link attendanceId if not already set
        if (!regularization.attendanceId) {
          await tx.attendanceRegularization.update({
            where: { id: regularization.id },
            data: { attendanceId: updatedAttendance.id },
          });
        }
      }
    });

    // Notify employee of review outcome
    await createNotification({
      recipientUserId: regularization.employeeId,
      recipientEmail: regularization.employee.workEmail,
      title: isApproved
        ? "Attendance Regularization Approved"
        : "Attendance Regularization Declined",
      message: isApproved
        ? `Your attendance regularization for ${regularization.date.toISOString().split("T")[0]} was approved. Timesheet updated.`
        : `Your attendance regularization request was declined.${input.remarks ? ` Remarks: "${input.remarks}"` : ""}`,
      type: isApproved ? NotificationType.SUCCESS : NotificationType.WARNING,
      actionUrl: "/hrms/attendance",
    });

    revalidatePath("/hrms/attendance");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error reviewing attendance regularization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record regularization review.",
    };
  }
}

/**
 * Fetches personal regularization requests for logged-in employee
 */
export async function getMyRegularizationsAction(): Promise<
  ActionResult<any[]>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const records = await db.attendanceRegularization.findMany({
      where: { employeeId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const data = records.map((r) => ({
      id: r.id,
      date: r.date.toISOString().split("T")[0],
      requestedClockIn: r.requestedClockIn.toISOString(),
      requestedClockOut: r.requestedClockOut.toISOString(),
      regularizationType: r.regularizationType,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      status: r.status,
      reviewedByName: r.reviewedBy
        ? `${r.reviewedBy.firstName} ${r.reviewedBy.lastName}`
        : null,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewRemarks: r.reviewRemarks,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching my regularizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load regularizations.",
    };
  }
}

/**
 * Fetches company regularization requests for HR Admin / TLs
 */
export async function getAllRegularizationsAction(params: {
  status?: string;
  department?: string;
} = {}): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");

    const where: any = {};

    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      where.employeeId = { in: scope.allowedEmployeeIds };
    }

    if (params.status && params.status !== "ALL") {
      where.status = params.status as ApprovalStatus;
    }

    if (params.department && params.department !== "ALL") {
      where.employee = { department: params.department };
    }

    const records = await db.attendanceRegularization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
          },
        },
        reviewedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const data = records.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeCode: r.employee.employeeId,
      department: r.employee.department,
      designation: r.employee.designation,
      date: r.date.toISOString().split("T")[0],
      requestedClockIn: r.requestedClockIn.toISOString(),
      requestedClockOut: r.requestedClockOut.toISOString(),
      regularizationType: r.regularizationType,
      reason: r.reason,
      attachmentUrl: r.attachmentUrl,
      status: r.status,
      reviewedByName: r.reviewedBy
        ? `${r.reviewedBy.firstName} ${r.reviewedBy.lastName}`
        : null,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      reviewRemarks: r.reviewRemarks,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching all regularizations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load regularization records.",
    };
  }
}
