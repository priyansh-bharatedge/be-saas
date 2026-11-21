import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSuperAdminDashboardData } from "@/lib/actions/super-admin";
import { Role, SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin =
      user.role === Role.Admin ||
      user.systemRole === SystemRole.SUPER_ADMIN ||
      (user as any).isSuperAdmin === true;

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Super Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") || "monthly") as any;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const data = await getSuperAdminDashboardData({ range, from, to });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[SuperAdmin Dashboard API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
