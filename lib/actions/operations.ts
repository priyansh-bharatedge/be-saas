"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope } from "@/lib/auth/crm-scope";
import {
  operationFormSchema,
  qualityAuditSchema,
  OperationFormData,
  QualityAuditFormData,
  SerializedOperation,
  OperationMasterData,
} from "@/lib/validations/operation";
import {
  OperationStage,
  Prisma,
  NotificationType,
  DealStage,
} from "@prisma/client";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Retrieves child operations with 3-tab filtering for Quality and role-based assignment visibility
 */
export async function getOperationsAction(params: {
  tab?: "ALL" | "COMPLETED" | "PENDING";
  teamType?: string;
  search?: string;
} = {}): Promise<
  ActionResult<{
    operations: SerializedOperation[];
    isOperationHod: boolean;
    isOperationTl: boolean;
    isQualityUser: boolean;
    canManageAll: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = user.department?.toLowerCase() || "";
    const isQualityUser = userDept === "quality" || scope.canManageAll;
    const isOperationHod =
      (userDept === "operation" && user.systemRole === "ADMIN_HOD") ||
      scope.canManageAll;
    const isOperationTl =
      userDept === "operation" &&
      (user.systemRole === "TEAM_LEADER" || user.systemRole === "ADMIN_HOD");

    const { tab = "ALL", teamType = "ALL", search = "" } = params;

    const where: Prisma.InternalOperationWhereInput = {};

    // Dynamic Tab filtering (Quality & Operations view)
    if (tab === "COMPLETED") {
      where.stage = OperationStage.QUALITY;
    } else if (tab === "PENDING") {
      where.stage = OperationStage.OPERATION;
    }

    // Team Type filter
    if (teamType && teamType !== "ALL") {
      where.teamType = teamType;
    }

    // RBAC Scoping
    // - Quality, Operation HOD, and SuperAdmin see all operations
    // - Operation TL sees all operations where assignedTlId === user.id or team member operations
    // - Operation TM sees only operations where assignedTmId === user.id
    if (!isQualityUser && !isOperationHod && !scope.canViewAll) {
      if (isOperationTl) {
        where.OR = [
          { assignedTlId: user.id },
          { assignedTm: { reportingManagerId: user.id } },
        ];
      } else {
        where.assignedTmId = user.id;
      }
    }

    // Search query
    if (search.trim()) {
      const q = search.trim();
      const conditions: Prisma.InternalOperationWhereInput[] = [
        { operationNumber: { contains: q, mode: "insensitive" } },
        { serviceName: { contains: q, mode: "insensitive" } },
        { deal: { dealNumber: { contains: q, mode: "insensitive" } } },
        { deal: { companyName: { contains: q, mode: "insensitive" } } },
        { deal: { contactName: { contains: q, mode: "insensitive" } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: conditions }];
      } else {
        where.OR = conditions;
      }
    }

    const records = await db.internalOperation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          select: {
            id: true,
            dealNumber: true,
            title: true,
            contactName: true,
            contactPhone: true,
            companyName: true,
            bookingDate: true,
            createdAt: true,
          },
        },
        assignedTl: { select: { firstName: true, lastName: true } },
        assignedTm: { select: { firstName: true, lastName: true } },
      },
    });

    const serialized: SerializedOperation[] = records.map((r) => ({
      id: r.id,
      operationNumber: r.operationNumber,
      dealId: r.dealId,
      dealNumber: r.deal.dealNumber || "DL-0000",
      dealTitle: r.deal.title,
      clientName: r.deal.contactName || "Client",
      clientPhone: r.deal.contactPhone || "",
      companyName: r.deal.companyName,
      bookingDate: r.deal.bookingDate
        ? r.deal.bookingDate.toISOString().split("T")[0]
        : r.deal.createdAt.toISOString().split("T")[0],

      dealServiceId: r.dealServiceId,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      teamType: r.teamType,

      stage: r.stage,
      internalStage: r.internalStage,
      status: r.status,

      assignedTlId: r.assignedTlId,
      assignedTlName: r.assignedTl
        ? `${r.assignedTl.firstName} ${r.assignedTl.lastName}`.trim()
        : null,
      assignedTmId: r.assignedTmId,
      assignedTmName: r.assignedTm
        ? `${r.assignedTm.firstName} ${r.assignedTm.lastName}`.trim()
        : null,

      workflowData: (r.workflowData as Record<string, any>) || {},
      qualityScore: r.qualityScore,
      qualityFeedback: r.qualityFeedback,
      dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
      completionDate: r.completionDate ? r.completionDate.toISOString() : null,

      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        operations: serialized,
        isOperationHod,
        isOperationTl,
        isQualityUser,
        canManageAll: scope.canManageAll,
      },
    };
  } catch (error: any) {
    console.error("[getOperationsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load operations." };
  }
}

