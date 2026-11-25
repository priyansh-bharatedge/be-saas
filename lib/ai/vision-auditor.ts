import OpenAI from "openai";
import { db } from "@/lib/db";
import { NotificationType, Prisma } from "@prisma/client";
import { getOrCreateAiAgentEmployee, getOrCreateSuperAdminAiConversation } from "./agent";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface VisionAuditResult {
  isLegible: boolean;
  paymentStatus: "SUCCESS" | "FAILED" | "PENDING";
  extractedAmounts: number[];
  totalVerifiedAmount: number;
  utrReference?: string | null;
  transactionDate?: string | null;
  auditNotes: string;
}

/**
 * Asynchronously audits all Cloudflare R2 payment screenshot(s) for a given PaymentRecord
 * using OpenAI GPT-4o Multimodal Vision. Reconciles amounts and fires alerts if discrepancies occur.
 */
export async function auditPaymentScreenshots(paymentId: string): Promise<void> {
  try {
    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
      include: {
        client: true,
        deal: true,
        recordedBy: {
          include: {
            teamLeader: true,
          },
        },
      },
    });

    if (!payment) {
      console.warn(`[VisionAuditor] PaymentRecord ${paymentId} not found.`);
      return;
    }

    // Collect all screenshot URLs (support multi-screenshots array & legacy single URL)
    const urls: string[] = [];
    if (Array.isArray(payment.screenshotUrls) && payment.screenshotUrls.length > 0) {
      payment.screenshotUrls.forEach((u) => {
        if (typeof u === "string" && u.trim()) urls.push(u.trim());
      });
    }
    if (urls.length === 0 && payment.screenshotUrl) {
      urls.push(payment.screenshotUrl);
    }

    // If no screenshots attached, mark as UNREADABLE
    if (urls.length === 0) {
      await db.paymentRecord.update({
        where: { id: paymentId },
        data: {
          aiVerificationStatus: "UNREADABLE",
          aiAuditSummary: "No payment receipts or screenshots were attached to this record.",
          aiAuditedAt: new Date(),
        },
      });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("[VisionAuditor] OPENAI_API_KEY missing. Skipping AI vision audit.");
      return;
    }

    // Build multimodal message content with image URLs
    const contentPayload: any[] = [
      {
        type: "text",
        text: `You are an expert Forensic Payment Auditor for BharatEdge Enterprise in India.
Analyze the attached payment screenshot(s) (UPI apps like Google Pay, PhonePe, Paytm, or Net Banking receipts / NEFT / RTGS / IMPS).

Extract and verify:
1. isLegible: Is the screenshot clear and legible? (true/false)
2. paymentStatus: Is the transaction marked as "SUCCESS" / "Completed", "FAILED" / "Declined", or "PENDING" / "Processing"?
3. extractedAmounts: Array of numbers representing the exact amounts shown in each screenshot in Indian Rupees (INR).
4. totalVerifiedAmount: Sum of all verified payment amounts across the screenshots. If failed or illegible, 0.
5. utrReference: UTR number, UPI transaction ID, or bank reference number, if visible.
6. transactionDate: Transaction timestamp or date (YYYY-MM-DD), if visible.
7. auditNotes: Concise, professional summary of your findings (bank, payer name, payee name/VPA, timestamp, any red flags).

Respond ONLY with valid JSON in this schema:
{
  "isLegible": boolean,
  "paymentStatus": "SUCCESS" | "FAILED" | "PENDING",
  "extractedAmounts": number[],
  "totalVerifiedAmount": number,
  "utrReference": string | null,
  "transactionDate": string | null,
  "auditNotes": string
}`,
      },
    ];

    urls.forEach((url) => {
      contentPayload.push({
        type: "image_url",
        image_url: {
          url,
          detail: "high",
        },
      });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: contentPayload,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const textOutput = response.choices[0]?.message?.content;
    if (!textOutput) {
      throw new Error("No response content from OpenAI Vision model.");
    }

    const auditData: VisionAuditResult = JSON.parse(textOutput);
    const enteredAmount = Number(payment.amount);
    const detectedAmount = Number(auditData.totalVerifiedAmount || 0);
    const variance = enteredAmount - detectedAmount;

    const isAmountMatched =
      auditData.isLegible &&
      auditData.paymentStatus === "SUCCESS" &&
      Math.abs(enteredAmount - detectedAmount) < 0.01;

    const newStatus = isAmountMatched
      ? "MATCHED"
      : !auditData.isLegible
      ? "UNREADABLE"
      : "MISMATCH";

    // Update PaymentRecord with audit result
    await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        aiVerificationStatus: newStatus,
        aiDetectedAmount: new Prisma.Decimal(detectedAmount),
        aiAuditSummary: auditData.auditNotes,
        aiAuditedAt: new Date(),
        ...(auditData.utrReference && !payment.transactionRef
          ? { transactionRef: auditData.utrReference }
          : {}),
      },
    });

    // If MATCHED: Silently update database (no alert spam)
    if (isAmountMatched) {
      console.log(`[VisionAuditor] Payment ${payment.receiptNumber} MATCHED silently.`);
      return;
    }

    // DISCREPANCY OR UNREADABLE DETECTED: FIRE DUAL ALERTS
    const salesperson = payment.recordedBy;
    const salespersonName = salesperson
      ? `${salesperson.firstName} ${salesperson.lastName}`.trim()
      : "Unknown Staff";
    const teamLeader = salesperson?.teamLeader;
    const teamLeaderName = teamLeader
      ? `${teamLeader.firstName} ${teamLeader.lastName}`.trim()
      : "Direct / HOD";

    // 1. Super Admin Alert: Post AI_ALERT Card in Super Admin AI Chat
    const superAdmins = await db.employee.findMany({
      where: { systemRole: "SUPER_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });

    const aiBot = await getOrCreateAiAgentEmployee();

    for (const sa of superAdmins) {
      const conv = await getOrCreateSuperAdminAiConversation(sa.id);

      await db.chatMessage.create({
        data: {
          conversationId: conv.id,
          senderId: aiBot.id,
          messageType: "AI_ALERT",
          content: `⚠️ **Payment Discrepancy Alert: Receipt #${payment.receiptNumber}**\nVariance of **₹${Math.abs(variance).toLocaleString("en-IN")}** detected between salesperson entered amount (₹${enteredAmount.toLocaleString("en-IN")}) and verified screenshot amount (₹${detectedAmount.toLocaleString("en-IN")}).`,
          metadata: {
            paymentId: payment.id,
            receiptNumber: payment.receiptNumber,
            salespersonName,
            teamLeaderName,
            clientName: payment.client.name,
            enteredAmount,
            aiDetectedAmount: detectedAmount,
            variance,
            status: newStatus,
            auditSummary: auditData.auditNotes,
            screenshotUrls: urls,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

    // 2. Salesperson's Team Leader Alert: Notification Bell ONLY (ACTION_REQUIRED)
    if (salesperson?.teamLeaderId) {
      await db.notification.create({
        data: {
          recipientId: salesperson.teamLeaderId,
          type: NotificationType.ACTION_REQUIRED,
          title: `Action Required: Payment Discrepancy (Receipt #${payment.receiptNumber})`,
          message: `Vision AI detected an amount discrepancy on client ${payment.client.name}'s payment logged by ${salespersonName}. Entered: ₹${enteredAmount.toLocaleString("en-IN")}, Verified: ₹${detectedAmount.toLocaleString("en-IN")}. Please review.`,
          actionUrl: `/crm/payments`,
        },
      });
    }
  } catch (error: any) {
    console.error("[VisionAuditor Error]:", error);
  }
}
