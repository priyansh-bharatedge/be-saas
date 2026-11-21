"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmUserScope, canUserModifyRecord } from "@/lib/auth/crm-scope";
import {
  paymentRecordSchema,
  quickClientSchema,
  PaymentRecordFormData,
  QuickClientFormData,
  SerializedPaymentRecord,
  PaymentMasterData,
} from "@/lib/validations/payment";
import {
  PaymentVerificationStatus,
  PaymentType,
  SalaryEntity,
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
 * Retrieves payment records with 3-tab filtering (All, Verified, Pending) and RBAC scoping
 */
export async function getPaymentRecordsAction(params: {
  tab?: "ALL" | "VERIFIED" | "PENDING";
  search?: string;
  bankType?: string;
} = {}): Promise<
  ActionResult<{
    payments: SerializedPaymentRecord[];
    isAccountsUser: boolean;
    canManageAll: boolean;
  }>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);
    const isAccountsUser =
      user.department?.toLowerCase() === "account" ||
      user.department?.toLowerCase() === "accounts" ||
      scope.canManageAll;

    const { tab = "ALL", search = "", bankType = "ALL" } = params;

    const where: Prisma.PaymentRecordWhereInput = {};

    // Tab Filtering
    if (tab === "VERIFIED") {
      where.status = PaymentVerificationStatus.VERIFIED;
    } else if (tab === "PENDING") {
      where.status = PaymentVerificationStatus.UNVERIFIED;
    }

    // Bank Type Filtering
    if (bankType && bankType !== "ALL") {
      where.bankType = bankType as SalaryEntity;
    }

    // RBAC Scoping: Sales TMs only see payments they recorded or their assigned clients
    if (!scope.canViewAll && !isAccountsUser && scope.allowedUserIds) {
      where.OR = [
        { recordedById: { in: scope.allowedUserIds } },
        { client: { assignedEmployeeId: { in: scope.allowedUserIds } } },
        { client: { createdById: { in: scope.allowedUserIds } } },
      ];
    }

    // Search Query
    if (search.trim()) {
      const q = search.trim();
      const conditions: Prisma.PaymentRecordWhereInput[] = [
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
        { client: { phone: { contains: q } } },
        { transactionRef: { contains: q, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: conditions }];
      } else {
        where.OR = conditions;
      }
    }

    const records = await db.paymentRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            dealNumber: true,
            title: true,
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        verifiedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const serialized: SerializedPaymentRecord[] = records.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      clientId: r.clientId,
      clientName: r.client.name,
      clientPhone: r.client.phone,
      clientEmail: r.client.email,
      dealId: r.dealId,
      dealNumber: r.deal?.dealNumber || null,
      dealTitle: r.deal?.title || null,
      amount: Number(r.amount),
      bankType: r.bankType,
      paymentType: r.paymentType,
      status: r.status,
      paymentMode: r.paymentMode,
      transactionRef: r.transactionRef,
      screenshotUrl: r.screenshotUrl,
      screenshotKey: r.screenshotKey,
      paymentDate: r.paymentDate.toISOString().split("T")[0],
      remarks: r.remarks,
      isConvertedToDeal: r.isConvertedToDeal || Boolean(r.dealId),
      verifiedById: r.verifiedById,
      verifiedByName: r.verifiedBy
        ? `${r.verifiedBy.firstName} ${r.verifiedBy.lastName}`.trim()
        : null,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      recordedById: r.recordedById,
      recordedByName: r.recordedBy
        ? `${r.recordedBy.firstName} ${r.recordedBy.lastName}`.trim()
        : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        payments: serialized,
        isAccountsUser,
        canManageAll: scope.canManageAll,
      },
    };
  } catch (error: any) {
    console.error("[getPaymentRecordsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load payment records." };
  }
}

/**
 * Creates a new Payment Record, defaults to UNVERIFIED, and notifies Accounts Department
 */
