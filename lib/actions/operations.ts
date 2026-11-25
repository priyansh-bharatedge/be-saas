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
  EmployeeLookupItem,
  normalizeTeamType,
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
 * Extracts all employee IDs referenced in workflow data (stage Name fields, social calendar, etc.)
 */
function extractEmployeeIdsFromWorkflow(
  workflowData: Record<string, any> | null | undefined,
  extraIds: (string | null | undefined)[]
): string[] {
  const ids = new Set<string>();

  extraIds.forEach((id) => {
    if (id && typeof id === "string" && id.trim()) {
      ids.add(id.trim());
    }
  });

  if (!workflowData || typeof workflowData !== "object") {
    return Array.from(ids);
  }

  // Helper recursive extraction
  function scan(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((item) => scan(item));
      return;
    }

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (
        (key === "employeeId" || key === "assignedEmployeeId" || key === "nameEmployeeId") &&
        typeof val === "string" &&
        val.trim()
      ) {
        ids.add(val.trim());
      } else if (typeof val === "object") {
        scan(val);
      }
    }
  }

  scan(workflowData);
  return Array.from(ids);
}

/**
 * Retrieves child operations with 3-tab filtering, dynamic filters, and strict assignment RBAC
 */
export async function getOperationsAction(params: {
  tab?: "ALL" | "COMPLETED" | "PENDING";
  teamType?: string;
  stage?: string;
  companyType?: string;
  assignedTlId?: string;
  assignedTmId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
} = {}): Promise<
  ActionResult<{
    operations: SerializedOperation[];
    isOperationHod: boolean;
    isOperationTl: boolean;
    isQualityUser: boolean;
    isLegalUser: boolean;
    canManageAll: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = (user.department || "").toLowerCase().trim();
    const isSuperAdmin = user.role === "Admin" || user.systemRole === "SUPER_ADMIN";
    const isQualityUser = userDept === "quality" || isSuperAdmin;
    const isLegalUser = userDept === "legal" || isSuperAdmin;
    const isOperationHod =
      (userDept === "operation" && user.systemRole === "ADMIN_HOD") || isSuperAdmin;
    const isOperationTl =
      userDept === "operation" &&
      (user.systemRole === "TEAM_LEADER" || user.systemRole === "ADMIN_HOD");

    const {
      tab = "ALL",
      teamType = "ALL",
      stage = "ALL",
      companyType = "ALL",
      assignedTlId,
      assignedTmId,
      dateFrom,
      dateTo,
      search = "",
    } = params;

    const where: Prisma.InternalOperationWhereInput = {};

    // 1. Dynamic Tab filtering (Quality & Operations view)
    if (tab === "COMPLETED") {
      where.stage = OperationStage.QUALITY;
    } else if (tab === "PENDING") {
      where.stage = OperationStage.OPERATION;
    }

    // 2. Team Type filter
    if (teamType && teamType !== "ALL") {
      where.teamType = { contains: teamType.replace(/^Team\s+/i, ""), mode: "insensitive" };
    }

    // 3. Stage dropdown filter
    if (stage && stage !== "ALL") {
      where.internalStage = stage;
    }

    // 4. Assigned TL / TM filters
    if (assignedTlId && assignedTlId !== "ALL") {
      where.assignedTlId = assignedTlId;
    }
    if (assignedTmId && assignedTmId !== "ALL") {
      where.assignedTmId = assignedTmId;
    }

    // 5. Date Range Filter (Booking date or Creation date)
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    // 6. Strict RBAC Visibility Rules:
    // - Operation HOD, SUPER_ADMIN, Quality, and Legal (read-view) can see all records
    // - Assigned employees (TL, TM, CA/CS 1, CA/CS 2, or anyone in assignedEmployeeIds): see only assigned records
    if (!isSuperAdmin && !isOperationHod && !isQualityUser && !isLegalUser) {
      if (isOperationTl) {
        where.OR = [
          { assignedTlId: user.id },
          { assignedTmId: user.id },
          { caCs1Id: user.id },
          { caCs2Id: user.id },
          { assignedEmployeeIds: { has: user.id } },
          { assignedTm: { reportingManagerId: user.id } },
        ];
      } else {
        where.OR = [
          { assignedTmId: user.id },
          { assignedTlId: user.id },
          { caCs1Id: user.id },
          { caCs2Id: user.id },
          { assignedEmployeeIds: { has: user.id } },
        ];
      }
    }

    // 7. Search query
    if (search.trim()) {
      const q = search.trim();
      const searchConditions: Prisma.InternalOperationWhereInput[] = [
        { operationNumber: { contains: q, mode: "insensitive" } },
        { serviceName: { contains: q, mode: "insensitive" } },
        { deal: { dealNumber: { contains: q, mode: "insensitive" } } },
        { deal: { companyName: { contains: q, mode: "insensitive" } } },
        { deal: { contactName: { contains: q, mode: "insensitive" } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: searchConditions }];
      } else {
        where.OR = searchConditions;
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
            contactEmail: true,
            companyName: true,
            bookingDate: true,
            totalValue: true,
            value: true,
            createdAt: true,
          },
        },
        assignedTl: { select: { id: true, firstName: true, lastName: true } },
        assignedTm: { select: { id: true, firstName: true, lastName: true } },
        caCs1: { select: { id: true, firstName: true, lastName: true } },
        caCs2: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Optional companyType in-memory filter if not on deal query
    let filteredRecords = records;
    if (companyType && companyType !== "ALL") {
      filteredRecords = records.filter(
        (r) =>
          (r.workflowData as any)?.companyType?.toLowerCase() === companyType.toLowerCase()
      );
    }

    const serialized: SerializedOperation[] = filteredRecords.map((r) => {
      const dealVal = r.deal.totalValue ? Number(r.deal.totalValue) : Number(r.deal.value || 0);

      return {
        id: r.id,
        operationNumber: r.operationNumber,
        dealId: r.dealId,
        dealNumber: r.deal.dealNumber || "DL-0000",
        dealTitle: r.deal.title,
        clientName: r.deal.contactName || "Client",
        clientPhone: r.deal.contactPhone || "",
        clientEmail: r.deal.contactEmail || null,
        companyName: r.deal.companyName,
        companyType: (r.workflowData as any)?.companyType || null,
        bookingDate: r.deal.bookingDate
          ? r.deal.bookingDate.toISOString().split("T")[0]
          : r.deal.createdAt.toISOString().split("T")[0],
        dealValue: dealVal,

        dealServiceId: r.dealServiceId,
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        teamType: normalizeTeamType(r.teamType),

        stage: r.stage,
        internalStage: r.internalStage || "Doc Collection",
        status: r.status,

        assignedTlId: r.assignedTlId,
        assignedTlName: r.assignedTl
          ? `${r.assignedTl.firstName} ${r.assignedTl.lastName}`.trim()
          : null,
        assignedTmId: r.assignedTmId,
        assignedTmName: r.assignedTm
          ? `${r.assignedTm.firstName} ${r.assignedTm.lastName}`.trim()
          : null,
        caCs1Id: r.caCs1Id,
        caCs1Name: r.caCs1
          ? `${r.caCs1.firstName} ${r.caCs1.lastName}`.trim()
          : null,
        caCs2Id: r.caCs2Id,
        caCs2Name: r.caCs2
          ? `${r.caCs2.firstName} ${r.caCs2.lastName}`.trim()
          : null,
        assignedEmployeeIds: r.assignedEmployeeIds || [],

        workflowData: (r.workflowData as Record<string, any>) || {},
        qualityScore: r.qualityScore,
        qualityFeedback: r.qualityFeedback,
        dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
        completionDate: r.completionDate ? r.completionDate.toISOString() : null,

        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        operations: serialized,
        isOperationHod,
        isOperationTl,
        isQualityUser,
        isLegalUser,
        canManageAll: isSuperAdmin || isOperationHod,
      },
    };
  } catch (error: any) {
    console.error("[getOperationsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load operations." };
  }
}

