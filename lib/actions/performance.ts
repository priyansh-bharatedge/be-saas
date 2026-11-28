"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  AppraisalStatus,
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

/**
 * Fetches personal performance appraisals for the logged-in employee
 */
export async function getMyAppraisalsAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const records = await db.performanceAppraisal.findMany({
      where: { employeeId: user.id },
      orderBy: { dueDate: "desc" },
      include: {
        manager: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      data: records.map((r) => {
        const ratingMatch = r.hrRemarks?.match(/\[HR Rating:\s*([0-9.]+)\/5\.0\]/);
        const hrRating = ratingMatch ? parseFloat(ratingMatch[1]) : r.managerRating;
        const isPromo = (r.hrRemarks || "").includes("[Promotion Recommended]");
        return {
          id: r.id,
          appraisalCycle: r.appraisalCycle,
          dueDate: r.dueDate.toISOString().split("T")[0],
          selfReview: r.selfReview,
          managerRating: r.managerRating,
          managerReview: r.managerReview,
          managerName: r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : null,
          hrFinalRating: hrRating,
          hrRemarks: r.hrRemarks,
          status: r.status,
          promotionRecommended: isPromo,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching my appraisals:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load appraisals.",
    };
  }
}

/**
 * Fetches company appraisals for Managers and HR Admins
 */
export async function getAllAppraisalsAction(params: {
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
      where.status = params.status as AppraisalStatus;
    }

    if (params.department && params.department !== "ALL") {
      where.employee = { department: params.department };
    }

    const records = await db.performanceAppraisal.findMany({
      where,
      orderBy: { dueDate: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
        },
        manager: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      data: records.map((r) => {
        const ratingMatch = r.hrRemarks?.match(/\[HR Rating:\s*([0-9.]+)\/5\.0\]/);
        const hrRating = ratingMatch ? parseFloat(ratingMatch[1]) : r.managerRating;
        const isPromo = (r.hrRemarks || "").includes("[Promotion Recommended]");
        return {
          id: r.id,
          employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
          employeeId: r.employee.employeeId,
          department: r.employee.department,
          designation: r.employee.designation,
          appraisalCycle: r.appraisalCycle,
          dueDate: r.dueDate.toISOString().split("T")[0],
          selfReview: r.selfReview,
          managerRating: r.managerRating,
          managerReview: r.managerReview,
          managerName: r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : null,
          hrFinalRating: hrRating,
          hrRemarks: r.hrRemarks,
          status: r.status,
          promotionRecommended: isPromo,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching all appraisals:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load appraisals.",
    };
  }
}

/**
 * Employee submits their Self-Review
 */
export async function submitSelfReviewAction(input: {
  appraisalId: string;
  selfReview: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const record = await db.performanceAppraisal.findUnique({
      where: { id: input.appraisalId },
      include: { employee: true },
    });

    if (!record || record.employeeId !== user.id) {
      return { success: false, error: "Unauthorized to edit this appraisal." };
    }

    await db.performanceAppraisal.update({
      where: { id: input.appraisalId },
      data: {
        selfReview: input.selfReview.trim(),
        status: AppraisalStatus.IN_REVIEW,
      },
    });

    // Notify manager if assigned
    if (record.employee.teamLeaderId) {
      await createNotification({
        recipientUserId: record.employee.teamLeaderId,
        title: "Self-Review Completed",
        message: `${record.employee.firstName} ${record.employee.lastName} completed their self-review for ${record.appraisalCycle}. Manager rating required.`,
        type: NotificationType.ACTION_REQUIRED,
        actionUrl: "/hrms/performance",
      });
    }

    revalidatePath("/hrms/performance");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error submitting self review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit self review.",
    };
  }
}

/**
 * Manager rates employee and provides review comments
 */
export async function reviewManagerAppraisalAction(input: {
  appraisalId: string;
  managerRating: number; // 1 - 5
  managerReview: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    await db.performanceAppraisal.update({
      where: { id: input.appraisalId },
      data: {
        managerRating: input.managerRating,
        managerReview: input.managerReview.trim(),
        managerId: user.id,
        status: AppraisalStatus.IN_REVIEW,
      },
    });

    await notifyHRAdmins({
      title: "Manager Appraisal Rating Recorded",
      message: `A manager rating has been submitted. HR final calibration required.`,
      type: NotificationType.INFO,
      actionUrl: "/hrms/performance",
    });

    revalidatePath("/hrms/performance");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error recording manager review:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record manager review.",
    };
  }
}

/**
 * HR Admin final sign-off & promotion recommendation
 */
export async function reviewHrFinalSignOffAction(input: {
  appraisalId: string;
  hrFinalRating: number;
  hrRemarks?: string;
  promotionRecommended?: boolean;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied: Only HR Admins can perform final sign-off." };
    }

    const formattedRemarks = `[HR Rating: ${input.hrFinalRating}/5.0]${
      input.promotionRecommended ? " [Promotion Recommended]" : ""
    } ${input.hrRemarks?.trim() || ""}`.trim();

    const record = await db.performanceAppraisal.update({
      where: { id: input.appraisalId },
      data: {
        hrRemarks: formattedRemarks,
        completedAt: new Date(),
        status: AppraisalStatus.COMPLETED,
      },
      include: { employee: true },
    });

    // Notify employee of completed appraisal
    await createNotification({
      recipientUserId: record.employeeId,
      recipientEmail: record.employee.workEmail,
      title: `Appraisal Cycle Completed: ${record.appraisalCycle}`,
      message: `Your performance appraisal for ${record.appraisalCycle} is finalized. Score: ${input.hrFinalRating}/5.0.`,
      type: NotificationType.SUCCESS,
      actionUrl: "/hrms/performance",
    });

    revalidatePath("/hrms/performance");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error recording HR sign-off:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record sign-off.",
    };
  }
}

/**
 * Initiates an appraisal cycle for an employee or all active staff
 */
export async function createAppraisalCycleAction(input: {
  appraisalCycle: string;
  dueDate: string;
  employeeIds: string[];
}): Promise<ActionResult<{ createdCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied: Only HR Admins can initiate appraisal cycles." };
    }

    const due = new Date(input.dueDate);

    let count = 0;
    for (const empId of input.employeeIds) {
      await db.performanceAppraisal.create({
        data: {
          employeeId: empId,
          appraisalCycle: input.appraisalCycle,
          dueDate: due,
          status: AppraisalStatus.UPCOMING,
        },
      });
      count++;
    }

    revalidatePath("/hrms/performance");
    return { success: true, data: { createdCount: count } };
  } catch (error) {
    console.error("Error creating appraisal cycle:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create appraisal cycle.",
    };
  }
}
