"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope, canUserModifyRecord } from "@/lib/auth/crm-scope";
import { generateQuotationPdf } from "@/lib/pdf/quotation";
import { uploadToR2 } from "@/lib/storage/r2";
import { sendQuotationEmail } from "@/lib/mail";
import { QuotationStatus, Prisma } from "@prisma/client";
import {
  quotationFormSchema,
  quotationServiceItemSchema,
  QuotationFormData,
  SerializedQuotation,
  SerializedQuotationService,
  QuotationMasterData,
} from "@/lib/validations/quotation";

export type {
  QuotationFormData,
  SerializedQuotation,
  SerializedQuotationService,
  QuotationMasterData,
};

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Retrieves quotations scoped by RBAC visibility rules:
 * - TM sees own quotations
 * - TL sees entire team's quotations
 * - HOD/Admins see all quotations
 */
export async function getQuotationsAction(params: {
  search?: string;
  status?: string;
} = {}): Promise<
  ActionResult<{
    quotations: SerializedQuotation[];
    canManageAll: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const { search = "", status = "ALL" } = params;

    const where: Prisma.QuotationWhereInput = {};

    // RBAC Scoping
    if (!scope.canViewAll && scope.allowedUserIds) {
      where.preparedById = { in: scope.allowedUserIds };
    }

    if (status && status !== "ALL") {
      where.status = status as QuotationStatus;
    }

    if (search.trim()) {
      const q = search.trim();
      const conditions: Prisma.QuotationWhereInput[] = [
        { quotationNumber: { contains: q, mode: "insensitive" } },
        { clientName: { contains: q, mode: "insensitive" } },
        { clientPhone: { contains: q } },
        { clientEmail: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: conditions }];
      } else {
        where.OR = conditions;
      }
    }

    const quotations = await db.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        services: true,
        preparedBy: { select: { firstName: true, lastName: true } },
      },
    });

    const serialized: SerializedQuotation[] = quotations.map((q) => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      clientName: q.clientName,
      clientPhone: q.clientPhone,
      clientEmail: q.clientEmail,
      clientAlternatePhone: q.clientAlternatePhone,
      clientGender: q.clientGender,
      clientState: q.clientState,
      clientCity: q.clientCity,
      clientAddress: q.clientAddress,
      clientId: q.clientId,
      companyName: q.companyName,
      companyId: q.companyId,
      companyType: q.companyType,
      companyIncorporatedDate: q.companyIncorporatedDate
        ? q.companyIncorporatedDate.toISOString().split("T")[0]
        : null,
      companyAddress: q.companyAddress,
      subTotal: Number(q.subTotal),
      discountAmount: Number(q.discountAmount),
      gstRate: q.gstRate,
      gstAmount: Number(q.gstAmount),
      grandTotal: Number(q.grandTotal),
      status: q.status,
      validUntil: q.validUntil ? q.validUntil.toISOString().split("T")[0] : null,
      terms: q.terms,
      notes: q.notes,
      pdfUrl: q.pdfUrl,
      emailSentAt: q.emailSentAt ? q.emailSentAt.toISOString() : null,
      preparedById: q.preparedById,
      preparedByName: q.preparedBy
        ? `${q.preparedBy.firstName} ${q.preparedBy.lastName}`.trim()
        : undefined,
      services: q.services.map((s) => ({
        id: s.id,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        totalAmount: Number(s.totalAmount || s.totalPrice),
        withoutGstAmount: Number(s.withoutGstAmount || 0),
        gstAmount: Number(s.gstAmount),
        remarks: s.remarks,
      })),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: { quotations: serialized, canManageAll: scope.canManageAll },
    };
  } catch (error: any) {
    console.error("[getQuotationsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load quotations." };
  }
}

/**
 * Creates a new quotation, computes totals, automatically generates branded PDF, and uploads to R2
 */