/**
 * Auto-Spawns 1 Child InternalOperation per service item in the Parent Deal.
 * Sets inherited Team Type and initializes structured workflow data.
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

      const normalizedTeam = normalizeTeamType(s.teamType);

      if (!existing) {
        count++;
        const operationNumber = `OP-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

        // Initialize clean default workflow data per team type
        const initialWorkflowData: Record<string, any> = {
          companyType: (deal as any).companyType || "PVT LTD",
          afterAllocation: "No",
          dealServiceId: s.id,
        };

        if (normalizedTeam === "Incorporation") {
          initialWorkflowData.docCollection = { status: "Pending" };
          initialWorkflowData.nameApplication = { status: "In-process", resubmissions: [] };
          initialWorkflowData.dscCreation = { status: "Pending" };
          initialWorkflowData.finalFiling = { status: "Pending", resubmissions: [] };
        } else if (normalizedTeam === "Compliance") {
          initialWorkflowData.docCollection = { status: "Pending" };
          initialWorkflowData.directorItr = { status: "Pending", fileRequired: "Yes", docCollection: "No" };
          initialWorkflowData.accounting = { status: "Pending", docCollection: "Pending" };
          initialWorkflowData.audit = { status: "Pending", docCollection: "Pending" };
          initialWorkflowData.companyItr = { status: "Pending", document: "Yes" };
        } else if (normalizedTeam === "Funding") {
          initialWorkflowData.dprPitchDeck = { status: "In-process" };
          initialWorkflowData.finance = { status: "Pending" };
          initialWorkflowData.applicationSubmission = { status: "Pending" };
        } else if (normalizedTeam === "Certification") {
          initialWorkflowData.docCollectionDsc = { status: "Pending" };
          initialWorkflowData.finalApplication = { status: "Pending" };
        } else if (normalizedTeam === "Digital Marketing") {
          initialWorkflowData.serviceScope = { status: "In-process", serviceTrack: "Website" };
          initialWorkflowData.executionTracker = { status: "Pending" };
          initialWorkflowData.socialMediaCalendar = [];
        }

        await db.internalOperation.create({
          data: {
            operationNumber,
            dealId: deal.id,
            dealServiceId: s.id,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            teamType: normalizedTeam,
            stage: OperationStage.OPERATION,
            internalStage: "Doc Collection",
            status: "In-process",
            assignedEmployeeIds: [],
            workflowData: initialWorkflowData,
          },
        });
        spawnedCount++;
      } else {
        // Sync team type if modified in Legal
        if (existing.teamType !== normalizedTeam) {
          await db.internalOperation.update({
            where: { id: existing.id },
            data: { teamType: normalizedTeam },
          });
        }
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

      if (operationLeaders.length > 0 && spawnedCount > 0) {
        await db.notification.createMany({
          data: operationLeaders.map((emp) => ({
            recipientId: emp.id,
            title: `New Operations Spawned (${deal.dealNumber})`,
            message: `${spawnedCount} operational execution file(s) spawned for ${deal.companyName}. Please assign Team Leader & TM.`,
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
 * HOD / TL Action: Assigns TL, TM, and CA/CS 1 & 2 to an operation child record.
 * Automatically sends notifications and updates assignedEmployeeIds.
 */
