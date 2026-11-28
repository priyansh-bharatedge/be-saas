"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  PayrollPaymentStatus,
  NotificationType,
  ReimbursementStatus,
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
 * Fetches personal monthly payslips for logged-in employee
 */
export async function getMyPayrollsAction(): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const records = await db.payrollRecord.findMany({
      where: { employeeId: user.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        baseSalary: r.baseSalary,
        deductions: r.deductions,
        reimbursementsAdded: r.reimbursementsAdded,
        netPayable: r.netPayable,
        paymentStatus: r.paymentStatus,
        paidAt: r.paidAt?.toISOString() || null,
        paymentReference: r.remarks,
        payslipUrl: r.payslipUrl,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching my payroll:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payroll.",
    };
  }
}

/**
 * Fetches company payroll records for HR Admin / Finance desk
 */
export async function getAllPayrollsAction(params: {
  month?: number;
  year?: number;
  status?: string;
  department?: string;
} = {}): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied: Only HR Admin and Super Admin can access payroll desk." };
    }

    const where: any = {};
    if (params.month) where.month = Number(params.month);
    if (params.year) where.year = Number(params.year);
    if (params.status && params.status !== "ALL") {
      where.paymentStatus = params.status as PayrollPaymentStatus;
    }
    if (params.department && params.department !== "ALL") {
      where.employee = { department: params.department };
    }

    const records = await db.payrollRecord.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }, { employee: { firstName: "asc" } }],
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: true,
            designation: true,
            bankAccountNumber: true,
            bankName: true,
            ifscCode: true,
          },
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
        bankDetails: `${r.employee.bankName} (${r.employee.bankAccountNumber.slice(-4)})`,
        month: r.month,
        year: r.year,
        baseSalary: r.baseSalary,
        deductions: r.deductions,
        reimbursementsAdded: r.reimbursementsAdded,
        netPayable: r.netPayable,
        paymentStatus: r.paymentStatus,
        paidAt: r.paidAt?.toISOString() || null,
        paymentReference: r.remarks,
        payslipUrl: r.payslipUrl,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching all payrolls:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payroll records.",
    };
  }
}

/**
 * Bulk Generates Monthly Payroll for all active employees
 */
export async function generateMonthlyPayrollAction(input: {
  month: number;
  year: number;
}): Promise<ActionResult<{ generatedCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied." };
    }

    const employees = await db.employee.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        reimbursements: {
          where: {
            status: ReimbursementStatus.APPROVED,
          },
          select: { id: true, amount: true },
        },
      },
    });

    let count = 0;
    for (const emp of employees) {
      // Default base salary calculation (standard ₹35,000 or custom)
      const baseSalary = 35000;
      const approvedReimbursements = emp.reimbursements.reduce((sum, r) => sum + r.amount, 0);
      const deductions = 1800; // Standard PF / PT statutory deduction
      const netPayable = Math.max(0, baseSalary - deductions + approvedReimbursements);

      await db.payrollRecord.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: input.month,
            year: input.year,
          },
        },
        update: {
          baseSalary,
          deductions,
          reimbursementsAdded: approvedReimbursements,
          netPayable,
        },
        create: {
          employeeId: emp.id,
          month: input.month,
          year: input.year,
          baseSalary,
          deductions,
          reimbursementsAdded: approvedReimbursements,
          netPayable,
          paymentStatus: PayrollPaymentStatus.PENDING,
        },
      });
      count++;
    }

    revalidatePath("/hrms/payroll");
    revalidatePath("/hrms/inbox");

    return { success: true, data: { generatedCount: count } };
  } catch (error) {
    console.error("Error generating monthly payroll:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate payroll.",
    };
  }
}

/**
 * Updates status of a payroll payout (PROCESSED or PAID)
 */
export async function updatePayrollStatusAction(input: {
  payrollId: string;
  status: PayrollPaymentStatus;
  paymentReference?: string;
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const record = await db.payrollRecord.findUnique({
      where: { id: input.payrollId },
      include: { employee: true },
    });

    if (!record) return { success: false, error: "Payroll record not found." };

    await db.payrollRecord.update({
      where: { id: input.payrollId },
      data: {
        paymentStatus: input.status,
        paidAt: input.status === PayrollPaymentStatus.PAID ? new Date() : undefined,
        remarks: input.paymentReference || null,
      },
    });

    if (input.status === PayrollPaymentStatus.PAID) {
      await createNotification({
        recipientUserId: record.employeeId,
        recipientEmail: record.employee.workEmail,
        title: `Salary Credited for ${record.month}/${record.year}`,
        message: `Your net salary of ₹${record.netPayable} for ${record.month}/${record.year} has been credited.${input.paymentReference ? ` Ref: ${input.paymentReference}` : ""}`,
        type: NotificationType.SUCCESS,
        actionUrl: "/hrms/payroll",
      });
    }

    revalidatePath("/hrms/payroll");
    revalidatePath("/hrms/inbox");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error updating payroll status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update payroll status.",
    };
  }
}

/**
 * Checks for unpaid prior-month salaries (used in HR Admin Inbox)
 */
export async function getPriorMonthPendingSalaryAction(): Promise<
  ActionResult<{ count: number; totalPending: number; records: any[] }>
> {
  try {
    const now = new Date();
    // Prior month calculation
    const priorMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const priorYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const pending = await db.payrollRecord.findMany({
      where: {
        month: priorMonth,
        year: priorYear,
        paymentStatus: PayrollPaymentStatus.PENDING,
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true },
        },
      },
    });

    const total = pending.reduce((sum, p) => sum + p.netPayable, 0);

    return {
      success: true,
      data: {
        count: pending.length,
        totalPending: total,
        records: pending.map((p) => ({
          id: p.id,
          employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
          employeeId: p.employee.employeeId,
          department: p.employee.department,
          netPayable: p.netPayable,
          month: p.month,
          year: p.year,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check prior month salaries.",
    };
  }
}
