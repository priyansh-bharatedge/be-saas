"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getScopeFilter } from "@/lib/auth/rbac";
import {
  HrmsWorkflowModule,
  WorkflowTriggerAction,
  Role,
  SystemRole,
} from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WorkflowStepInput {
  stepOrder: number;
  approverRole?: string | null;
  approverEmployeeId?: string | null;
  isMandatory?: boolean;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  module: HrmsWorkflowModule;
  triggerAction: WorkflowTriggerAction;
  departmentScope?: string;
  intimationRecipients: string[];
  steps: WorkflowStepInput[];
}

/**
 * Asserts caller is HR Admin or Super Admin
 */
async function assertHRAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized.");

  const scope = await getScopeFilter(user, "hrms");
  if (!scope.isHrAdmin && !scope.isSuperAdmin) {
    throw new Error("Access Denied: Only HR Admins and Super Admins can manage HRMS Workflows.");
  }
  return user;
}

/**
 * Fetches all HRMS workflows with their steps and execution logs
 */
export async function getHrmsWorkflowsAction(): Promise<ActionResult<any[]>> {
  try {
    await assertHRAdmin();

    const workflows = await db.hrmsWorkflow.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
          include: {
            approver: {
              select: { firstName: true, lastName: true, employeeId: true, department: true },
            },
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true, employeeId: true },
        },
        _count: {
          select: { executionLogs: true },
        },
      },
    });

    return {
      success: true,
      data: workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        module: w.module,
        triggerAction: w.triggerAction,
        departmentScope: w.departmentScope,
        intimationRecipients: Array.isArray(w.intimationRecipients)
          ? w.intimationRecipients
          : [],
        isActive: w.isActive,
        createdAt: w.createdAt.toISOString(),
        createdByName: w.createdBy ? `${w.createdBy.firstName} ${w.createdBy.lastName}` : "System",
        executionCount: w._count?.executionLogs || 0,
        steps: w.steps.map((s: any) => ({
          id: s.id,
          stepOrder: s.stepOrder,
          approverRole: s.approverRole,
          approverEmployeeId: s.approverId,
          approverName: s.approver
            ? `${s.approver.firstName} ${s.approver.lastName}`
            : null,
          isMandatory: s.isMandatory,
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching HRMS workflows:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load workflows.",
    };
  }
}

/**
 * Creates a new HRMS workflow with sequential steps
 */
export async function createHrmsWorkflowAction(
  input: CreateWorkflowInput
): Promise<ActionResult<{ workflowId: string }>> {
  try {
    const user = await assertHRAdmin();

    if (!input.name?.trim()) {
      return { success: false, error: "Workflow name is required." };
    }

    if (!input.steps || input.steps.length === 0) {
      return { success: false, error: "At least one approval step is required." };
    }

    const workflow = await db.$transaction(async (tx) => {
      const created = await tx.hrmsWorkflow.create({
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          module: input.module,
          triggerAction: input.triggerAction,
          departmentScope: input.departmentScope || "ALL",
          intimationRecipients: input.intimationRecipients || [],
          isActive: true,
          createdById: user.id,
          steps: {
            create: input.steps.map((s, index) => ({
              stepOrder: index + 1,
              stepName: `Approval Step ${index + 1}`,
              approverRole: s.approverRole || "HR_ADMIN",
              approverId: s.approverEmployeeId || null,
              isMandatory: s.isMandatory ?? true,
            })),
          },
        },
      });
      return created;
    });

    revalidatePath("/hrms/workflows");
    revalidatePath("/hrms");

    return { success: true, data: { workflowId: workflow.id } };
  } catch (error) {
    console.error("Error creating HRMS workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create workflow.",
    };
  }
}

/**
 * Toggles an HRMS workflow active / paused status
 */
export async function toggleHrmsWorkflowStatusAction(
  workflowId: string,
  isActive: boolean
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await assertHRAdmin();

    await db.hrmsWorkflow.update({
      where: { id: workflowId },
      data: { isActive },
    });

    revalidatePath("/hrms/workflows");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error toggling workflow status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update workflow.",
    };
  }
}

/**
 * Deletes an HRMS workflow
 */
export async function deleteHrmsWorkflowAction(
  workflowId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    await assertHRAdmin();

    await db.$transaction(async (tx) => {
      await tx.hrmsWorkflowStep.deleteMany({ where: { workflowId } });
      await tx.hrmsWorkflowLog.deleteMany({ where: { workflowId } });
      await tx.hrmsWorkflow.delete({ where: { id: workflowId } });
    });

    revalidatePath("/hrms/workflows");
    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Error deleting HRMS workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete workflow.",
    };
  }
}