export async function createPaymentRecordAction(
  raw: PaymentRecordFormData
): Promise<ActionResult<SerializedPaymentRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = paymentRecordSchema.parse(raw);

    // Remaining payment must be linked to an existing deal
    if (parsed.paymentType === PaymentType.REMAINING_PAYMENT && !parsed.dealId) {
      return {
        success: false,
        error: "Remaining payment must be linked to an existing Client Deal.",
      };
    }

    // Generate unique sequential receipt number: RCP-YYYY-XXXX
    const count = await db.paymentRecord.count();
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const client = await db.client.findUnique({
      where: { id: parsed.clientId },
      select: { id: true, name: true, phone: true, email: true },
    });

    if (!client) {
      return { success: false, error: "Selected client not found in database." };
    }

    const payment = await db.paymentRecord.create({
      data: {
        receiptNumber,
        clientId: parsed.clientId,
        dealId: parsed.dealId || null,
        amount: new Prisma.Decimal(parsed.amount),
        bankType: parsed.bankType,
        paymentType: parsed.paymentType,
        status: PaymentVerificationStatus.UNVERIFIED,
        paymentMode: parsed.paymentMode || "BANK_TRANSFER",
        transactionRef: parsed.transactionRef || null,
        screenshotUrl: parsed.screenshotUrl || null,
        screenshotKey: parsed.screenshotKey || null,
        paymentDate: new Date(parsed.paymentDate),
        remarks: parsed.remarks || null,
        recordedById: user.id,
      },
      include: {
        deal: { select: { id: true, dealNumber: true, title: true } },
      },
    });

    // Notify Accounts Department members
    try {
      const accountsEmployees = await db.employee.findMany({
        where: {
          OR: [
            { department: { in: ["Account", "Accounts"] } },
            { role: "Admin" },
          ],
        },
        select: { id: true },
      });

      if (accountsEmployees.length > 0) {
        await db.notification.createMany({
          data: accountsEmployees.map((emp) => ({
            recipientId: emp.id,
            title: `New Payment Receipt ${receiptNumber}`,
            message: `${user.name} logged ₹${parsed.amount.toLocaleString("en-IN")} for ${client.name} (${parsed.bankType} - ${parsed.paymentType}). Verification pending.`,
            type: NotificationType.ACTION_REQUIRED,
            actionUrl: "/crm/payments",
          })),
        });
      }
    } catch (notifErr) {
      console.warn("[Payment Notification Error]:", notifErr);
    }

    revalidatePath("/crm/payments");

    return {
      success: true,
      data: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        dealId: payment.dealId,
        dealNumber: payment.deal?.dealNumber || null,
        dealTitle: payment.deal?.title || null,
        amount: Number(payment.amount),
        bankType: payment.bankType,
        paymentType: payment.paymentType,
        status: payment.status,
        paymentMode: payment.paymentMode,
        transactionRef: payment.transactionRef,
        screenshotUrl: payment.screenshotUrl,
        screenshotKey: payment.screenshotKey,
        paymentDate: payment.paymentDate.toISOString().split("T")[0],
        remarks: payment.remarks,
        isConvertedToDeal: false,
        verifiedById: null,
        verifiedByName: null,
        verifiedAt: null,
        recordedById: user.id,
        recordedByName: user.name,
        createdAt: payment.createdAt.toISOString(),
        updatedAt: payment.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[createPaymentRecordAction Error]:", error);
    return { success: false, error: error.message || "Failed to create payment record." };
  }
}

/**
 * Creates a client on the spot from within the payment modal
 */
