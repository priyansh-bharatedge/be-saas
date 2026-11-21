"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope, canUserModifyRecord } from "@/lib/auth/crm-scope";
import {
  dealFormSchema,
  DealFormData,
  SerializedDeal,
  SerializedDealService,
  SerializedDealDocument,
  DealMasterData,
} from "@/lib/validations/deal";
import { DealStage, LegalStatus, Prisma, NotificationType, SystemRole } from "@prisma/client";
import { autoSpawnDealOperationsAction } from "@/lib/actions/operations";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Retrieves deals scoped by RBAC rules and filtered by stage / accountsStatus
 */
export async function getDealsAction(params: {
  stage?: string;
  accountsStatus?: string;
  search?: string;
} = {}): Promise<
  ActionResult<{
    deals: SerializedDeal[];
    isAccountsUser: boolean;
    isLegalUser: boolean;
    isSalesUser: boolean;
    currentUserDepartment: string;
    canManageAll: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = user.department?.toLowerCase() || "";
    const isAccountsUser = userDept === "account" || userDept === "accounts" || scope.canManageAll;
    const isLegalUser = userDept === "legal" || scope.canManageAll;
    const isSalesUser =
      !scope.canManageAll &&
      user.systemRole !== SystemRole.SUPER_ADMIN &&
      (userDept === "sales" || userDept.includes("sales"));

    const { stage = "ALL", accountsStatus = "ALL", search = "" } = params;

    const where: Prisma.DealWhereInput = {};

    if (stage && stage !== "ALL") {
      where.stage = stage as DealStage;
    }

    if (accountsStatus && accountsStatus !== "ALL") {
      where.accountsStatus = accountsStatus;
    }

    // RBAC Scoping: Sales TMs only see deals where they are primary BDM, partner BDM, or creator
    if (!scope.canViewAll && !isAccountsUser && !isLegalUser && scope.allowedUserIds) {
      where.OR = [
        { assignedEmployeeId: { in: scope.allowedUserIds } },
        { partnerBdmId: { in: scope.allowedUserIds } },
        { client: { createdById: { in: scope.allowedUserIds } } },
      ];
    }

    if (search.trim()) {
      const q = search.trim();
      const conditions: Prisma.DealWhereInput[] = [
        { dealNumber: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactPhone: { contains: q } },
        { companyName: { contains: q, mode: "insensitive" } },
        { panNumber: { contains: q, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: conditions }];
      } else {
        where.OR = conditions;
      }
    }

    const deals = await db.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        company: true,
        assignedEmployee: {
          select: { firstName: true, lastName: true },
        },
        partnerBdm: {
          select: { firstName: true, lastName: true },
        },
        services: {
          include: {
            internalOperation: {
              include: {
                assignedTl: { select: { firstName: true, lastName: true } },
                assignedTm: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        documents: {
          include: {
            uploadedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const serialized: SerializedDeal[] = deals.map((d) => ({
      id: d.id,
      dealNumber: d.dealNumber || "",
      title: d.title,
      bookingDate: d.bookingDate ? d.bookingDate.toISOString().split("T")[0] : d.createdAt.toISOString().split("T")[0],
      value: Number(d.value),
      totalValue: Number(d.totalValue || d.value),
      subTotal: Number(d.subTotal || 0),
      gstAmount: Number(d.gstAmount || 0),
      amountReceived: Number(d.amountReceived || 0),
      amountPending: Number(d.amountPending || 0),
      currency: d.currency,
      stage: d.stage,
      accountsStatus: d.accountsStatus,
      internalLegalStatus: d.internalLegalStatus,
      panNumber: d.panNumber,

      clientId: d.clientId,
      clientName: d.contactName || d.client?.name || "",
      clientPhone: d.contactPhone || d.client?.phone || "",
      clientEmail: d.contactEmail || d.client?.email || null,
      clientAlternatePhone: d.client?.alternatePhone || null,
      clientGender: d.client?.gender || null,
      clientState: d.client?.state || null,
      clientCity: d.client?.city || null,
      clientAddress: d.client?.address || null,

      companyId: d.companyId,
      companyName: d.companyName || d.company?.name || "",
      companyType: d.company?.companyType || null,
      companyIncorporatedDate: d.company?.incorporatedDate
        ? d.company.incorporatedDate.toISOString().split("T")[0]
        : null,
      companyAddress: d.company?.address || null,

      assignedEmployeeId: d.assignedEmployeeId,
      assignedEmployeeName: d.assignedEmployee
        ? `${d.assignedEmployee.firstName} ${d.assignedEmployee.lastName}`.trim()
        : null,
      partnerBdmId: d.partnerBdmId,
      partnerBdmName: d.partnerBdm
        ? `${d.partnerBdm.firstName} ${d.partnerBdm.lastName}`.trim()
        : null,

      paymentScreenshotUrl: d.paymentScreenshotUrl,
      paymentScreenshotKey: d.paymentScreenshotKey,
      agreementTerms: d.agreementTerms,
      legalRemarks: d.legalRemarks,
      legalDocSenderName: d.legalDocSenderName,
      legalDocSenderDate: d.legalDocSenderDate
        ? d.legalDocSenderDate.toISOString().split("T")[0]
        : null,
      legalDocReceiverName: d.legalDocReceiverName,
      legalDocReceiverDate: d.legalDocReceiverDate
        ? d.legalDocReceiverDate.toISOString().split("T")[0]
        : null,
      isQualityPassed: d.isQualityPassed,
      qualityRemarks: d.qualityRemarks,
      notes: d.notes,

      services: d.services.map((s) => ({
        id: s.id,
        dealId: s.dealId,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        minimumPrice: Number(s.minimumPrice || 0),
        outsourceCost: Number(s.outsourceCost || 0),
        totalPrice: Number(s.totalPrice),
        withoutGstAmount: Number(s.withoutGstAmount || 0),
        gstAmount: Number(s.gstAmount),
        amountReceived: Number(s.amountReceived || 0),
        receivedGst: Number(s.receivedGst || 0),
        receivedWithoutGst: Number(s.receivedWithoutGst || 0),
        amountPending: Number(s.amountPending || 0),
        remarks: s.remarks,
        teamType: s.teamType || "Team Incorporation",
        legalStatus: s.legalStatus,
        legalDocType: s.legalDocType,
        agreementTerms: s.agreementTerms,
        legalRemarks: s.legalRemarks,
        operation: (s as any).internalOperation
          ? {
              id: (s as any).internalOperation.id,
              operationNumber: (s as any).internalOperation.operationNumber,
              stage: (s as any).internalOperation.stage,
              internalStage: (s as any).internalOperation.internalStage,
              status: (s as any).internalOperation.status,
              assignedTlName: (s as any).internalOperation.assignedTl
                ? `${(s as any).internalOperation.assignedTl.firstName} ${(s as any).internalOperation.assignedTl.lastName}`.trim()
                : null,
              assignedTmName: (s as any).internalOperation.assignedTm
                ? `${(s as any).internalOperation.assignedTm.firstName} ${(s as any).internalOperation.assignedTm.lastName}`.trim()
                : null,
              updatedAt: (s as any).internalOperation.updatedAt.toISOString(),
            }
          : null,
      })),

      documents: d.documents.map((doc) => ({
        id: doc.id,
        dealId: doc.dealId,
        title: doc.title,
        docType: doc.docType,
        fileUrl: doc.fileUrl,
        fileKey: doc.fileKey,
        uploadedByName: doc.uploadedBy
          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim()
          : null,
        createdAt: doc.createdAt.toISOString(),
      })),

      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        deals: serialized,
        isAccountsUser,
        isLegalUser,
        isSalesUser,
        currentUserDepartment: user.department || "",
        canManageAll: scope.canManageAll,
      },
    };
  } catch (error: any) {
    console.error("[getDealsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load deals." };
  }
}

/**
 * Creates a new Deal, synchronizes Client & Company master records, creates line items, and attaches docs
 */
export async function createDealAction(
  raw: DealFormData
): Promise<ActionResult<SerializedDeal>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const userDept = (user.department || "").toLowerCase();
    const isLegalOrAdmin =
      userDept.includes("legal") ||
      scope.canManageAll ||
      user.systemRole === SystemRole.SUPER_ADMIN;

    const parsed = dealFormSchema.parse(raw);

    const deal = await db.$transaction(async (tx) => {
      // 1. Synchronize / Update Client Master Record
      let clientId = parsed.clientId;
      if (clientId) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            name: parsed.clientName,
            phone: parsed.clientPhone,
            email: parsed.clientEmail || null,
            alternatePhone: parsed.clientAlternatePhone || null,
            gender: parsed.clientGender || null,
            state: parsed.clientState || null,
            city: parsed.clientCity || null,
            address: parsed.clientAddress || null,
          },
        });
      }

      // 2. Synchronize / Create / Update Company Master Record
      let companyId: string | null = parsed.companyId?.trim() || null;
      if (companyId) {
        const existingComp = await tx.company.findUnique({ where: { id: companyId } });
        if (existingComp) {
          await tx.company.update({
            where: { id: companyId },
            data: {
              name: parsed.companyName.trim(),
              companyType: parsed.companyType || existingComp.companyType,
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : existingComp.incorporatedDate,
              address: parsed.companyAddress || existingComp.address || parsed.clientAddress || null,
              city: parsed.clientCity || existingComp.city || null,
              state: parsed.clientState || existingComp.state || null,
              createdById: existingComp.createdById || parsed.assignedEmployeeId || user.id,
            },
          });
        } else {
          companyId = null;
        }
      }

      if (!companyId && parsed.companyName && parsed.companyName.trim()) {
        const existingByName = await tx.company.findFirst({
          where: { name: { equals: parsed.companyName.trim(), mode: "insensitive" } },
        });

        if (existingByName) {
          companyId = existingByName.id;
          await tx.company.update({
            where: { id: existingByName.id },
            data: {
              companyType: parsed.companyType || existingByName.companyType,
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : existingByName.incorporatedDate,
              address: parsed.companyAddress || existingByName.address || parsed.clientAddress || null,
              city: parsed.clientCity || existingByName.city || null,
              state: parsed.clientState || existingByName.state || null,
              createdById: existingByName.createdById || parsed.assignedEmployeeId || user.id,
            },
          });
        } else {
          const newCompany = await tx.company.create({
            data: {
              name: parsed.companyName.trim(),
              companyType: parsed.companyType || "Private Limited Company",
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : null,
              address: parsed.companyAddress || parsed.clientAddress || null,
              city: parsed.clientCity || null,
              state: parsed.clientState || null,
              createdById: parsed.assignedEmployeeId || user.id,
            },
          });
          companyId = newCompany.id;
        }
      }

      // Link company to client if client exists
      if (clientId && companyId) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            companyId,
            companyName: parsed.companyName.trim(),
          },
        });
      }

      // 3. Compute Financial Totals (Create)
      let subTotal = 0;
      let gstAmount = 0;
      let totalValue = 0;
      let amountReceived = 0;

      const sanitizedServices = parsed.services.map((s) => {
        const tot = Number(s.totalAmount) || 0;
        const wGst = Number(s.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
        const gst = Number(s.gstAmount) || Math.round((tot - wGst) * 100) / 100;

        const rec = Number(s.amountReceived) || 0;
        const recWGst = Number(s.receivedWithoutGst) || Math.round((rec / 1.18) * 100) / 100;
        const recGst = Number(s.receivedGst) || Math.round((rec - recWGst) * 100) / 100;
        const pend = Math.max(0, tot - rec);

        subTotal += wGst;
        gstAmount += gst;
        totalValue += tot;
        amountReceived += rec;

        const teamType = isLegalOrAdmin ? (s.teamType || "Team Incorporation") : "Team Incorporation";
        const legalStatus = isLegalOrAdmin ? (s.legalStatus || LegalStatus.PENDING) : LegalStatus.PENDING;
        const legalDocType = isLegalOrAdmin ? (s.legalDocType || null) : null;
        const agreementTerms = isLegalOrAdmin ? (s.agreementTerms || null) : null;
        const legalRemarks = isLegalOrAdmin ? (s.legalRemarks || null) : null;

        return {
          serviceId: s.serviceId || null,
          serviceName: s.serviceName,
          minimumPrice: new Prisma.Decimal(Number(s.minimumPrice) || 0),
          outsourceCost: new Prisma.Decimal(Number(s.outsourceCost) || 0),
          unitPrice: new Prisma.Decimal(tot),
          totalPrice: new Prisma.Decimal(tot),
          withoutGstAmount: new Prisma.Decimal(wGst),
          gstAmount: new Prisma.Decimal(gst),
          gstRate: 18,
          amountReceived: new Prisma.Decimal(rec),
          receivedWithoutGst: new Prisma.Decimal(recWGst),
          receivedGst: new Prisma.Decimal(recGst),
          amountPending: new Prisma.Decimal(pend),
          remarks: s.remarks || null,
          teamType,
          legalStatus,
          legalDocType,
          agreementTerms,
          legalRemarks,
        };
      });

      const amountPending = Math.max(0, totalValue - amountReceived);

      // 4. Generate unique sequential deal number: DL-YYYY-XXXX
      const count = await tx.deal.count();
      const dealNumber = `DL-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      const createdDeal = await tx.deal.create({
        data: {
          dealNumber,
          title: parsed.title,
          bookingDate: new Date(parsed.bookingDate),
          stage: parsed.stage || DealStage.LEAD,
          accountsStatus: parsed.accountsStatus || "DRAFT",
          panNumber: parsed.panNumber || null,

          clientId,
          contactName: parsed.clientName,
          contactPhone: parsed.clientPhone,
          contactEmail: parsed.clientEmail || null,

          companyId,
          companyName: parsed.companyName.trim(),

          assignedEmployeeId: parsed.assignedEmployeeId,
          partnerBdmId: parsed.partnerBdmId || null,

          subTotal: new Prisma.Decimal(subTotal),
          gstAmount: new Prisma.Decimal(gstAmount),
          gstRate: 18,
          totalValue: new Prisma.Decimal(totalValue),
          value: new Prisma.Decimal(totalValue),
          amountReceived: new Prisma.Decimal(amountReceived),
          amountPending: new Prisma.Decimal(amountPending),

          paymentScreenshotUrl: parsed.paymentScreenshotUrl || null,
          paymentScreenshotKey: parsed.paymentScreenshotKey || null,
          agreementTerms: isLegalOrAdmin ? (parsed.agreementTerms || null) : null,
          legalRemarks: isLegalOrAdmin ? (parsed.legalRemarks || null) : null,
          legalDocSenderName: isLegalOrAdmin ? (parsed.legalDocSenderName || null) : null,
          legalDocSenderDate: isLegalOrAdmin && parsed.legalDocSenderDate ? new Date(parsed.legalDocSenderDate) : null,
          legalDocReceiverName: isLegalOrAdmin ? (parsed.legalDocReceiverName || null) : null,
          legalDocReceiverDate: isLegalOrAdmin && parsed.legalDocReceiverDate ? new Date(parsed.legalDocReceiverDate) : null,
          isQualityPassed: parsed.isQualityPassed || false,
          qualityRemarks: parsed.qualityRemarks || null,
          notes: parsed.notes || null,

          services: {
            create: sanitizedServices,
          },

          documents: {
            create: parsed.documents.map((doc) => ({
              title: doc.title,
              docType: doc.docType || "CLIENT_KYC",
              fileUrl: doc.fileUrl,
              fileKey: doc.fileKey || doc.fileUrl,
              uploadedById: user.id,
            })),
          },
        },
        include: {
          client: true,
          company: true,
          assignedEmployee: { select: { firstName: true, lastName: true } },
          partnerBdm: { select: { firstName: true, lastName: true } },
          services: true,
          documents: {
            include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      return createdDeal;
    });

    revalidatePath("/crm/deals");
    revalidatePath("/crm/clients");
    revalidatePath("/crm/companies");

    return {
      success: true,
      data: {
        id: deal.id,
        dealNumber: deal.dealNumber!,
        title: deal.title,
        bookingDate: deal.bookingDate?.toISOString().split("T")[0] || "",
        value: Number(deal.value),
        totalValue: Number(deal.totalValue),
        subTotal: Number(deal.subTotal),
        gstAmount: Number(deal.gstAmount),
        amountReceived: Number(deal.amountReceived),
        amountPending: Number(deal.amountPending),
        currency: deal.currency,
        stage: deal.stage,
        accountsStatus: deal.accountsStatus,
        internalLegalStatus: deal.internalLegalStatus,
        panNumber: deal.panNumber,
        clientId: deal.clientId,
        clientName: deal.contactName || deal.client?.name || "",
        clientPhone: deal.contactPhone || deal.client?.phone || "",
        clientEmail: deal.contactEmail || deal.client?.email || null,
        clientAlternatePhone: deal.client?.alternatePhone || null,
        clientGender: deal.client?.gender || null,
        clientState: deal.client?.state || null,
        clientCity: deal.client?.city || null,
        clientAddress: deal.client?.address || null,
        companyId: deal.companyId,
        companyName: deal.companyName,
        companyType: deal.company?.companyType || null,
        companyIncorporatedDate: deal.company?.incorporatedDate
          ? deal.company.incorporatedDate.toISOString().split("T")[0]
          : null,
        companyAddress: deal.company?.address || null,
        assignedEmployeeId: deal.assignedEmployeeId,
        assignedEmployeeName: deal.assignedEmployee
          ? `${deal.assignedEmployee.firstName} ${deal.assignedEmployee.lastName}`.trim()
          : null,
        partnerBdmId: deal.partnerBdmId,
        partnerBdmName: deal.partnerBdm
          ? `${deal.partnerBdm.firstName} ${deal.partnerBdm.lastName}`.trim()
          : null,
        paymentScreenshotUrl: deal.paymentScreenshotUrl,
        paymentScreenshotKey: deal.paymentScreenshotKey,
        agreementTerms: deal.agreementTerms,
        legalRemarks: deal.legalRemarks,
        legalDocSenderName: deal.legalDocSenderName,
        legalDocSenderDate: deal.legalDocSenderDate
          ? deal.legalDocSenderDate.toISOString().split("T")[0]
          : null,
        legalDocReceiverName: deal.legalDocReceiverName,
        legalDocReceiverDate: deal.legalDocReceiverDate
          ? deal.legalDocReceiverDate.toISOString().split("T")[0]
          : null,
        isQualityPassed: deal.isQualityPassed,
        qualityRemarks: deal.qualityRemarks,
        notes: deal.notes,
        services: deal.services.map((s) => ({
          id: s.id,
          dealId: s.dealId,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          minimumPrice: Number(s.minimumPrice || 0),
          outsourceCost: Number(s.outsourceCost || 0),
          totalPrice: Number(s.totalPrice),
          withoutGstAmount: Number(s.withoutGstAmount || 0),
          gstAmount: Number(s.gstAmount),
          amountReceived: Number(s.amountReceived || 0),
          receivedGst: Number(s.receivedGst || 0),
          receivedWithoutGst: Number(s.receivedWithoutGst || 0),
          amountPending: Number(s.amountPending || 0),
          remarks: s.remarks,
          teamType: s.teamType || "Team Incorporation",
          legalStatus: s.legalStatus,
          legalDocType: s.legalDocType,
          agreementTerms: s.agreementTerms,
          legalRemarks: s.legalRemarks,
        })),
        documents: deal.documents.map((doc) => ({
          id: doc.id,
          dealId: doc.dealId,
          title: doc.title,
          docType: doc.docType,
          fileUrl: doc.fileUrl,
          fileKey: doc.fileKey,
          uploadedByName: doc.uploadedBy
            ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim()
            : null,
          createdAt: doc.createdAt.toISOString(),
        })),
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createDealAction Error]:", error);
    return { success: false, error: error.message || "Failed to create deal." };
  }
}

/**
 * Updates an existing Deal, recalculates totals, updates Client and Company records
 */
export async function updateDealAction(
  dealId: string,
  raw: DealFormData
): Promise<ActionResult<SerializedDeal>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.deal.findUnique({
      where: { id: dealId },
      include: { services: true, documents: true },
    });

    if (!existing) return { success: false, error: "Deal not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to modify this deal." };
    }

    const userDept = (user.department || "").toLowerCase();
    const isLegalOrAdmin =
      userDept.includes("legal") ||
      scope.canManageAll ||
      user.systemRole === SystemRole.SUPER_ADMIN;

    const parsed = dealFormSchema.parse(raw);

    const updated = await db.$transaction(async (tx) => {
      // 1. Update Client Master Record
      if (parsed.clientId) {
        await tx.client.update({
          where: { id: parsed.clientId },
          data: {
            name: parsed.clientName,
            phone: parsed.clientPhone,
            email: parsed.clientEmail || null,
            alternatePhone: parsed.clientAlternatePhone || null,
            gender: parsed.clientGender || null,
            state: parsed.clientState || null,
            city: parsed.clientCity || null,
            address: parsed.clientAddress || null,
          },
        });
      }

      // 2. Synchronize / Create / Update Company Master Record
      let companyId: string | null = parsed.companyId?.trim() || null;
      if (companyId) {
        const existingComp = await tx.company.findUnique({ where: { id: companyId } });
        if (existingComp) {
          await tx.company.update({
            where: { id: companyId },
            data: {
              name: parsed.companyName.trim(),
              companyType: parsed.companyType || existingComp.companyType,
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : existingComp.incorporatedDate,
              address: parsed.companyAddress || existingComp.address || parsed.clientAddress || null,
              city: parsed.clientCity || existingComp.city || null,
              state: parsed.clientState || existingComp.state || null,
              createdById: existingComp.createdById || parsed.assignedEmployeeId || user.id,
            },
          });
        } else {
          companyId = null;
        }
      }

      if (!companyId && parsed.companyName && parsed.companyName.trim()) {
        const existingByName = await tx.company.findFirst({
          where: { name: { equals: parsed.companyName.trim(), mode: "insensitive" } },
        });

        if (existingByName) {
          companyId = existingByName.id;
          await tx.company.update({
            where: { id: existingByName.id },
            data: {
              companyType: parsed.companyType || existingByName.companyType,
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : existingByName.incorporatedDate,
              address: parsed.companyAddress || existingByName.address || parsed.clientAddress || null,
              city: parsed.clientCity || existingByName.city || null,
              state: parsed.clientState || existingByName.state || null,
              createdById: existingByName.createdById || parsed.assignedEmployeeId || user.id,
            },
          });
        } else {
          const newCompany = await tx.company.create({
            data: {
              name: parsed.companyName.trim(),
              companyType: parsed.companyType || "Private Limited Company",
              incorporatedDate: parsed.companyIncorporatedDate
                ? new Date(parsed.companyIncorporatedDate)
                : null,
              address: parsed.companyAddress || parsed.clientAddress || null,
              city: parsed.clientCity || null,
              state: parsed.clientState || null,
              createdById: parsed.assignedEmployeeId || user.id,
            },
          });
          companyId = newCompany.id;
        }
      }

      // Link company to client if client exists
      if (parsed.clientId && companyId) {
        await tx.client.update({
          where: { id: parsed.clientId },
          data: {
            companyId,
            companyName: parsed.companyName.trim(),
          },
        });
      }

      // 3. Recalculate Financial Totals
      let subTotal = 0;
      let gstAmount = 0;
      let totalValue = 0;
      let amountReceived = 0;

      const sanitizedServices = parsed.services.map((s, idx) => {
        const tot = Number(s.totalAmount) || 0;
        const wGst = Number(s.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
        const gst = Number(s.gstAmount) || Math.round((tot - wGst) * 100) / 100;

        const rec = Number(s.amountReceived) || 0;
        const recWGst = Number(s.receivedWithoutGst) || Math.round((rec / 1.18) * 100) / 100;
        const recGst = Number(s.receivedGst) || Math.round((rec - recWGst) * 100) / 100;
        const pend = Math.max(0, tot - rec);

        subTotal += wGst;
        gstAmount += gst;
        totalValue += tot;
        amountReceived += rec;

        // Backend security: if user is not Legal / Super Admin, preserve existing service legal values
        const existingService = s.id
          ? existing.services.find((es) => es.id === s.id)
          : existing.services[idx];

        const teamType = isLegalOrAdmin
          ? (s.teamType || "Team Incorporation")
          : (existingService?.teamType || "Team Incorporation");
        const legalStatus = isLegalOrAdmin
          ? (s.legalStatus || LegalStatus.PENDING)
          : (existingService?.legalStatus || LegalStatus.PENDING);
        const legalDocType = isLegalOrAdmin
          ? (s.legalDocType || null)
          : (existingService?.legalDocType || null);
        const agreementTerms = isLegalOrAdmin
          ? (s.agreementTerms || null)
          : (existingService?.agreementTerms || null);
        const legalRemarks = isLegalOrAdmin
          ? (s.legalRemarks || null)
          : (existingService?.legalRemarks || null);

        return {
          serviceId: s.serviceId || null,
          serviceName: s.serviceName,
          minimumPrice: new Prisma.Decimal(Number(s.minimumPrice) || 0),
          outsourceCost: new Prisma.Decimal(Number(s.outsourceCost) || 0),
          unitPrice: new Prisma.Decimal(tot),
          totalPrice: new Prisma.Decimal(tot),
          withoutGstAmount: new Prisma.Decimal(wGst),
          gstAmount: new Prisma.Decimal(gst),
          gstRate: 18,
          amountReceived: new Prisma.Decimal(rec),
          receivedWithoutGst: new Prisma.Decimal(recWGst),
          receivedGst: new Prisma.Decimal(recGst),
          amountPending: new Prisma.Decimal(pend),
          remarks: s.remarks || null,
          teamType,
          legalStatus,
          legalDocType,
          agreementTerms,
          legalRemarks,
        };
      });

      const amountPending = Math.max(0, totalValue - amountReceived);

      // 4. Delete existing services and documents to re-insert cleanly
      await tx.dealService.deleteMany({ where: { dealId } });
      await tx.dealDocument.deleteMany({ where: { dealId } });

      const updatedDeal = await tx.deal.update({
        where: { id: dealId },
        data: {
          title: parsed.title,
          bookingDate: new Date(parsed.bookingDate),
          stage: parsed.stage,
          panNumber: parsed.panNumber || null,
          clientId: parsed.clientId || existing.clientId,
          contactName: parsed.clientName,
          contactPhone: parsed.clientPhone,
          contactEmail: parsed.clientEmail || null,
          companyId,
          companyName: parsed.companyName.trim(),
          assignedEmployeeId: parsed.assignedEmployeeId,
          partnerBdmId: parsed.partnerBdmId || null,
          subTotal: new Prisma.Decimal(subTotal),
          gstAmount: new Prisma.Decimal(gstAmount),
          totalValue: new Prisma.Decimal(totalValue),
          value: new Prisma.Decimal(totalValue),
          amountReceived: new Prisma.Decimal(amountReceived),
          amountPending: new Prisma.Decimal(amountPending),
          paymentScreenshotUrl: parsed.paymentScreenshotUrl || null,
          paymentScreenshotKey: parsed.paymentScreenshotKey || null,
          agreementTerms: isLegalOrAdmin ? (parsed.agreementTerms || null) : existing.agreementTerms,
          legalRemarks: isLegalOrAdmin ? (parsed.legalRemarks || null) : existing.legalRemarks,
          legalDocSenderName: isLegalOrAdmin ? (parsed.legalDocSenderName || null) : existing.legalDocSenderName,
          legalDocSenderDate: isLegalOrAdmin
            ? (parsed.legalDocSenderDate ? new Date(parsed.legalDocSenderDate) : null)
            : existing.legalDocSenderDate,
          legalDocReceiverName: isLegalOrAdmin ? (parsed.legalDocReceiverName || null) : existing.legalDocReceiverName,
          legalDocReceiverDate: isLegalOrAdmin
            ? (parsed.legalDocReceiverDate ? new Date(parsed.legalDocReceiverDate) : null)
            : existing.legalDocReceiverDate,
          isQualityPassed: parsed.isQualityPassed || false,
          qualityRemarks: parsed.qualityRemarks || null,
          notes: parsed.notes || null,

          services: {
            create: sanitizedServices,
          },

          documents: {
            create: parsed.documents.map((doc) => ({
              title: doc.title,
              docType: doc.docType || "CLIENT_KYC",
              fileUrl: doc.fileUrl,
              fileKey: doc.fileKey || doc.fileUrl,
              uploadedById: user.id,
            })),
          },
        },
        include: {
          client: true,
          company: true,
          assignedEmployee: { select: { firstName: true, lastName: true } },
          partnerBdm: { select: { firstName: true, lastName: true } },
          services: true,
          documents: {
            include: { uploadedBy: { select: { firstName: true, lastName: true } } },
          },
        },
      });

      return updatedDeal;
    });

    revalidatePath("/crm/deals");
    revalidatePath("/crm/clients");
    revalidatePath("/crm/companies");

    return {
      success: true,
      data: {
        id: updated.id,
        dealNumber: updated.dealNumber!,
        title: updated.title,
        bookingDate: updated.bookingDate?.toISOString().split("T")[0] || "",
        value: Number(updated.value),
        totalValue: Number(updated.totalValue),
        subTotal: Number(updated.subTotal),
        gstAmount: Number(updated.gstAmount),
        amountReceived: Number(updated.amountReceived),
        amountPending: Number(updated.amountPending),
        currency: updated.currency,
        stage: updated.stage,
        accountsStatus: updated.accountsStatus,
        internalLegalStatus: updated.internalLegalStatus,
        panNumber: updated.panNumber,
        clientId: updated.clientId,
        clientName: updated.contactName || updated.client?.name || "",
        clientPhone: updated.contactPhone || updated.client?.phone || "",
        clientEmail: updated.contactEmail || updated.client?.email || null,
        clientAlternatePhone: updated.client?.alternatePhone || null,
        clientGender: updated.client?.gender || null,
        clientState: updated.client?.state || null,
        clientCity: updated.client?.city || null,
        clientAddress: updated.client?.address || null,
        companyId: updated.companyId,
        companyName: updated.companyName,
        companyType: updated.company?.companyType || null,
        companyIncorporatedDate: updated.company?.incorporatedDate
          ? updated.company.incorporatedDate.toISOString().split("T")[0]
          : null,
        companyAddress: updated.company?.address || null,
        assignedEmployeeId: updated.assignedEmployeeId,
        assignedEmployeeName: updated.assignedEmployee
          ? `${updated.assignedEmployee.firstName} ${updated.assignedEmployee.lastName}`.trim()
          : null,
        partnerBdmId: updated.partnerBdmId,
        partnerBdmName: updated.partnerBdm
          ? `${updated.partnerBdm.firstName} ${updated.partnerBdm.lastName}`.trim()
          : null,
        paymentScreenshotUrl: updated.paymentScreenshotUrl,
        paymentScreenshotKey: updated.paymentScreenshotKey,
        agreementTerms: updated.agreementTerms,
        legalRemarks: updated.legalRemarks,
        legalDocSenderName: updated.legalDocSenderName,
        legalDocSenderDate: updated.legalDocSenderDate
          ? updated.legalDocSenderDate.toISOString().split("T")[0]
          : null,
        legalDocReceiverName: updated.legalDocReceiverName,
        legalDocReceiverDate: updated.legalDocReceiverDate
          ? updated.legalDocReceiverDate.toISOString().split("T")[0]
          : null,
        isQualityPassed: updated.isQualityPassed,
        qualityRemarks: updated.qualityRemarks,
        notes: updated.notes,
        services: updated.services.map((s) => ({
          id: s.id,
          dealId: s.dealId,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          minimumPrice: Number(s.minimumPrice || 0),
          outsourceCost: Number(s.outsourceCost || 0),
          totalPrice: Number(s.totalPrice),
          withoutGstAmount: Number(s.withoutGstAmount || 0),
          gstAmount: Number(s.gstAmount),
          amountReceived: Number(s.amountReceived || 0),
          receivedGst: Number(s.receivedGst || 0),
          receivedWithoutGst: Number(s.receivedWithoutGst || 0),
          amountPending: Number(s.amountPending || 0),
          remarks: s.remarks,
          teamType: s.teamType || "Team Incorporation",
          legalStatus: s.legalStatus,
          legalDocType: s.legalDocType,
          agreementTerms: s.agreementTerms,
          legalRemarks: s.legalRemarks,
        })),
        documents: updated.documents.map((doc) => ({
          id: doc.id,
          dealId: doc.dealId,
          title: doc.title,
          docType: doc.docType,
          fileUrl: doc.fileUrl,
          fileKey: doc.fileKey,
          uploadedByName: doc.uploadedBy
            ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim()
            : null,
          createdAt: doc.createdAt.toISOString(),
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateDealAction Error]:", error);
    return { success: false, error: error.message || "Failed to update deal." };
  }
}

/**
 * Gatekeeping Action: Sends completed deal to Accounts for verification.
 * Strictly verifies required fields (Client details, Company details, Services line-items, and Payment proof).
 */
export async function sendDealToAccountsAction(dealId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { services: true, client: true },
    });

    if (!deal) return { success: false, error: "Deal not found." };

    // Completion Gatekeeping Verifications
    if (!deal.clientId || !deal.contactName || !deal.contactPhone) {
      return { success: false, error: "Deal cannot be submitted: Client information is incomplete." };
    }

    if (!deal.companyName || deal.companyName.trim() === "") {
      return { success: false, error: "Deal cannot be submitted: Company details are missing." };
    }

    if (!deal.services || deal.services.length === 0) {
      return { success: false, error: "Deal cannot be submitted: At least one service line-item is required." };
    }

    if (Number(deal.totalValue || 0) <= 0) {
      return { success: false, error: "Deal cannot be submitted: Total deal value must be greater than ₹0." };
    }

    // Update status to PENDING_ACCOUNTS
    await db.deal.update({
      where: { id: dealId },
      data: {
        accountsStatus: "PENDING_ACCOUNTS",
        stage: DealStage.PROPOSAL,
      },
    });

    // Notify Accounts Department
    try {
      const accountsStaff = await db.employee.findMany({
        where: {
          OR: [
            { department: { in: ["Account", "Accounts"] } },
            { role: "Admin" },
          ],
        },
        select: { id: true },
      });

      if (accountsStaff.length > 0) {
        await db.notification.createMany({
          data: accountsStaff.map((emp) => ({
            recipientId: emp.id,
            title: `Deal Ready for Verification (${deal.dealNumber})`,
            message: `Deal for ${deal.contactName} (${deal.companyName}) of ₹${Number(deal.totalValue).toLocaleString("en-IN")} submitted by ${user.name}. Verification required.`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: "/crm/deals",
          })),
        });
      }
    } catch (notifErr) {
      console.warn("[Deal Accounts Notification Error]:", notifErr);
    }

    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit deal to accounts." };
  }
}

/**
 * Accounts Action: Verifies Deal against payment receipts and marks ACCOUNTS_VERIFIED
 */
export async function verifyDealByAccountsAction(dealId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { assignedEmployee: true },
    });

    if (!deal) return { success: false, error: "Deal not found." };

    await db.deal.update({
      where: { id: dealId },
      data: {
        accountsStatus: "ACCOUNTS_VERIFIED",
        accountsVerifiedAt: new Date(),
        stage: DealStage.NEGOTIATION,
      },
    });

    // Notify primary BDM
    if (deal.assignedEmployeeId) {
      try {
        await db.notification.create({
          data: {
            recipientId: deal.assignedEmployeeId,
            title: `Deal Accounts Verified (${deal.dealNumber})`,
            message: `Your deal for ${deal.contactName} (${deal.companyName}) has been verified by Accounts. Ready for Legal handover.`,
            type: NotificationType.SUCCESS,
            actionUrl: "/crm/deals",
          },
        });
      } catch (err) {
        console.warn("[Deal Verified Notification Error]:", err);
      }
    }

    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to verify deal." };
  }
}

/**
 * Accounts Action: Advances Deal to Legal department ("Send to Legal")
 */
export async function sendDealToLegalAction(dealId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        services: true,
        assignedEmployee: true,
      },
    });

    if (!deal) return { success: false, error: "Deal not found." };

    // Advance deal to SENT_TO_LEGAL and CLOSED_WON
    await db.deal.update({
      where: { id: dealId },
      data: {
        accountsStatus: "SENT_TO_LEGAL",
        internalLegalStatus: LegalStatus.UNDER_REVIEW,
        stage: DealStage.CLOSED_WON,
      },
    });

    // Notify Legal Department employees
    try {
      const legalStaff = await db.employee.findMany({
        where: {
          OR: [
            { department: "Legal" },
            { role: "Admin" },
          ],
        },
        select: { id: true },
      });

      if (legalStaff.length > 0) {
        await db.notification.createMany({
          data: legalStaff.map((emp) => ({
            recipientId: emp.id,
            title: `Deal Handed Over to Legal (${deal.dealNumber})`,
            message: `Deal for ${deal.companyName} (${deal.contactName}) verified by Accounts and assigned to Legal for agreement drafting & execution.`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: "/crm/deals",
          })),
        });
      }
    } catch (notifErr) {
      console.warn("[Deal Legal Notification Error]:", notifErr);
    }

    revalidatePath("/crm/deals");
    revalidatePath("/crm/operations");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to send deal to legal." };
  }
}

/**
 * Legal Action: Once Agreement & NDA are drafted, advances Deal to Operations ("Send to Operation")
 * Automatically spawns 1 child InternalOperation record per service line-item!
 */
export async function sendDealToOperationAction(dealId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { services: true },
    });

    if (!deal) return { success: false, error: "Deal not found." };

    // Advance deal status to SENT_TO_OPERATION & EXECUTED
    await db.deal.update({
      where: { id: dealId },
      data: {
        accountsStatus: "SENT_TO_OPERATION",
        internalLegalStatus: LegalStatus.EXECUTED,
        stage: DealStage.CLOSED_WON,
      },
    });

    // Auto-spawn child operations (1 per service!)
    await autoSpawnDealOperationsAction(dealId);

    revalidatePath("/crm/deals");
    revalidatePath("/crm/operations");

    return { success: true };
  } catch (error: any) {
    console.error("[sendDealToOperationAction Error]:", error);
    return { success: false, error: error.message || "Failed to dispatch deal to operations." };
  }
}

/**
 * Deletes deal record
 */
export async function deleteDealAction(dealId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const deal = await db.deal.findUnique({ where: { id: dealId } });
    if (!deal) return { success: false, error: "Deal not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, deal.assignedEmployeeId)) {
      return { success: false, error: "You do not have permission to delete this deal." };
    }

    await db.deal.delete({ where: { id: dealId } });
    revalidatePath("/crm/deals");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete deal." };
  }
}

/**
 * Fetches services, clients, companies, and employees for Deal creation lookups
 */
export async function getDealMasterDataAction(): Promise<
  ActionResult<DealMasterData>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);

    const clientWhere: Prisma.ClientWhereInput = {};
    const companyWhere: Prisma.CompanyWhereInput = {};

    if (!scope.canViewAll && scope.allowedUserIds) {
      clientWhere.OR = [
        { createdById: { in: scope.allowedUserIds } },
        { assignedEmployeeId: { in: scope.allowedUserIds } },
      ];
      companyWhere.createdById = { in: scope.allowedUserIds };
    }

    const [services, clients, companies, employees] = await Promise.all([
      db.service.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          minimumPrice: true,
          outsourcePrice: true,
          category: true,
          defaultGstRate: true,
        },
        orderBy: { name: "asc" },
      }),
      db.client.findMany({
        where: clientWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          alternatePhone: true,
          email: true,
          gender: true,
          state: true,
          city: true,
          address: true,
          companyId: true,
          companyName: true,
          company: { select: { name: true } },
        },
        orderBy: { name: "asc" },
        take: 150,
      }),
      db.company.findMany({
        where: companyWhere,
        select: {
          id: true,
          name: true,
          companyType: true,
          incorporatedDate: true,
          address: true,
        },
        orderBy: { name: "asc" },
        take: 150,
      }),
      db.employee.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          systemRole: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    return {
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          minimumPrice: Number(s.minimumPrice),
          outsourcePrice: Number(s.outsourcePrice),
          category: s.category,
          defaultGstRate: s.defaultGstRate,
        })),
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          alternatePhone: c.alternatePhone,
          email: c.email,
          gender: c.gender,
          state: c.state,
          city: c.city,
          address: c.address,
          companyId: c.companyId,
          companyName: c.company?.name || c.companyName || null,
        })),
        companies: companies.map((comp) => ({
          id: comp.id,
          name: comp.name,
          companyType: comp.companyType,
          incorporatedDate: comp.incorporatedDate
            ? comp.incorporatedDate.toISOString().split("T")[0]
            : null,
          address: comp.address,
        })),
        employees: employees.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          department: e.department,
          systemRole: e.systemRole,
        })),
      },
    };
  } catch (error: any) {
    console.error("[getDealMasterDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load deal master data." };
  }
}
