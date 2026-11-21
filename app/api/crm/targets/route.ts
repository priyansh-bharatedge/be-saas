import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { salesTargetSchema } from "@/lib/validations/dashboard";
import { upsertSalesTargetAction } from "@/lib/actions/dashboard";

export const dynamic = "force-dynamic";

/**
 * Sales Targets API Route
 * GET /api/crm/targets?month=11&year=2026
 * Returns month-specific sales targets from PostgreSQL table `sales_targets`.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    const targets = await db.salesTarget.findMany({
      where: { month, year },
      include: {
        bdm: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            workEmail: true,
            department: true,
            monthlyTarget: true,
          },
        },
        setBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: targets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch targets." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/targets
 * Creates or updates a sales revenue target in PostgreSQL `sales_targets` table
 * and synchronizes `employees.monthlyTarget`.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const result = await upsertSalesTargetAction(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to set target." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to set target." },
      { status: 500 }
    );
  }
}