export async function createQuickClientAction(
  raw: QuickClientFormData
): Promise<ActionResult<{ id: string; name: string; phone: string; email: string | null }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const parsed = quickClientSchema.parse(raw);

    const existingPhone = await db.client.findUnique({
      where: { phone: parsed.phone },
    });

    if (existingPhone) {
      return {
        success: false,
        error: `Client with phone number ${parsed.phone} already exists (${existingPhone.name}). Please select existing client.`,
      };
    }

    const count = await db.client.count();
    const clientNumber = `CL-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const client = await db.client.create({
      data: {
        clientNumber,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || null,
        createdById: user.id,
        assignedEmployeeId: user.id,
      },
    });

    revalidatePath("/crm/payments");
    revalidatePath("/crm/clients");

    return {
      success: true,
      data: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create client." };
  }
}

/**
 * Accounts verification: updates status to VERIFIED, confirms Bank Type (BSPL/BSAPL),
 * credits Deal Received Amount if Remaining Payment, and notifies the BDM.
 */
export async function verifyPaymentRecordAction(
  paymentId: string,
  confirmedBankType: SalaryEntity,
  remarks?: string
): Promise<ActionResult<SerializedPaymentRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
      include: {
        client: true,
        deal: true,
        recordedBy: true,
      },
    });

    if (!payment) return { success: false, error: "Payment record not found." };

    // Update payment record to VERIFIED
    const updated = await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        status: PaymentVerificationStatus.VERIFIED,
        bankType: confirmedBankType,
        verifiedById: user.id,
        verifiedAt: new Date(),
        remarks: remarks || payment.remarks,
      },
      include: {
        client: true,
        deal: true,
        recordedBy: true,
        verifiedBy: true,
      },
    });

    // If remaining payment is linked to a Deal, update Deal financial balances
    if (payment.dealId && payment.paymentType === PaymentType.REMAINING_PAYMENT) {
      const deal = await db.deal.findUnique({
        where: { id: payment.dealId },
        include: { services: true },
      });

      if (deal) {
        const newReceived = Number(deal.amountReceived || 0) + Number(payment.amount);
        const total = Number(deal.totalValue || deal.value || 0);
        const newPending = Math.max(0, total - newReceived);

        await db.deal.update({
          where: { id: payment.dealId },
          data: {
            amountReceived: new Prisma.Decimal(newReceived),
            amountPending: new Prisma.Decimal(newPending),
          },
        });
      }
    }

    // Send notification to recording BDM
    if (payment.recordedById) {
      try {
        await db.notification.create({
          data: {
            recipientId: payment.recordedById,
            title: `Payment Receipt Verified (${payment.receiptNumber})`,
            message: `Payment of ₹${Number(payment.amount).toLocaleString("en-IN")} for ${payment.client.name} has been verified under ${confirmedBankType}.`,
            type: NotificationType.SUCCESS,
            actionUrl: "/crm/payments",
          },
        });
      } catch (err) {
        console.warn("[Verification Notification Error]:", err);
      }
    }

    revalidatePath("/crm/payments");
    revalidatePath("/crm/deals");

    return {
      success: true,
      data: {
        id: updated.id,
        receiptNumber: updated.receiptNumber,
        clientId: updated.clientId,
        clientName: updated.client.name,
        clientPhone: updated.client.phone,
        clientEmail: updated.client.email,
        dealId: updated.dealId,
        dealNumber: updated.deal?.dealNumber || null,
        dealTitle: updated.deal?.title || null,
        amount: Number(updated.amount),
        bankType: updated.bankType,
        paymentType: updated.paymentType,
        status: updated.status,
        paymentMode: updated.paymentMode,
        transactionRef: updated.transactionRef,
        screenshotUrl: updated.screenshotUrl,
        screenshotKey: updated.screenshotKey,
        paymentDate: updated.paymentDate.toISOString().split("T")[0],
        remarks: updated.remarks,
        isConvertedToDeal: updated.isConvertedToDeal || Boolean(updated.dealId),
        verifiedById: user.id,
        verifiedByName: user.name,
        verifiedAt: updated.verifiedAt?.toISOString() || null,
        recordedById: updated.recordedById,
        recordedByName: updated.recordedBy
          ? `${updated.recordedBy.firstName} ${updated.recordedBy.lastName}`.trim()
          : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("[verifyPaymentRecordAction Error]:", error);
    return { success: false, error: error.message || "Failed to verify payment." };
  }
}

/**
 * Accounts rejection: marks record REJECTED and notifies BDM
 */
export async function rejectPaymentRecordAction(
  paymentId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
      include: { client: true },
    });

    if (!payment) return { success: false, error: "Payment record not found." };

    await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        status: PaymentVerificationStatus.REJECTED,
        remarks: reason ? `[Rejected by Accounts]: ${reason}` : payment.remarks,
      },
    });

    if (payment.recordedById) {
      try {
        await db.notification.create({
          data: {
            recipientId: payment.recordedById,
            title: `Payment Receipt Declined (${payment.receiptNumber})`,
            message: `Payment of ₹${Number(payment.amount).toLocaleString("en-IN")} for ${payment.client.name} was rejected: ${reason || "Unverified credentials/receipt"}.`,
            type: NotificationType.WARNING,
            actionUrl: "/crm/payments",
          },
        });
      } catch (err) {
        console.warn("[Rejection Notification Error]:", err);
      }
    }

    revalidatePath("/crm/payments");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to reject payment record." };
  }
}

/**
 * 1-Click Convert to Deal from First Payment: creates a draft Deal and pre-links it
 */
export async function convertPaymentToDraftDealAction(
  paymentId: string
): Promise<ActionResult<{ dealId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
      include: { client: { include: { company: true } } },
    });

    if (!payment) return { success: false, error: "Payment record not found." };

    // If already converted, return existing deal ID
    if (payment.dealId) {
      return { success: true, data: { dealId: payment.dealId } };
    }

    // Generate unique sequential deal number: DL-YYYY-XXXX
    const count = await db.deal.count();
    const dealNumber = `DL-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const amount = Number(payment.amount);

    const deal = await db.deal.create({
      data: {
        dealNumber,
        title: `${payment.client.name} - Engagement Deal`,
        clientId: payment.clientId,
        companyName: payment.client.company?.name || payment.client.companyName || payment.client.name,
        companyId: payment.client.companyId || null,
        contactName: payment.client.name,
        contactPhone: payment.client.phone,
        contactEmail: payment.client.email,
        value: new Prisma.Decimal(amount),
        totalValue: new Prisma.Decimal(amount),
        subTotal: new Prisma.Decimal(Math.round((amount / 1.18) * 100) / 100),
        gstAmount: new Prisma.Decimal(Math.round((amount - amount / 1.18) * 100) / 100),
        amountReceived: new Prisma.Decimal(amount),
        amountPending: new Prisma.Decimal(0),
        bookingDate: payment.paymentDate,
        assignedEmployeeId: user.id,
        stage: DealStage.LEAD,
        accountsStatus: "DRAFT",
        paymentScreenshotUrl: payment.screenshotUrl,
        paymentScreenshotKey: payment.screenshotKey,
      },
    });

    // Mark payment as converted
    await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        dealId: deal.id,
        isConvertedToDeal: true,
      },
    });

    revalidatePath("/crm/payments");
    revalidatePath("/crm/deals");

    return {
      success: true,
      data: { dealId: deal.id },
    };
  } catch (error: any) {
    console.error("[convertPaymentToDraftDealAction Error]:", error);
    return { success: false, error: error.message || "Failed to convert payment to Deal." };
  }
}

