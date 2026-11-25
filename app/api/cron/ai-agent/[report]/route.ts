import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { triggerScheduledBriefing, BriefingType } from "@/lib/ai/briefings";

export const dynamic = "force-dynamic";

const REPORT_TYPE_MAP: Record<string, BriefingType> = {
  "morning-greeting": "MORNING_GREETING",
  "attendance-report": "ATTENDANCE_REPORT",
  "midday-revenue": "MIDDAY_REVENUE",
  "evening-wrapup": "EVENING_WRAPUP",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ report: string }> }
) {
  return handleReportTrigger(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ report: string }> }
) {
  return handleReportTrigger(req, context);
}

async function handleReportTrigger(
  req: NextRequest,
  context: { params: Promise<{ report: string }> }
) {
  try {
    const { report } = await context.params;
    const briefingType = REPORT_TYPE_MAP[report.toLowerCase()];

    if (!briefingType) {
      return NextResponse.json(
        { error: `Invalid report type: '${report}'. Expected morning-greeting, attendance-report, midday-revenue, or evening-wrapup.` },
        { status: 400 }
      );
    }

    // 1. Check for Authorization header (CRON_SECRET)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "bharatedge-cron-secure-key-2026-superadmin-agent";
    const isCronAuthorized = authHeader === `Bearer ${cronSecret}`;

    // 2. Alternatively check if logged-in user is SUPER_ADMIN (for in-app UI test triggers)
    let isSuperAdmin = false;
    if (!isCronAuthorized) {
      const user = await getCurrentUser();
      if (user?.systemRole === "SUPER_ADMIN") {
        isSuperAdmin = true;
      }
    }

    if (!isCronAuthorized && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid CRON_SECRET or Super Admin session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    const result = await triggerScheduledBriefing(briefingType, { force });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[CronAiAgent Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to trigger scheduled briefing." },
      { status: 500 }
    );
  }
}
