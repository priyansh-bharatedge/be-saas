"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  ResignationStatus,
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

export interface SubmitResignationInput {
  proposedLastWorkingDay: string; // "YYYY-MM-DD"
  reason: string;
  comments?: string;
}

export interface ReviewResignationInput {
  resignationId: string;
  status: ResignationStatus;
  actualLastWorkingDay?: string; // "YYYY-MM-DD"
  exitComments?: string;
}

/**
 * Submits an official resignation request
 */
export async function submitResignationAction(
  input: SubmitResignationInput
): Promise<ActionResult<{ resignationId: string }>> {
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

    // Check if an existing resignation exists
    const existing = await db.resignation.findUnique({
      where: { employeeId: employee.id },
    });

    if (existing && existing.status !== ResignationStatus.WITHDRAWN && existing.status !== ResignationStatus.REJECTED) {
      return {
        success: false,
        error: "You already have an active resignation filing under review or approved.",
      };
    }

    const proposedLWD = new Date(input.proposedLastWorkingDay);

    const resignation = await db.resignation.upsert({
      where: { employeeId: employee.id },
      update: {
        resignationDate: new Date(),
        proposedLastWorkingDay: proposedLWD,
        reason: input.reason.trim(),
        comments: input.comments?.trim() || null,
        status: ResignationStatus.PENDING,
        actualLastWorkingDay: null,
        reviewerId: null,
      },
      create: {
        employeeId: employee.id,
        resignationDate: new Date(),
        proposedLastWorkingDay: proposedLWD,
        reason: input.reason.trim(),
        comments: input.comments?.trim() || null,
        status: ResignationStatus.PENDING,
      },
    });

    // Evaluate dynamic workflow
    const workflowResult = await evaluateHrmsWorkflow({
      module: HrmsWorkflowModule.RESIGNATION,
      triggerAction: WorkflowTriggerAction.ON_CREATE,
      recordId: resignation.id,
      employeeId: employee.id,
      department: employee.department,
      title: `Resignation Notice: ${employee.firstName} ${employee.lastName}`,
      details: `${employee.firstName} ${employee.lastName} (${employee.designation}) submitted resignation. Proposed LWD: ${input.proposedLastWorkingDay}.`,
    });

    if (!workflowResult.hasCustomWorkflow) {
      if (employee.teamLeaderId) {
        await createNotification({
          recipientUserId: employee.teamLeaderId,
          title: "Team Resignation Notice",
          message: `${employee.firstName} ${employee.lastName} submitted their resignation notice (Proposed LWD: ${input.proposedLastWorkingDay}).`,
          type: NotificationType.ACTION_REQUIRED,
          actionUrl: "/hrms/resignations",
        });
      }

      await notifyHRAdmins({
        title: "Official Resignation Submitted",
        message: `${employee.firstName} ${employee.lastName} (${employee.department} • ${employee.designation}) has submitted their resignation.`,
        type: NotificationType.WARNING,
        actionUrl: "/hrms/resignations",
      });
    }

    revalidatePath("/hrms/resignations");
    revalidatePath("/hrms");

    return { success: true, data: { resignationId: resignation.id } };
  } catch (error) {
    console.error("Error submitting resignation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit resignation.",
    };
  }
}

/**
 * Fetches personal resignation record for logged-in employee
 */
export async function getMyResignationAction(): Promise<ActionResult<any | null>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const record = await db.resignation.findUnique({
      where: { employeeId: user.id },
      include: {
        reviewer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!record) return { success: true, data: null };

    return {
      success: true,
      data: {
        id: record.id,
        resignationDate: record.resignationDate.toISOString().split("T")[0],
        proposedLastWorkingDay: record.proposedLastWorkingDay.toISOString().split("T")[0],
        actualLastWorkingDay: record.actualLastWorkingDay
          ? record.actualLastWorkingDay.toISOString().split("T")[0]
          : null,
        reason: record.reason,
        comments: record.comments,
        status: record.status,
        reviewerName: record.reviewer
          ? `${record.reviewer.firstName} ${record.reviewer.lastName}`
          : null,
        reviewedAt: record.reviewedAt?.toISOString() || null,
        noticePeriodDays: Math.ceil(
          Math.abs(
            (record.actualLastWorkingDay || record.proposedLastWorkingDay).getTime() -
              record.resignationDate.getTime()
          ) /
            (1000 * 60 * 60 * 24)
        ),
        exitInterviewNotes: record.reviewerRemarks,
      },
    };
  } catch (error) {
    console.error("Error fetching resignation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load resignation.",
    };
  }
}

