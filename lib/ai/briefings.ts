import { db } from "@/lib/db";
import { getOrCreateAiAgentEmployee, getOrCreateSuperAdminAiConversation } from "./agent";
import {
  getDepartmentAttendance,
  getRevenueSummary,
  getZeroRevenueSalespeople,
  getTopSalesPerformers,
} from "./tools";

export type BriefingType =
  | "MORNING_GREETING"
  | "ATTENDANCE_REPORT"
  | "MIDDAY_REVENUE"
  | "EVENING_WRAPUP";

/**
 * Executes a scheduled briefing, logs to AiCronLog, and posts rich report cards to Super Admin AI chat.
 */
export async function triggerScheduledBriefing(
  briefingType: BriefingType,
  options?: { force?: boolean }
) {
  const today = new Date().toISOString().split("T")[0];

  // Check idempotency unless force=true
  if (!options?.force) {
    const existingLog = await db.aiCronLog.findUnique({
      where: {
        scheduleKey_date: {
          scheduleKey: briefingType,
          date: today,
        },
      },
    });

    if (existingLog && existingLog.status === "SUCCESS") {
      return {
        alreadyExecuted: true,
        message: `Briefing ${briefingType} has already run for ${today}.`,
        log: existingLog,
      };
    }
  }

  // Find Super Admin
  const superAdmin = await db.employee.findFirst({
    where: { systemRole: "SUPER_ADMIN" },
  });

  if (!superAdmin) {
    throw new Error("No Super Administrator found in the system.");
  }

  const aiBot = await getOrCreateAiAgentEmployee();
  const conversation = await getOrCreateSuperAdminAiConversation(superAdmin.id);

  let createdMessage = null;

  switch (briefingType) {
    case "MORNING_GREETING": {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const content = `🌅 **Good morning, ${superAdmin.firstName}!**

Today is **${dateStr}**.
BharatEdge AI Copilot is fully online and monitoring CRM operations, bank transactions for BSPL & BSAPL, and workforce attendance.

📌 **Daily Executive Focus:**
- Real-time attendance cutoff review at **10:15 AM IST**.
- Live Inflow & Zero-Revenue Sales Audit at **2:30 PM IST**.
- End-of-Day Financial Wrap-up at **6:30 PM IST**.

Have a productive and high-velocity business day! You can query me anytime below for live numbers or custom operational breakdowns.`;

      createdMessage = await db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: aiBot.id,
          content,
          messageType: "TEXT",
        },
      });
      break;
    }

    case "ATTENDANCE_REPORT": {
      const attData = await getDepartmentAttendance({ date: today });
      const summary = attData.summary;

      const content = `📋 **Daily Attendance Intelligence Briefing (10:15 AM IST)**

**Headcount Summary:**
- **Total Workforce:** ${summary.totalEmployees}
- **Present / Active:** ${summary.totalPresent} (${summary.attendanceRate})
- **On Approved Leave:** ${summary.totalOnLeave}
- **Absent / Unaccounted:** ${summary.totalAbsent}

Detailed department-wise breakdown with individual employee hours is attached below:`;

      createdMessage = await db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: aiBot.id,
          content,
          messageType: "AI_REPORT",
          metadata: {
            reportType: "ATTENDANCE",
            date: today,
            summary: attData.summary,
            departments: attData.departments,
          },
        },
      });
      break;
    }

    case "MIDDAY_REVENUE": {
      const revenue = await getRevenueSummary({ dateRange: "today" });
      const zeroRev = await getZeroRevenueSalespeople({ date: today });

      const content = `⚡ **Mid-Day Revenue & Collections Pulse (2:30 PM IST)**

**Inflow Snapshot (Today):**
- **Total Inflow:** ${revenue.formattedTotalInflow}
- **Verified by Accounts:** ${revenue.formattedVerifiedInflow}
- **Pending Verification:** ${revenue.formattedUnverifiedInflow}
- **BSPL:** ${revenue.formattedBsplInflow} | **BSAPL:** ${revenue.formattedBsaplInflow}

⚠️ **Sales Velocity Alert:** **${zeroRev.zeroRevenueCount}** active Sales BDMs currently at **₹0 revenue** today. Detailed card attached below:`;

      createdMessage = await db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: aiBot.id,
          content,
          messageType: "AI_REPORT",
          metadata: {
            reportType: "REVENUE",
            isMidday: true,
            totalRevenue: revenue.formattedTotalInflow,
            verifiedRevenue: revenue.formattedVerifiedInflow,
            unverifiedRevenue: revenue.formattedUnverifiedInflow,
            bsplRevenue: revenue.formattedBsplInflow,
            bsaplRevenue: revenue.formattedBsaplInflow,
            zeroRevenueBDMs: zeroRev.salespeople.map((sp) => ({
              name: sp.name,
              teamLeader: sp.teamLeader,
              attendanceStatus: sp.attendanceStatus,
            })),
          },
        },
      });
      break;
    }

    case "EVENING_WRAPUP": {
      const revenue = await getRevenueSummary({ dateRange: "today" });
      const zeroRev = await getZeroRevenueSalespeople({ date: today });
      const topPerformers = await getTopSalesPerformers({ dateRange: "today", limit: 5 });

      const content = `🏁 **Daily Executive Revenue & Operations Wrap-up (6:30 PM IST)**

**End of Day Final Collections:**
- **Total Inflow:** ${revenue.formattedTotalInflow} (${revenue.totalPaymentRecords} receipts)
- **Verified Collections:** ${revenue.formattedVerifiedInflow}
- **Awaiting Verification:** ${revenue.formattedUnverifiedInflow}
- **BSPL vs BSAPL:** ${revenue.formattedBsplInflow} vs ${revenue.formattedBsaplInflow}

${topPerformers.performers.length > 0 ? `🏆 **Top Performers of the Day:**\n${topPerformers.performers.map((p) => `- **${p.name}:** ${p.formattedReceived} (${p.dealCount} deals)`).join("\n")}` : ""}

Review the full daily revenue card and zero-revenue audit below:`;

      createdMessage = await db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: aiBot.id,
          content,
          messageType: "AI_REPORT",
          metadata: {
            reportType: "REVENUE",
            isEveningWrapup: true,
            totalRevenue: revenue.formattedTotalInflow,
            verifiedRevenue: revenue.formattedVerifiedInflow,
            unverifiedRevenue: revenue.formattedUnverifiedInflow,
            bsplRevenue: revenue.formattedBsplInflow,
            bsaplRevenue: revenue.formattedBsaplInflow,
            zeroRevenueBDMs: zeroRev.salespeople.map((sp) => ({
              name: sp.name,
              teamLeader: sp.teamLeader,
              attendanceStatus: sp.attendanceStatus,
            })),
          },
        },
      });
      break;
    }
  }

  // Touch conversation timestamp
  await db.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // Record idempotency in AiCronLog
  const log = await db.aiCronLog.upsert({
    where: {
      scheduleKey_date: {
        scheduleKey: briefingType,
        date: today,
      },
    },
    update: {
      status: "SUCCESS",
      details: { messageId: createdMessage?.id },
    },
    create: {
      scheduleKey: briefingType,
      date: today,
      status: "SUCCESS",
      details: { messageId: createdMessage?.id },
    },
  });

  return {
    success: true,
    briefingType,
    date: today,
    messageId: createdMessage?.id,
    log,
  };
}