export async function createQuotationAction(
  raw: QuotationFormData
): Promise<ActionResult<SerializedQuotation>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = quotationFormSchema.parse(raw);

    // Compute Indian GST Math
    // Without GST = Sum of withoutGstAmount
    // GST = Sum of gstAmount
    // Total = Subtotal + GST - Discount
    let subTotal = 0;
    let gstAmount = 0;
    let grandTotal = 0;

    const sanitizedServices = parsed.services.map((s) => {
      const tot = Number(s.totalAmount);
      // Standard Indian GST calculation: Without GST = Total / 1.18, GST = Total - Without GST
      const withoutGst = Number(s.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
      const gst = Number(s.gstAmount) || Math.round((tot - withoutGst) * 100) / 100;

      subTotal += withoutGst;
      gstAmount += gst;
      grandTotal += tot;

      return {
        serviceId: s.serviceId || null,
        serviceName: s.serviceName,
        totalAmount: new Prisma.Decimal(tot),
        withoutGstAmount: new Prisma.Decimal(withoutGst),
        gstAmount: new Prisma.Decimal(gst),
        totalPrice: new Prisma.Decimal(tot),
        remarks: s.remarks || null,
      };
    });

    const discount = Number(parsed.discountAmount) || 0;
    grandTotal = Math.max(0, grandTotal - discount);

    // Generate unique sequential Quotation Number e.g. QT-2026-0001
    const count = await db.quotation.count();
    const quotationNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Generate PDF via pdf-lib
    const pdfBuffer = await generateQuotationPdf({
      quotationNumber,
      createdAt: new Date().toISOString(),
      validUntil: parsed.validUntil,
      preparedByName: user.name,
      clientName: parsed.clientName,
      clientPhone: parsed.clientPhone,
      clientEmail: parsed.clientEmail,
      clientCity: parsed.clientCity,
      clientState: parsed.clientState,
      clientAddress: parsed.clientAddress,
      companyName: parsed.companyName,
      companyAddress: parsed.companyAddress,
      companyType: parsed.companyType,
      services: parsed.services.map((s) => ({
        serviceName: s.serviceName,
        remarks: s.remarks,
        withoutGstAmount: Number(s.withoutGstAmount) || Math.round((Number(s.totalAmount) / 1.18) * 100) / 100,
        gstAmount: Number(s.gstAmount) || Math.round((Number(s.totalAmount) - (Number(s.withoutGstAmount) || (Number(s.totalAmount) / 1.18))) * 100) / 100,
        totalAmount: Number(s.totalAmount),
      })),
      subTotal,
      discountAmount: discount,
      gstAmount,
      grandTotal,
      terms: parsed.terms,
    });

    // Upload PDF to Cloudflare R2
    let pdfUrl: string | null = null;
    let pdfKey: string | null = null;

    try {
      const uploadResult = await uploadToR2({
        fileBuffer: pdfBuffer,
        fileName: `${quotationNumber}.pdf`,
        contentType: "application/pdf",
        folder: "quotations",
      });
      pdfUrl = uploadResult.url;
      pdfKey = uploadResult.key;
    } catch (err) {
      console.warn("[R2 PDF Upload Fallback Warning]:", err);
    }

    // Persist to PostgreSQL
    const quotation = await db.quotation.create({
      data: {
        quotationNumber,
        clientName: parsed.clientName,
        clientPhone: parsed.clientPhone,
        clientEmail: parsed.clientEmail || null,
        clientAlternatePhone: parsed.clientAlternatePhone || null,
        clientGender: parsed.clientGender || null,
        clientState: parsed.clientState || null,
        clientCity: parsed.clientCity || null,
        clientAddress: parsed.clientAddress || null,
        clientId: parsed.clientId || null,

        companyName: parsed.companyName || null,
        companyId: parsed.companyId || null,
        companyType: parsed.companyType || null,
        companyIncorporatedDate: parsed.companyIncorporatedDate
          ? new Date(parsed.companyIncorporatedDate)
          : null,
        companyAddress: parsed.companyAddress || null,

        subTotal: new Prisma.Decimal(subTotal),
        discountAmount: new Prisma.Decimal(discount),
        gstRate: parsed.gstRate || 18,
        gstAmount: new Prisma.Decimal(gstAmount),
        grandTotal: new Prisma.Decimal(grandTotal),
        status: QuotationStatus.DRAFT,
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        terms: parsed.terms || null,
        notes: parsed.notes || null,
        pdfUrl,
        pdfKey,
        preparedById: user.id,

        services: {
          create: sanitizedServices,
        },
      },
      include: {
        services: true,
        preparedBy: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/quotations");
    return {
      success: true,
      data: {
        ...quotation,
        subTotal: Number(quotation.subTotal),
        discountAmount: Number(quotation.discountAmount),
        gstAmount: Number(quotation.gstAmount),
        grandTotal: Number(quotation.grandTotal),
        validUntil: quotation.validUntil ? quotation.validUntil.toISOString().split("T")[0] : null,
        companyIncorporatedDate: quotation.companyIncorporatedDate
          ? quotation.companyIncorporatedDate.toISOString().split("T")[0]
          : null,
        emailSentAt: null,
        preparedByName: user.name,
        services: quotation.services.map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          totalAmount: Number(s.totalAmount || s.totalPrice),
          withoutGstAmount: Number(s.withoutGstAmount || 0),
          gstAmount: Number(s.gstAmount),
          remarks: s.remarks,
        })),
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createQuotationAction Error]:", error);
    return { success: false, error: error.message || "Failed to create quotation." };
  }
}

/**
 * Updates an existing quotation, recalculates totals, regenerates PDF, and uploads to R2
 */