/**
 * Fetches company resignations for HR Admin & HODs
 */
export async function getAllResignationsAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");

    const where: any = {};
    if (!scope.canViewAll && scope.allowedEmployeeIds) {
      where.employeeId = { in: scope.allowedEmployeeIds };
    }

    const records = await db.resignation.findMany({
      where,
      orderBy: { resignationDate: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true, dateOfJoining: true },
        },
        reviewer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        employeeId: r.employee.employeeId,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        department: r.employee.department,
        designation: r.employee.designation,
        dateOfJoining: r.employee.dateOfJoining ? r.employee.dateOfJoining.toISOString().split("T")[0] : null,
        resignationDate: r.resignationDate.toISOString().split("T")[0],
        proposedLastWorkingDay: r.proposedLastWorkingDay.toISOString().split("T")[0],
        actualLastWorkingDay: r.actualLastWorkingDay
          ? r.actualLastWorkingDay.toISOString().split("T")[0]
          : null,
        reason: r.reason,
        comments: r.comments,
        status: r.status,
        reviewerName: r.reviewer
          ? `${r.reviewer.firstName} ${r.reviewer.lastName}`
          : null,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        noticePeriodDays: Math.ceil(
          Math.abs(
            (r.actualLastWorkingDay || r.proposedLastWorkingDay).getTime() -
              r.resignationDate.getTime()
          ) /
            (1000 * 60 * 60 * 24)
        ),
        exitInterviewNotes: r.reviewerRemarks,
      })),
    };
  } catch (error) {
    console.error("Error fetching all resignations:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load resignations.",
    };
  }
}

/**
 * Reviews a resignation request (APPROVED, REJECTED, or UNDER_REVIEW)
 */
export async function reviewResignationAction(
  input: ReviewResignationInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin && !scope.isHod) {
      return { success: false, error: "Access Denied: Only HR Admins, HODs, or Super Admins can review resignations." };
    }

    const record = await db.resignation.findUnique({
      where: { id: input.resignationId },
      include: { employee: true },
    });

    if (!record) return { success: false, error: "Resignation filing not found." };

    const actualLWD = input.actualLastWorkingDay
      ? new Date(input.actualLastWorkingDay)
      : record.proposedLastWorkingDay;

    await db.resignation.update({
      where: { id: input.resignationId },
      data: {
        status: input.status,
        actualLastWorkingDay: actualLWD,
        reviewerId: user.id,
        reviewedAt: new Date(),
        reviewerRemarks: input.exitComments || null,
      },
    });

    // Notify employee
    await createNotification({
      recipientUserId: record.employeeId,
      recipientEmail: record.employee.workEmail,
      title: `Resignation ${input.status.toLowerCase()}`,
      message: `Your resignation notice was marked ${input.status}. Official Last Working Day: ${actualLWD.toISOString().split("T")[0]}.${input.exitComments ? ` Remarks: "${input.exitComments}"` : ""}`,
      type: input.status === ResignationStatus.APPROVED ? NotificationType.INFO : NotificationType.WARNING,
      actionUrl: "/hrms/resignations",
    });

    revalidatePath("/hrms/resignations");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error reviewing resignation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record review.",
    };
  }
}

/**
 * Employee withdraws their pending resignation
 */
export async function withdrawResignationAction(
  resignationId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const record = await db.resignation.findUnique({
      where: { id: resignationId },
    });

    if (!record || record.employeeId !== user.id) {
      return { success: false, error: "You can only withdraw your own resignation." };
    }

    if (record.status !== ResignationStatus.PENDING && record.status !== ResignationStatus.UNDER_REVIEW) {
      return { success: false, error: "Only PENDING or UNDER_REVIEW resignations can be withdrawn." };
    }

    await db.resignation.update({
      where: { id: resignationId },
      data: { status: ResignationStatus.WITHDRAWN },
    });

    await notifyHRAdmins({
      title: "Resignation Withdrawn",
      message: `Employee has formally withdrawn their resignation notice.`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/resignations",
    });

    revalidatePath("/hrms/resignations");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error withdrawing resignation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to withdraw resignation.",
    };
  }
}
