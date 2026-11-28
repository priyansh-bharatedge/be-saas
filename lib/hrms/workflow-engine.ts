import { db } from "@/lib/db";
import {
  HrmsWorkflowModule,
  WorkflowTriggerAction,
  NotificationType,
  SystemRole,
  Role,
} from "@prisma/client";
import { createNotification } from "@/lib/actions/notifications";

export interface EvaluateWorkflowParams {
  module: HrmsWorkflowModule;
  triggerAction: WorkflowTriggerAction;
  recordId: string;
  employeeId: string;
  department?: string;
  title?: string;
  amount?: number;
  details?: string;
}

export interface WorkflowEvaluationResult {
  hasCustomWorkflow: boolean;
  workflowId?: string;
  workflowName?: string;
  stepOrder?: number;
  approverId?: string | null;
  approverRole?: string;
  intimationRecipientIds: string[];
}

/**
 * Resolves person(s) based on keyword ("REPORTING_TL", "DEPT_HOD", "HR_ADMIN", or employee UUID)
 */
async function resolveRecipientIds(
  keyword: string,
  employee: {
    id: string;
    department: string;
    teamLeaderId: string | null;
    reportingManagerId: string | null;
  }
): Promise<string[]> {
  const normalized = (keyword || "").trim();
  if (!normalized) return [];

  // Direct UUID match
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      normalized
    )
  ) {
    return [normalized];
  }

  const upper = normalized.toUpperCase();

  if (upper === "REPORTING_TL" || upper === "TEAM_LEADER") {
    const tlId = employee.teamLeaderId || employee.reportingManagerId;
    return tlId ? [tlId] : [];
  }

  if (upper === "DEPT_HOD" || upper === "HOD") {
    const hod = await db.employee.findFirst({
      where: {
        department: { equals: employee.department, mode: "insensitive" },
        systemRole: SystemRole.ADMIN_HOD,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return hod ? [hod.id] : [];
  }

  if (upper === "HR_ADMIN" || upper === "HR") {
    const hrAdmins = await db.employee.findMany({
      where: {
        OR: [
          { systemRole: SystemRole.HR_ADMIN },
          { systemRole: SystemRole.SUPER_ADMIN },
          { role: Role.Admin },
        ],
        status: "ACTIVE",
      },
      select: { id: true },
    });
    return hrAdmins.map((h) => h.id);
  }

  return [];
}

/**
 * Evaluates active workflows for a given module & action.
 * Dispatches notifications to Intimation Persons and routes to Approver Step 1.
 */
export async function evaluateHrmsWorkflow(
  params: EvaluateWorkflowParams
): Promise<WorkflowEvaluationResult> {
  try {
    const {
      module,
      triggerAction,
      recordId,
      employeeId,
      department: explicitDept,
      title,
      details,
    } = params;

    // Fetch employee details to resolve hierarchy
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        department: true,
        teamLeaderId: true,
        reportingManagerId: true,
      },
    });

    if (!employee) {
      return { hasCustomWorkflow: false, intimationRecipientIds: [] };
    }

    const dept = explicitDept || employee.department;

    // Lookup active workflows matching module & triggerAction
    // Priority: Specific Department > "ALL"
    const matchingWorkflows = await db.hrmsWorkflow.findMany({
      where: {
        module,
        triggerAction,
        isActive: true,
        OR: [
          { departmentScope: "ALL" },
          { departmentScope: { equals: dept, mode: "insensitive" } },
        ],
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Prefer specific department workflow over "ALL"
    const workflow =
      matchingWorkflows.find(
        (w) => w.departmentScope.toUpperCase() !== "ALL"
      ) || matchingWorkflows[0];

    if (!workflow) {
      return { hasCustomWorkflow: false, intimationRecipientIds: [] };
    }

    const employeeFullName = `${employee.firstName} ${employee.lastName}`;
    const intimationRecipientIds: string[] = [];

    // 1. Process Intimation Recipients (Read visibility / keep in the loop)
    let intimationList: string[] = [];
    if (Array.isArray(workflow.intimationRecipients)) {
      intimationList = workflow.intimationRecipients as string[];
    } else if (typeof workflow.intimationRecipients === "string") {
      try {
        intimationList = JSON.parse(workflow.intimationRecipients);
      } catch {
        intimationList = [workflow.intimationRecipients];
      }
    }

    for (const recipientKey of intimationList) {
      const resolvedIds = await resolveRecipientIds(recipientKey, employee);
      for (const id of resolvedIds) {
        if (id !== employeeId && !intimationRecipientIds.includes(id)) {
          intimationRecipientIds.push(id);
        }
      }
    }

    // Fire intimation notifications
    for (const recipientId of intimationRecipientIds) {
      await createNotification({
        recipientUserId: recipientId,
        title: `[Intimation] ${title || `${workflow.name} Notification`}`,
        message: `${employeeFullName} (${dept}) triggered ${module.replace(
          "_",
          " "
        )}. ${details || ""}`,
        type: NotificationType.INFO,
        actionUrl: getModuleActionUrl(module),
      });

      // Log intimation in workflow log
      await db.hrmsWorkflowLog.create({
        data: {
          workflowId: workflow.id,
          recordId,
          module,
          action: "INTIMATION_SENT",
          actorId: employeeId,
          recipientId,
          details: `Intimation sent to user ${recipientId}`,
        },
      });
    }

    // 2. Resolve Step 1 Approver
    let approverId: string | null = null;
    let approverRole = "HR_ADMIN";
    let stepOrder = 1;

    if (workflow.steps && workflow.steps.length > 0) {
      const firstStep = workflow.steps[0];
      stepOrder = firstStep.stepOrder;
      approverRole = firstStep.approverRole;

      if (firstStep.approverId) {
        approverId = firstStep.approverId;
      } else {
        const resolved = await resolveRecipientIds(
          firstStep.approverRole,
          employee
        );
        approverId = resolved[0] || null;
      }
    } else if (Array.isArray(workflow.approvers) && workflow.approvers.length > 0) {
      const firstApproverObj = workflow.approvers[0] as any;
      const roleStr = typeof firstApproverObj === "string" ? firstApproverObj : firstApproverObj.role || "HR_ADMIN";
      approverRole = roleStr;
      const resolved = await resolveRecipientIds(roleStr, employee);
      approverId = resolved[0] || null;
    }

    // Notify Approver
    if (approverId) {
      await createNotification({
        recipientUserId: approverId,
        title: `[Action Required] Approval Needed: ${module.replace("_", " ")}`,
        message: `${employeeFullName} submitted a ${module.replace(
          "_",
          " "
        )} request. Awaiting your approval (${approverRole}).`,
        type: NotificationType.ACTION_REQUIRED,
        actionUrl: getModuleActionUrl(module),
      });

      await db.hrmsWorkflowLog.create({
        data: {
          workflowId: workflow.id,
          recordId,
          module,
          action: "APPROVAL_REQUESTED",
          actorId: employeeId,
          recipientId: approverId,
          details: `Step ${stepOrder} assigned to ${approverRole}`,
        },
      });
    }

    return {
      hasCustomWorkflow: true,
      workflowId: workflow.id,
      workflowName: workflow.name,
      stepOrder,
      approverId,
      approverRole,
      intimationRecipientIds,
    };
  } catch (error) {
    console.error("[evaluateHrmsWorkflow Error]:", error);
    return { hasCustomWorkflow: false, intimationRecipientIds: [] };
  }
}

function getModuleActionUrl(module: HrmsWorkflowModule): string {
  switch (module) {
    case HrmsWorkflowModule.LEAVE:
      return "/hrms/leave";
    case HrmsWorkflowModule.ATTENDANCE_REGULARIZATION:
      return "/hrms/attendance";
    case HrmsWorkflowModule.REIMBURSEMENT:
      return "/hrms/reimbursements";
    case HrmsWorkflowModule.RESIGNATION:
      return "/hrms/resignations";
    case HrmsWorkflowModule.PERFORMANCE:
      return "/hrms/performance";
    case HrmsWorkflowModule.PAYROLL:
      return "/hrms/payroll";
    case HrmsWorkflowModule.HELPDESK:
      return "/hrms/helpdesk";
    case HrmsWorkflowModule.SURVEY:
      return "/hrms/surveys";
    case HrmsWorkflowModule.ONBOARDING_EXIT:
      return "/hrms/lifecycle";
    default:
      return "/hrms";
  }
}
