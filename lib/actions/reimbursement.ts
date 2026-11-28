"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  ReimbursementCategory,
  ReimbursementStatus,
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

export interface CreateReimbursementInput {
  title: string;
  category: ReimbursementCategory;
  expenseDate: string; // "YYYY-MM-DD"
  amount: number;
  description: string;
  receiptUrls?: string[];
}

export interface ReviewReimbursementInput {
  reimbursementId: string;
  status: ReimbursementStatus;
  remarks?: string;
}

/**
 * Submits a new expense reimbursement claim
 */
export async function createReimbursementAction(
  input: CreateReimbursementInput
): Promise<ActionResult<{ reimbursementId: string }>> {
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

    if (!input.title?.trim()) {
      return { success: false, error: "Expense title is required." };
    }

    if (input.amount <= 0) {
      return { success: false, error: "Claim amount must be greater than zero." };
    }

    const expDate = new Date(input.expenseDate);

    const reimbursement = await db.reimbursement.create({
      data: {
        employeeId: employee.id,
        title: input.title.trim(),
        category: input.category,
        expenseDate: expDate,
        amount: Number(input.amount),
        description: input.description.trim(),
        receiptUrls: input.receiptUrls || [],
        status: ReimbursementStatus.PENDING,
      },
    });

    // Evaluate dynamic workflow
    const workflowResult = await evaluateHrmsWorkflow({
      module: HrmsWorkflowModule.REIMBURSEMENT,
      triggerAction: WorkflowTriggerAction.ON_CREATE,
      recordId: reimbursement.id,
      employeeId: employee.id,
      department: employee.department,
      amount: input.amount,
      title: `Reimbursement Claim: ₹${input.amount} (${input.title})`,
      details: `${employee.firstName} ${employee.lastName} (${employee.department}) claimed ₹${input.amount} for ${input.category}.`,
    });

    // Fallback notifications
    if (!workflowResult.hasCustomWorkflow) {
      if (employee.teamLeaderId) {
        await createNotification({
          recipientUserId: employee.teamLeaderId,
          title: "Reimbursement Claim Filed",
          message: `${employee.firstName} ${employee.lastName} submitted a ₹${input.amount} expense claim (${input.title}).`,
          type: NotificationType.ACTION_REQUIRED,
          actionUrl: "/hrms/reimbursements",
        });
      }

      await notifyHRAdmins({
        title: "New Reimbursement Claim",
        message: `${employee.firstName} ${employee.lastName} (${employee.department}) submitted a ₹${input.amount} expense claim.`,
        type: NotificationType.INFO,
        actionUrl: "/hrms/reimbursements",
      });
    }

    revalidatePath("/hrms/reimbursements");
    revalidatePath("/hrms");

    return { success: true, data: { reimbursementId: reimbursement.id } };
  } catch (error) {
    console.error("Error creating reimbursement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit reimbursement.",
    };
  }
}

/**
 * Fetches personal reimbursements for the logged-in employee
 */
export async function getMyReimbursementsAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const records = await db.reimbursement.findMany({
      where: { employeeId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        expenseDate: r.expenseDate.toISOString().split("T")[0],
        amount: r.amount,
        description: r.description,
        receiptUrls: Array.isArray(r.receiptUrls) ? r.receiptUrls : [],
        status: r.status,
        reviewerName: r.approvedBy
          ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}`
          : null,
        reviewedAt: r.updatedAt.toISOString(),
        remarks: r.remarks,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching my reimbursements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load claims.",
    };
  }
}

/**
 * Fetches organizational reimbursements for HR Admin / Reviewers
 */
export async function getAllReimbursementsAction(params: {
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
      where.status = params.status as ReimbursementStatus;
    }

    if (params.department && params.department !== "ALL") {
      where.employee = { department: params.department };
    }

    const records = await db.reimbursement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
        },
        approvedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
        employeeId: r.employee.employeeId,
        department: r.employee.department,
        designation: r.employee.designation,
        title: r.title,
        category: r.category,
        expenseDate: r.expenseDate.toISOString().split("T")[0],
        amount: r.amount,
        description: r.description,
        receiptUrls: Array.isArray(r.receiptUrls) ? r.receiptUrls : [],
        status: r.status,
        reviewerName: r.approvedBy
          ? `${r.approvedBy.firstName} ${r.approvedBy.lastName}`
          : null,
        reviewedAt: r.updatedAt.toISOString(),
        remarks: r.remarks,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching all reimbursements:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load claims.",
    };
  }
}

/**
 * Reviews a reimbursement (APPROVED, REJECTED, or PAID)
 */
export async function reviewReimbursementAction(
  input: ReviewReimbursementInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin && !scope.isHod) {
      return { success: false, error: "Access Denied: Only HR Admins, HODs, or Super Admins can review claims." };
    }

    const record = await db.reimbursement.findUnique({
      where: { id: input.reimbursementId },
      include: { employee: true },
    });

    if (!record) return { success: false, error: "Reimbursement record not found." };

    await db.reimbursement.update({
      where: { id: input.reimbursementId },
      data: {
        status: input.status,
        approvedById: user.id,
        paidAt: input.status === ReimbursementStatus.PAID ? new Date() : undefined,
        remarks: input.remarks || null,
      },
    });

    // Notify employee
    await createNotification({
      recipientUserId: record.employeeId,
      recipientEmail: record.employee.workEmail,
      title: `Reimbursement ${input.status.toLowerCase()}`,
      message: `Your expense claim of ₹${record.amount} (${record.title}) was marked ${input.status}.${input.remarks ? ` Remarks: "${input.remarks}"` : ""}`,
      type: input.status === ReimbursementStatus.APPROVED || input.status === ReimbursementStatus.PAID ? NotificationType.SUCCESS : NotificationType.WARNING,
      actionUrl: "/hrms/reimbursements",
    });

    revalidatePath("/hrms/reimbursements");
    revalidatePath("/hrms");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error reviewing reimbursement:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to review reimbursement.",
    };
  }
}