/**
 * Deletes payment record
 */
export async function deletePaymentRecordAction(id: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const payment = await db.paymentRecord.findUnique({ where: { id } });
    if (!payment) return { success: false, error: "Payment record not found." };

    await db.paymentRecord.delete({ where: { id } });
    revalidatePath("/crm/payments");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete payment record." };
  }
}

/**
 * Bulk upload historical payment records
 */
export async function bulkUploadPaymentsAction(
  rows: any[]
): Promise<ActionResult<{ insertedCount: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    let count = await db.paymentRecord.count();
    let inserted = 0;

    for (const r of rows) {
      if (!r.clientId || !r.amount) continue;

      count++;
      const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;

      await db.paymentRecord.create({
        data: {
          receiptNumber,
          clientId: r.clientId,
          amount: new Prisma.Decimal(Number(r.amount) || 1000),
          bankType: r.bankType === "BSAPL" ? SalaryEntity.BSAPL : SalaryEntity.BSPL,
          paymentType: r.paymentType === "REMAINING_PAYMENT" ? PaymentType.REMAINING_PAYMENT : PaymentType.FIRST_PAYMENT,
          status: PaymentVerificationStatus.UNVERIFIED,
          paymentMode: r.paymentMode || "BANK_TRANSFER",
          transactionRef: r.transactionRef || null,
          screenshotUrl: r.screenshotUrl || null,
          paymentDate: r.paymentDate ? new Date(r.paymentDate) : new Date(),
          remarks: r.remarks || null,
          recordedById: user.id,
        },
      });
      inserted++;
    }

    revalidatePath("/crm/payments");
    return { success: true, data: { insertedCount: inserted } };
  } catch (error: any) {
    return { success: false, error: error.message || "Bulk upload failed." };
  }
}

/**
 * Fetches clients and existing deals for payment creation lookups
 */
export async function getPaymentMasterDataAction(): Promise<
  ActionResult<PaymentMasterData>
> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const scope = await getCrmUserScope(user);

    const clientWhere: Prisma.ClientWhereInput = {};
    if (!scope.canViewAll && scope.allowedUserIds) {
      clientWhere.OR = [
        { createdById: { in: scope.allowedUserIds } },
        { assignedEmployeeId: { in: scope.allowedUserIds } },
      ];
    }

    const [clients, deals] = await Promise.all([
      db.client.findMany({
        where: clientWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          companyName: true,
        },
        orderBy: { name: "asc" },
        take: 150,
      }),
      db.deal.findMany({
        select: {
          id: true,
          dealNumber: true,
          title: true,
          clientId: true,
          contactName: true,
          totalValue: true,
          value: true,
          amountReceived: true,
          amountPending: true,
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
    ]);

    return {
      success: true,
      data: {
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          companyName: c.companyName,
        })),
        deals: deals.map((d) => ({
          id: d.id,
          dealNumber: d.dealNumber,
          title: d.title,
          clientId: d.clientId,
          clientName: d.contactName,
          totalValue: Number(d.totalValue || d.value || 0),
          amountReceived: Number(d.amountReceived || 0),
          amountPending: Number(d.amountPending || 0),
        })),
      },
    };
  } catch (error: any) {
    console.error("[getPaymentMasterDataAction Error]:", error);
    return { success: false, error: error.message || "Failed to load payment master data." };
  }
}