export async function updateQuotationAction(
  id: string,
  raw: QuotationFormData
): Promise<ActionResult<SerializedQuotation>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.quotation.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Quotation not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.preparedById)) {
      return { success: false, error: "You do not have permission to edit this quotation." };
    }

    const parsed = quotationFormSchema.parse(raw);

    let subTotal = 0;
    let gstAmount = 0;
    let grandTotal = 0;

    const sanitizedServices = parsed.services.map((s) => {
      const tot = Number(s.totalAmount);
      const withoutGst = Number(s.withoutGstAmount) || Math.round((tot / 1.18) * 100) / 100;
      const gst = Number(s.gstAmount) || Math.round((tot - withoutGst) * 100) / 100;

      subTotal += withoutGst;
      gstAmount += gst;
      grandTotal += tot;

      return {
        serviceId: s.serviceId || null,
        serviceName: s.serviceName,
        totalAmount: new Prisma.Decimal(tot),
        withoutGstAmount: new Prisma.Decimal(withoutGst),
        gstAmount: new Prisma.Decimal(gst),
        totalPrice: new Prisma.Decimal(tot),
        remarks: s.remarks || null,
      };
    });

    const discount = Number(parsed.discountAmount) || 0;
    grandTotal = Math.max(0, grandTotal - discount);

    // Regenerate PDF
    const pdfBuffer = await generateQuotationPdf({
      quotationNumber: existing.quotationNumber,
      createdAt: existing.createdAt.toISOString(),
      validUntil: parsed.validUntil,
      preparedByName: user.name,
      clientName: parsed.clientName,
      clientPhone: parsed.clientPhone,
      clientEmail: parsed.clientEmail,
      clientCity: parsed.clientCity,
      clientState: parsed.clientState,
      clientAddress: parsed.clientAddress,
      companyName: parsed.companyName,
      companyAddress: parsed.companyAddress,
      companyType: parsed.companyType,
      services: parsed.services.map((s) => ({
        serviceName: s.serviceName,
        remarks: s.remarks,
        withoutGstAmount: Number(s.withoutGstAmount) || Math.round((Number(s.totalAmount) / 1.18) * 100) / 100,
        gstAmount: Number(s.gstAmount) || Math.round((Number(s.totalAmount) - (Number(s.withoutGstAmount) || (Number(s.totalAmount) / 1.18))) * 100) / 100,
        totalAmount: Number(s.totalAmount),
      })),
      subTotal,
      discountAmount: discount,
      gstAmount,
      grandTotal,
      terms: parsed.terms,
    });

    let pdfUrl = existing.pdfUrl;
    let pdfKey = existing.pdfKey;

    try {
      const uploadResult = await uploadToR2({
        fileBuffer: pdfBuffer,
        fileName: `${existing.quotationNumber}.pdf`,
        contentType: "application/pdf",
        folder: "quotations",
      });
      pdfUrl = uploadResult.url;
      pdfKey = uploadResult.key;
    } catch (err) {
      console.warn("[R2 PDF Update Warning]:", err);
    }

    // Delete old line items and recreate with new calculation
    await db.quotationService.deleteMany({ where: { quotationId: id } });

    const updated = await db.quotation.update({
      where: { id },
      data: {
        clientName: parsed.clientName,
        clientPhone: parsed.clientPhone,
        clientEmail: parsed.clientEmail || null,
        clientAlternatePhone: parsed.clientAlternatePhone || null,
        clientGender: parsed.clientGender || null,
        clientState: parsed.clientState || null,
        clientCity: parsed.clientCity || null,
        clientAddress: parsed.clientAddress || null,
        clientId: parsed.clientId || null,

        companyName: parsed.companyName || null,
        companyId: parsed.companyId || null,
        companyType: parsed.companyType || null,
        companyIncorporatedDate: parsed.companyIncorporatedDate
          ? new Date(parsed.companyIncorporatedDate)
          : null,
        companyAddress: parsed.companyAddress || null,

        subTotal: new Prisma.Decimal(subTotal),
        discountAmount: new Prisma.Decimal(discount),
        gstRate: parsed.gstRate || 18,
        gstAmount: new Prisma.Decimal(gstAmount),
        grandTotal: new Prisma.Decimal(grandTotal),
        validUntil: parsed.validUntil ? new Date(parsed.validUntil) : null,
        terms: parsed.terms || null,
        notes: parsed.notes || null,
        pdfUrl,
        pdfKey,

        services: {
          create: sanitizedServices,
        },
      },
      include: {
        services: true,
        preparedBy: { select: { firstName: true, lastName: true } },
      },
    });

    revalidatePath("/crm/quotations");
    return {
      success: true,
      data: {
        ...updated,
        subTotal: Number(updated.subTotal),
        discountAmount: Number(updated.discountAmount),
        gstAmount: Number(updated.gstAmount),
        grandTotal: Number(updated.grandTotal),
        validUntil: updated.validUntil ? updated.validUntil.toISOString().split("T")[0] : null,
        companyIncorporatedDate: updated.companyIncorporatedDate
          ? updated.companyIncorporatedDate.toISOString().split("T")[0]
          : null,
        emailSentAt: updated.emailSentAt ? updated.emailSentAt.toISOString() : null,
        preparedByName: updated.preparedBy
          ? `${updated.preparedBy.firstName} ${updated.preparedBy.lastName}`.trim()
          : undefined,
        services: updated.services.map((s) => ({
          id: s.id,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          totalAmount: Number(s.totalAmount || s.totalPrice),
          withoutGstAmount: Number(s.withoutGstAmount || 0),
          gstAmount: Number(s.gstAmount),
          remarks: s.remarks,
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[updateQuotationAction Error]:", error);
    return { success: false, error: error.message || "Failed to update quotation." };
  }
}

/**
 * Deletes quotation record
 */
export async function deleteQuotationAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const existing = await db.quotation.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Quotation not found." };

    const scope = await getCrmUserScope(user);
    if (!canUserModifyRecord(scope, existing.preparedById)) {
      return { success: false, error: "You do not have permission to delete this quotation." };
    }

    await db.quotation.delete({ where: { id } });
    revalidatePath("/crm/quotations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete quotation." };
  }
}

/**
 * Sends official quotation email directly to the client with PDF attachment and download link
 */
export async function sendQuotationToClientAction(
  quotationId: string
): Promise<ActionResult<{ emailSentTo: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const quotation = await db.quotation.findUnique({
      where: { id: quotationId },
      include: {
        services: true,
        preparedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!quotation) return { success: false, error: "Quotation not found." };

    if (!quotation.clientEmail) {
      return {
        success: false,
        error: `Cannot email quotation: No email address provided for ${quotation.clientName}. Please edit quotation and enter client email.`,
      };
    }

    // Generate fresh PDF buffer for email attachment
    const pdfBuffer = await generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      createdAt: quotation.createdAt.toISOString(),
      validUntil: quotation.validUntil ? quotation.validUntil.toISOString() : null,
      preparedByName: quotation.preparedBy
        ? `${quotation.preparedBy.firstName} ${quotation.preparedBy.lastName}`.trim()
        : user.name,
      clientName: quotation.clientName,
      clientPhone: quotation.clientPhone,
      clientEmail: quotation.clientEmail,
      clientCity: quotation.clientCity,
      clientState: quotation.clientState,
      clientAddress: quotation.clientAddress,
      companyName: quotation.companyName,
      companyAddress: quotation.companyAddress,
      companyType: quotation.companyType,
      services: quotation.services.map((s) => ({
        serviceName: s.serviceName,
        remarks: s.remarks,
        withoutGstAmount: Number(s.withoutGstAmount || 0),
        gstAmount: Number(s.gstAmount),
        totalAmount: Number(s.totalAmount || s.totalPrice),
      })),
      subTotal: Number(quotation.subTotal),
      discountAmount: Number(quotation.discountAmount),
      gstAmount: Number(quotation.gstAmount),
      grandTotal: Number(quotation.grandTotal),
      terms: quotation.terms,
    });

    // Send via Nodemailer
    const emailRes = await sendQuotationEmail({
      toEmail: quotation.clientEmail,
      clientName: quotation.clientName,
      quotationNumber: quotation.quotationNumber,
      grandTotal: Number(quotation.grandTotal),
      pdfBuffer,
      pdfUrl: quotation.pdfUrl,
    });

    if (!emailRes.success) {
      return {
        success: false,
        error: `Failed to deliver email: ${emailRes.error || "SMTP dispatch failed"}`,
      };
    }

    // Update status to SENT and record email timestamp
    await db.quotation.update({
      where: { id: quotationId },
      data: {
        status: QuotationStatus.SENT,
        emailSentAt: new Date(),
      },
    });

    revalidatePath("/crm/quotations");
    return {
      success: true,
      data: { emailSentTo: quotation.clientEmail },
    };
  } catch (error: any) {
    console.error("[sendQuotationToClientAction Error]:", error);
    return { success: false, error: error.message || "Failed to dispatch quotation email." };
  }
}

/**
 * Fetches services, clients, and companies for quotation auto-fill and dropdown selections
 */
export async function getQuotationMasterDataAction(): Promise<
  ActionResult<QuotationMasterData>
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

    const [services, clients, companies] = await Promise.all([
      db.service.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          category: true,
          minimumPrice: true,
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
          company: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: 100,
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
        take: 100,
      }),
    ]);

    return {
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          minimumPrice: Number(s.minimumPrice),
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
      },
    };
  } catch (error: any) {
    console.error("[getQuotationMasterDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load master lookup data." };
  }
}