/**
 * Deterministic AI Rule Assistant:
 * Parses a natural language HR policy sentence into a structured workflow configuration.
 */
export async function aiTranslateWorkflowRuleAction(prompt: string): Promise<
  ActionResult<{
    suggestedName: string;
    module: HrmsWorkflowModule;
    triggerAction: WorkflowTriggerAction;
    departmentScope: string;
    intimationRecipients: string[];
    steps: { stepOrder: number; approverRole: string; isMandatory: boolean }[];
  }>
> {
  try {
    await assertHRAdmin();

    const lower = prompt.toLowerCase();

    // 1. Detect module
    let module: HrmsWorkflowModule = HrmsWorkflowModule.LEAVE;
    if (lower.includes("regularization") || lower.includes("punch") || lower.includes("attendance")) {
      module = HrmsWorkflowModule.ATTENDANCE_REGULARIZATION;
    } else if (lower.includes("reimburse") || lower.includes("expense") || lower.includes("claim")) {
      module = HrmsWorkflowModule.REIMBURSEMENT;
    } else if (lower.includes("resignation") || lower.includes("exit") || lower.includes("notice")) {
      module = HrmsWorkflowModule.RESIGNATION;
    } else if (lower.includes("appraisal") || lower.includes("performance") || lower.includes("review")) {
      module = HrmsWorkflowModule.PERFORMANCE;
    } else if (lower.includes("payroll") || lower.includes("salary") || lower.includes("pay")) {
      module = HrmsWorkflowModule.PAYROLL;
    } else if (lower.includes("helpdesk") || lower.includes("ticket") || lower.includes("issue")) {
      module = HrmsWorkflowModule.HELPDESK;
    }

    // 2. Detect trigger action
    let triggerAction: WorkflowTriggerAction = WorkflowTriggerAction.ON_CREATE;
    if (lower.includes("approve") || lower.includes("when approved")) {
      triggerAction = WorkflowTriggerAction.ON_APPROVAL;
    } else if (lower.includes("reject") || lower.includes("decline")) {
      triggerAction = WorkflowTriggerAction.ON_REJECTION;
    } else if (lower.includes("update") || lower.includes("modify")) {
      triggerAction = WorkflowTriggerAction.ON_UPDATE;
    }

    // 3. Detect department scope
    let departmentScope = "ALL";
    const depts = ["Sales", "Operations", "HR", "IT", "Legal", "Account", "Quality"];
    for (const d of depts) {
      if (lower.includes(d.toLowerCase())) {
        departmentScope = d;
        break;
      }
    }

    // 4. Detect Intimation Recipients
    const intimationRecipients: string[] = [];
    if (lower.includes("inform tl") || lower.includes("notify tl") || lower.includes("cc tl") || lower.includes("lead")) {
      intimationRecipients.push("REPORTING_TL");
    }
    if (lower.includes("inform hod") || lower.includes("notify hod") || lower.includes("cc hod") || lower.includes("head")) {
      intimationRecipients.push("DEPT_HOD");
    }
    if (lower.includes("inform hr") || lower.includes("notify hr") || lower.includes("cc hr") || intimationRecipients.length === 0) {
      intimationRecipients.push("HR_ADMIN");
    }

    // 5. Detect Approvers
    const steps: { stepOrder: number; approverRole: string; isMandatory: boolean }[] = [];
    if (lower.includes("tl then hr") || lower.includes("team leader then hr") || lower.includes("2-tier") || lower.includes("two tier")) {
      steps.push({ stepOrder: 1, approverRole: "REPORTING_TL", isMandatory: true });
      steps.push({ stepOrder: 2, approverRole: "HR_ADMIN", isMandatory: true });
    } else if (lower.includes("hod") && lower.includes("hr")) {
      steps.push({ stepOrder: 1, approverRole: "DEPT_HOD", isMandatory: true });
      steps.push({ stepOrder: 2, approverRole: "HR_ADMIN", isMandatory: true });
    } else if (lower.includes("hod")) {
      steps.push({ stepOrder: 1, approverRole: "DEPT_HOD", isMandatory: true });
    } else if (lower.includes("tl") || lower.includes("team leader")) {
      steps.push({ stepOrder: 1, approverRole: "REPORTING_TL", isMandatory: true });
    } else {
      steps.push({ stepOrder: 1, approverRole: "HR_ADMIN", isMandatory: true });
    }

    const suggestedName = `${departmentScope} ${module.replace(/_/g, " ")} Automation Rule`;

    return {
      success: true,
      data: {
        suggestedName,
        module,
        triggerAction,
        departmentScope,
        intimationRecipients,
        steps,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI translation failed.",
    };
  }
}
