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
    const attendanceRecords = data.workforceAttendance.employeeAttendanceList;

    // Build CSV with clean RFC-4180 escaping
    const headers = [
      "Record ID",
      "Employee ID",
      "Employee Name",
      "Work Email",
      "Department",
      "Designation",
      "Date",
      "Clock In Time",
      "Clock Out Time",
      "Total Active Hours",
      "Status",
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = attendanceRecords.map((att) => [
      escapeCsv(att.id),
      escapeCsv(att.employeeId),
      escapeCsv(att.name),
      escapeCsv(att.email),
      escapeCsv(att.department),
      escapeCsv(att.designation),
      escapeCsv(att.date),
      escapeCsv(att.clockInTime || "--:--"),
      escapeCsv(att.clockOutTime || "--:--"),
      escapeCsv(String(att.totalActiveHours)),
      escapeCsv(att.status),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bharatedge-attendance-report-${dateStr}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[Export Attendance CSV Error]:", error);
    return NextResponse.json({ error: error?.message || "Export failed" }, { status: 500 });
  }
}