/**
 * Auto-Spawns 1 Child InternalOperation per service item in the Parent Deal
 */
export async function autoSpawnDealOperationsAction(
  dealId: string
): Promise<ActionResult<{ spawnedCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        services: true,
        internalOperations: true,
      },
    });

    if (!deal) return { success: false, error: "Deal not found." };

    let count = await db.internalOperation.count();
    let spawnedCount = 0;

    for (const s of deal.services) {
      // Check if child operation already exists for this line-item
      const existing = deal.internalOperations.find(
        (op) => op.dealServiceId === s.id
      );

      if (!existing) {
        count++;
        const operationNumber = `OP-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

        await db.internalOperation.create({
          data: {
            operationNumber,
            dealId: deal.id,
            dealServiceId: s.id,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            teamType: s.teamType || "Team Incorporation",
            stage: OperationStage.OPERATION,
            internalStage: "Initiation",
            status: "IN_PROGRESS",
            workflowData: {
              inclusions: s.remarks || "",
              dealServiceId: s.id,
            },
          },
        });
        spawnedCount++;
      }
    }

    // Notify Operations HOD & TLs
    try {
      const operationLeaders = await db.employee.findMany({
        where: {
          department: "Operation",
          systemRole: { in: ["ADMIN_HOD", "TEAM_LEADER"] },
        },
        select: { id: true },
      });

      if (operationLeaders.length > 0) {
        await db.notification.createMany({
          data: operationLeaders.map((emp) => ({
            recipientId: emp.id,
            title: `New Operations Spawned (${deal.dealNumber})`,
            message: `${spawnedCount} operational execution file(s) auto-spawned for ${deal.companyName}. Please assign Team Leader & TM.`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: "/crm/operations",
          })),
        });
      }
    } catch (notifErr) {
      console.warn("[Auto-Spawn Notification Error]:", notifErr);
    }

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");

    return { success: true, data: { spawnedCount } };
  } catch (error: any) {
    console.error("[autoSpawnDealOperationsAction Error]:", error);
    return { success: false, error: error.message || "Failed to auto-spawn operations." };
  }
}

/**
 * HOD / TL Action: Assigns Team Leader and Team Member to an operation child record
 */
export async function updateOperationAssignmentAction(
  operationId: string,
  assignedTlId?: string,
  assignedTmId?: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const operation = await db.internalOperation.findUnique({
      where: { id: operationId },
      include: { deal: true },
    });

    if (!operation) return { success: false, error: "Operation record not found." };

    await db.internalOperation.update({
      where: { id: operationId },
      data: {
        assignedTlId: assignedTlId || null,
        assignedTmId: assignedTmId || null,
      },
    });

    // Notify assigned TM
    if (assignedTmId) {
      try {
        await db.notification.create({
          data: {
            recipientId: assignedTmId,
            title: `Assigned to Operation ${operation.operationNumber}`,
            message: `You have been assigned to ${operation.serviceName} for ${operation.deal.companyName} (${operation.teamType}).`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: "/crm/operations",
          },
        });
      } catch (err) {
        console.warn("[Operation TM Notification Error]:", err);
      }
    }

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update operation assignment." };
  }
}

/**
 * TM / TL Action: Updates operation stage, workflow data, and completion timestamps
 */
export async function updateOperationWorkflowAction(
  operationId: string,
  raw: OperationFormData
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = operationFormSchema.parse(raw);

    await db.internalOperation.update({
      where: { id: operationId },
      data: {
        assignedTlId: parsed.assignedTlId || null,
        assignedTmId: parsed.assignedTmId || null,
        internalStage: parsed.internalStage,
        status: parsed.status,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        completionDate: parsed.completionDate ? new Date(parsed.completionDate) : null,
        workflowData: parsed.workflowData,
        qualityFeedback: parsed.qualityFeedback || null,
      },
    });

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update workflow." };
  }
}

/**
 * TM / TL Action: Sends Operation child record to Quality.
 * Automatic Parent Roll-Up: If ALL sibling child records for the Parent Deal reach Quality,
 * automatically updates the Parent Deal's stage/status to QUALITY!
 */
export async function sendOperationToQualityAction(
  operationId: string
): Promise<ActionResult<{ rolledUpToParent: boolean }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const operation = await db.internalOperation.findUnique({
      where: { id: operationId },
      include: { deal: true },
    });

    if (!operation) return { success: false, error: "Operation record not found." };

    // 1. Advance child record stage to QUALITY
    await db.internalOperation.update({
      where: { id: operationId },
      data: {
        stage: OperationStage.QUALITY,
        internalStage: "Completed — Ready for Quality Audit",
        completionDate: new Date(),
      },
    });

    // 2. Parent Deal Roll-Up Check
    // Query all sibling child records for this Parent Deal
    const siblingOperations = await db.internalOperation.findMany({
      where: { dealId: operation.dealId },
    });

    // Check if ALL sibling operations are now in QUALITY stage
    const allInQuality = siblingOperations.every(
      (op) => op.id === operationId || op.stage === OperationStage.QUALITY
    );

    let rolledUpToParent = false;

    if (allInQuality) {
      // Automatically roll up the Parent Deal to Quality!
      await db.deal.update({
        where: { id: operation.dealId },
        data: {
          accountsStatus: "QUALITY",
          isQualityPassed: false,
        },
      });

      rolledUpToParent = true;

      // Notify Quality Department
      try {
        const qualityAuditors = await db.employee.findMany({
          where: {
            OR: [
              { department: "Quality" },
              { role: "Admin" },
            ],
          },
          select: { id: true },
        });

        if (qualityAuditors.length > 0) {
          await db.notification.createMany({
            data: qualityAuditors.map((auditor) => ({
              recipientId: auditor.id,
              title: `Parent Deal Rolled Up to Quality (${operation.deal.dealNumber})`,
              message: `All ${siblingOperations.length} service operations for ${operation.deal.companyName} have passed execution! Deal is ready for comprehensive quality certification.`,
              type: NotificationType.ACTION_REQUIRED,
              actionUrl: "/crm/operations?tab=COMPLETED",
            })),
          });
        }
      } catch (notifErr) {
        console.warn("[Parent Roll-up Notification Error]:", notifErr);
      }
    }

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");

    return { success: true, data: { rolledUpToParent } };
  } catch (error: any) {
    console.error("[sendOperationToQualityAction Error]:", error);
    return { success: false, error: error.message || "Failed to submit to quality." };
  }
}

/**
 * Quality Auditor Action: Evaluates operation with score and approves or sends back to Operations
 */
export async function qualityAuditOperationAction(
  operationId: string,
  raw: QualityAuditFormData
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = qualityAuditSchema.parse(raw);

    const operation = await db.internalOperation.findUnique({
      where: { id: operationId },
      include: { deal: true },
    });

    if (!operation) return { success: false, error: "Operation not found." };

    if (parsed.decision === "APPROVE") {
      // Mark approved
      await db.internalOperation.update({
        where: { id: operationId },
        data: {
          qualityScore: parsed.qualityScore,
          qualityFeedback: parsed.qualityFeedback,
          status: "COMPLETED",
        },
      });

      // Check if all sibling operations are completed & passed
      const siblings = await db.internalOperation.findMany({
        where: { dealId: operation.dealId },
      });

      const allApproved = siblings.every(
        (s) => s.id === operationId || s.status === "COMPLETED"
      );

      if (allApproved) {
        await db.deal.update({
          where: { id: operation.dealId },
          data: {
            isQualityPassed: true,
            qualityRemarks: `Quality Audit Passed with Score ${parsed.qualityScore}/100.`,
            stage: DealStage.CLOSED_WON,
          },
        });
      }
    } else {
      // Send back to Operations TM with feedback
      await db.internalOperation.update({
        where: { id: operationId },
        data: {
          stage: OperationStage.OPERATION,
          internalStage: "Correction / Revision Required",
          status: "REJECTED",
          qualityScore: parsed.qualityScore,
          qualityFeedback: `[Quality Revision Required]: ${parsed.qualityFeedback}`,
        },
      });

      // Rollback Parent Deal accountsStatus to SENT_TO_OPERATION
      await db.deal.update({
        where: { id: operation.dealId },
        data: {
          accountsStatus: "SENT_TO_OPERATION",
          isQualityPassed: false,
        },
      });

      // Notify TM & TL
      const recipients = [operation.assignedTmId, operation.assignedTlId].filter(
        (id): id is string => Boolean(id)
      );

      if (recipients.length > 0) {
        await db.notification.createMany({
          data: recipients.map((rId) => ({
            recipientId: rId,
            title: `Quality Audit Revision: ${operation.operationNumber}`,
            message: `Quality audit failed (Score ${parsed.qualityScore}/100): ${parsed.qualityFeedback}. Returned for correction.`,
            type: NotificationType.WARNING,
            actionUrl: "/crm/operations",
          })),
        });
      }
    }

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to process quality audit." };
  }
}

/**
 * Bulk upload operations
 */
export async function bulkUploadOperationsAction(
  rows: any[]
): Promise<ActionResult<{ insertedCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let count = await db.internalOperation.count();
    let inserted = 0;

    for (const r of rows) {
      if (!r.dealId || !r.serviceName) continue;

      count++;
      const operationNumber = `OP-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

      await db.internalOperation.create({
        data: {
          operationNumber,
          dealId: r.dealId,
          serviceName: r.serviceName,
          teamType: r.teamType || "Team Incorporation",
          stage: OperationStage.OPERATION,
          internalStage: r.internalStage || "Initiation",
          status: "IN_PROGRESS",
          workflowData: r.workflowData || {},
        },
      });
      inserted++;
    }

    revalidatePath("/crm/operations");
    return { success: true, data: { insertedCount: inserted } };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

/**
 * Fetches Team Leaders, Team Members, and Quality Auditors for assignment lookups
 */
export async function getOperationMasterDataAction(): Promise<
  ActionResult<OperationMasterData>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const [operationStaff, qualityStaff] = await Promise.all([
      db.employee.findMany({
        where: {
          department: "Operation",
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          systemRole: true,
          reportingManagerId: true,
        },
        orderBy: { firstName: "asc" },
      }),
      db.employee.findMany({
        where: {
          department: "Quality",
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    const teamLeaders = operationStaff
      .filter((e) => e.systemRole === "TEAM_LEADER" || e.systemRole === "ADMIN_HOD")
      .map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        department: e.department,
      }));

    const teamMembers = operationStaff
      .filter((e) => e.systemRole === "TEAM_MEMBER" || e.systemRole === "TEAM_LEADER")
      .map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        department: e.department,
        reportingManagerId: e.reportingManagerId,
      }));

    const qualityAuditors = qualityStaff.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      department: e.department,
    }));

    return {
      success: true,
      data: {
        teamLeaders,
        teamMembers,
        qualityAuditors,
      },
    };
  } catch (error: any) {
    console.error("[getOperationMasterDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load operations master data." };
  }
}