export async function updateOperationAssignmentAction(
  operationId: string,
  assignedTlId?: string,
  assignedTmId?: string,
  caCs1Id?: string,
  caCs2Id?: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const operation = await db.internalOperation.findUnique({
      where: { id: operationId },
      include: { deal: true },
    });

    if (!operation) return { success: false, error: "Operation record not found." };

    // Recompute assignedEmployeeIds
    const allAssigned = extractEmployeeIdsFromWorkflow(
      operation.workflowData as any,
      [assignedTlId, assignedTmId, caCs1Id, caCs2Id]
    );

    await db.internalOperation.update({
      where: { id: operationId },
      data: {
        assignedTlId: assignedTlId || null,
        assignedTmId: assignedTmId || null,
        caCs1Id: caCs1Id || null,
        caCs2Id: caCs2Id || null,
        assignedEmployeeIds: allAssigned,
      },
    });

    // Notify newly assigned personnel
    const newAssignments: { id: string; roleName: string }[] = [];
    if (assignedTlId && assignedTlId !== operation.assignedTlId) {
      newAssignments.push({ id: assignedTlId, roleName: "Team Leader" });
    }
    if (assignedTmId && assignedTmId !== operation.assignedTmId) {
      newAssignments.push({ id: assignedTmId, roleName: "Team Member" });
    }
    if (caCs1Id && caCs1Id !== operation.caCs1Id) {
      newAssignments.push({ id: caCs1Id, roleName: "CA / CS 1" });
    }
    if (caCs2Id && caCs2Id !== operation.caCs2Id) {
      newAssignments.push({ id: caCs2Id, roleName: "CA / CS 2" });
    }

    for (const a of newAssignments) {
      try {
        await db.notification.create({
          data: {
            recipientId: a.id,
            title: `Assigned as ${a.roleName} (${operation.operationNumber})`,
            message: `You have been assigned as ${a.roleName} for ${operation.serviceName} (${operation.teamType}) under ${operation.deal.companyName}.`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: `/crm/operations?op=${operation.operationNumber}`,
          },
        });
      } catch (err) {
        console.warn("[Operation Assignment Notification Error]:", err);
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
 * TM / TL Action: Updates operation stage, workflow data, and completion timestamps.
 * Server-Enforces RBAC: unassigned staff cannot modify child records.
 * Syncs assignedEmployeeIds across every stage's Name employee selector.
 */
export async function updateOperationWorkflowAction(
  operationId: string,
  raw: OperationFormData
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = operationFormSchema.parse(raw);

    const operation = await db.internalOperation.findUnique({
      where: { id: operationId },
      include: { deal: true },
    });

    if (!operation) return { success: false, error: "Operation record not found." };

    const isSuperAdmin = user.role === "Admin" || user.systemRole === "SUPER_ADMIN";
    const isOperationHod =
      (user.department?.toLowerCase().includes("operation") && user.systemRole === "ADMIN_HOD") ||
      isSuperAdmin;

    const isAssigned =
      operation.assignedTlId === user.id ||
      operation.assignedTmId === user.id ||
      operation.caCs1Id === user.id ||
      operation.caCs2Id === user.id ||
      operation.assignedEmployeeIds.includes(user.id);

    if (!isSuperAdmin && !isOperationHod && !isAssigned) {
      return { success: false, error: "403 Forbidden: You are not assigned to this operation." };
    }

    // Extract all assigned employee IDs from workflowData + common headers
    const newAssignedEmployeeIds = extractEmployeeIdsFromWorkflow(
      parsed.workflowData,
      [parsed.assignedTlId, parsed.assignedTmId, parsed.caCs1Id, parsed.caCs2Id]
    );

    // Identify newly assigned employees to notify
    const existingIds = new Set(operation.assignedEmployeeIds);
    const newlyAddedIds = newAssignedEmployeeIds.filter((id) => !existingIds.has(id) && id !== user.id);

    await db.internalOperation.update({
      where: { id: operationId },
      data: {
        assignedTlId: parsed.assignedTlId || null,
        assignedTmId: parsed.assignedTmId || null,
        caCs1Id: parsed.caCs1Id || null,
        caCs2Id: parsed.caCs2Id || null,
        assignedEmployeeIds: newAssignedEmployeeIds,
        internalStage: parsed.internalStage,
        status: parsed.status,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        completionDate: parsed.completionDate ? new Date(parsed.completionDate) : null,
        workflowData: parsed.workflowData,
        qualityFeedback: parsed.qualityFeedback || null,
      },
    });

    // Send notifications to newly assigned employees
    if (newlyAddedIds.length > 0) {
      try {
        await db.notification.createMany({
          data: newlyAddedIds.map((recId) => ({
            recipientId: recId,
            title: `Assigned to Stage in ${operation.operationNumber}`,
            message: `You have been assigned to an execution workflow step for ${operation.serviceName} (${operation.deal.companyName}).`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: `/crm/operations?op=${operation.operationNumber}`,
          })),
        });
      } catch (err) {
        console.warn("[Stage Assignment Notification Error]:", err);
      }
    }

    revalidatePath("/crm/operations");
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update workflow." };
  }
}

/**
 * TM / TL Action: Sends Operation child record to Quality (Closed Won).
 * Automatic Parent Roll-Up: When ALL child records of a Parent Deal reach Quality,
 * automatically updates the Parent Deal's stage/status to Quality!
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
        internalStage: "Closed Won",
        status: "Approved",
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
          stage: DealStage.CLOSED_WON,
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
              message: `All ${siblingOperations.length} service operations for ${operation.deal.companyName} have completed operational execution! Deal is ready for quality certification.`,
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
          status: "Approved",
          internalStage: "Closed Won",
        },
      });

      // Check if all sibling operations are completed & passed
      const siblings = await db.internalOperation.findMany({
        where: { dealId: operation.dealId },
      });

      const allApproved = siblings.every(
        (s) => s.id === operationId || s.status === "Approved" || s.stage === OperationStage.QUALITY
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
          status: "Hold",
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
          teamType: normalizeTeamType(r.teamType),
          stage: OperationStage.OPERATION,
          internalStage: r.internalStage || "Doc Collection",
          status: "In-process",
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
 * Fetches Team Leaders, Team Members, Quality Auditors, and Unified All-Employees list for lookups
 */
export async function getOperationMasterDataAction(): Promise<
  ActionResult<OperationMasterData>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const [allActiveEmployees, qualityStaff] = await Promise.all([
      db.employee.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
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

    const allEmployees: EmployeeLookupItem[] = allActiveEmployees.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      department: e.department,
      designation: e.designation,
    }));

    const caCsList: EmployeeLookupItem[] = allActiveEmployees
      .filter((e) => {
        const d = (e.designation || "").toLowerCase();
        const dept = (e.department || "").toLowerCase();
        return (
          d.includes("ca") ||
          d.includes("cs") ||
          d.includes("chartered") ||
          d.includes("company secretary") ||
          dept.includes("compliance") ||
          dept.includes("operation") ||
          dept.includes("legal")
        );
      })
      .map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`.trim(),
        department: e.department,
        designation: e.designation,
      }));

    // If caCsList is small, provide allEmployees as fallback
    const effectiveCaCsList = caCsList.length > 0 ? caCsList : allEmployees;

    const operationStaff = allActiveEmployees.filter(
      (e) => e.department.toLowerCase().includes("operation")
    );

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
        allEmployees,
        caCsList: effectiveCaCsList,
      },
    };
  } catch (error: any) {
    console.error("[getOperationMasterDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load operations master data." };
  }
}
