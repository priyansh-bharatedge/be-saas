"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import { LifecycleType } from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ONBOARDING_TEMPLATE_TASKS = [
  "Complete Identity & Aadhaar Verification",
  "Collect & File Signed Offer Letter & NDA",
  "Provision Enterprise Google Workspace & Slack Account",
  "Issue Workstation Laptop & Security Pass",
  "HRMS Profile & Bank Account Setup",
  "Department HOD & Team Welcome Introduction",
  "Company Culture & Policy Orientation",
];

const EXIT_TEMPLATE_TASKS = [
  "Conduct Official HR Exit Interview",
  "Knowledge Transfer & Code/Client Handover Sign-off",
  "Surrender Company Laptop, ID Card & Access Fobs",
  "Revoke Enterprise Google Workspace & Cloud Access",
  "Accounts Final Settlement & Gratuity Calculation",
  "Issue Formal Relieving & Experience Letter",
];

/**
 * Fetches all lifecycle checklists for HR Admin or logged-in employee
 */
export async function getChecklistsAction(employeeId?: string): Promise<ActionResult<any[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");

    const where: any = {};
    if (employeeId) {
      where.employeeId = employeeId;
    } else if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      where.employeeId = user.id;
    }

    const checklists = await db.employeeChecklist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeId: true, department: true, designation: true },
        },
        tasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return {
      success: true,
      data: checklists.map((c) => ({
        id: c.id,
        employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
        employeeId: c.employee.employeeId,
        department: c.employee.department,
        designation: c.employee.designation,
        type: c.type,
        title: c.title,
        progressPercent: c.progressPercent,
        isCompleted: c.isCompleted,
        createdAt: c.createdAt.toISOString(),
        tasks: c.tasks.map((t) => ({
          id: t.id,
          taskName: t.title,
          isCompleted: t.isCompleted,
          completedAt: t.completedAt?.toISOString() || null,
          dueDate: t.dueDate?.toISOString().split("T")[0] || null,
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching checklists:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load checklists.",
    };
  }
}

/**
 * Creates an Onboarding or Exit checklist for an employee
 */
export async function createChecklistAction(input: {
  employeeId: string;
  type: LifecycleType;
}): Promise<ActionResult<{ checklistId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getScopeFilter(user, "hrms");
    if (!scope.isHrAdmin && !scope.isSuperAdmin) {
      return { success: false, error: "Access Denied: Only HR Admins can create checklists." };
    }

    const employee = await db.employee.findUnique({
      where: { id: input.employeeId },
      select: { firstName: true, lastName: true },
    });

    if (!employee) return { success: false, error: "Employee not found." };

    const taskTemplates =
      input.type === LifecycleType.ONBOARDING
        ? ONBOARDING_TEMPLATE_TASKS
        : EXIT_TEMPLATE_TASKS;

    const checklistTitle = `${input.type === LifecycleType.ONBOARDING ? "Onboarding" : "Exit Offboarding"} — ${employee.firstName} ${employee.lastName}`;

    const checklist = await db.employeeChecklist.create({
      data: {
        employeeId: input.employeeId,
        type: input.type,
        title: checklistTitle,
        progressPercent: 0,
        isCompleted: false,
        tasks: {
          create: taskTemplates.map((taskName) => ({
            title: taskName,
            category: "GENERAL",
            isCompleted: false,
          })),
        },
      },
    });

    revalidatePath("/hrms/lifecycle");
    revalidatePath("/hrms/inbox");

    return { success: true, data: { checklistId: checklist.id } };
  } catch (error) {
    console.error("Error creating checklist:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create checklist.",
    };
  }
}

/**
 * Toggles a checklist item complete or incomplete
 */
export async function toggleChecklistItemAction(
  taskId: string,
  isCompleted: boolean
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const task = await db.checklistItem.findUnique({
      where: { id: taskId },
      include: { checklist: { include: { tasks: true } } },
    });

    if (!task) return { success: false, error: "Task not found." };

    // Update the task
    await db.checklistItem.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // Recalculate checklist progress
    const allTasks = task.checklist.tasks;
    const completedCount = allTasks.filter((t) => (t.id === taskId ? isCompleted : t.isCompleted)).length;
    const progressPercent = Math.round((completedCount / allTasks.length) * 100);
    const checklistCompleted = progressPercent === 100;

    await db.employeeChecklist.update({
      where: { id: task.checklistId },
      data: {
        progressPercent,
        isCompleted: checklistCompleted,
      },
    });

    revalidatePath("/hrms/lifecycle");
    revalidatePath("/hrms/inbox");

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error toggling checklist task:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task.",
    };
  }
}
