import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";
import ClockWidget from "@/components/attendance/ClockWidget";
import AttendanceReportView from "@/components/attendance/AttendanceReportView";
import {
  getTodayAttendanceAction,
  getAttendanceReportAction,
} from "@/lib/actions/attendance";
import PageTransition from "@/components/animations/PageTransition";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Time & Attendance Logs • BharatEdge HRMS",
  description:
    "Real-time clock-in/out tracking with 5-minute idle auto-detection and administration reporting",
};

export default async function HRMSAttendancePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // RBAC Permission Check
  const hasAccess = user.role === Role.Admin || user.role === Role.HRMS;

  // Fetch today's personal attendance state for the user's widget
  const todayAttendanceRes = await getTodayAttendanceAction();
  const initialClockData = todayAttendanceRes.success ? todayAttendanceRes.data : null;

  // If authorized, fetch initial day-wise administration attendance report
  const todayStr = new Date().toISOString().split("T")[0];
  const reportRes = hasAccess
    ? await getAttendanceReportAction({
        startDate: todayStr,
        endDate: todayStr,
        page: 1,
        pageSize: 10,
      })
    : null;

  const initialRecords = reportRes?.success && reportRes.data ? reportRes.data.records : [];
  const initialTotal = reportRes?.success && reportRes.data ? reportRes.data.total : 0;
  const initialStats = reportRes?.success && reportRes.data
    ? reportRes.data.stats
    : {
        totalEmployees: 0,
        activeNow: 0,
        idleNow: 0,
        clockedOut: 0,
        avgWorkingHours: 0,
      };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Page Title & Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Time & Attendance Tracking
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Active shift punch card, 5-minute automated idle pause, and HR administration records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3.5 py-1 rounded-full bg-white/80 border border-slate-200/80 text-slate-700 font-semibold shadow-2xs">
              Role: {user.role}
            </span>
          </div>
        </div>

        {/* 1. Employee Dashboard Clock-In/Out Widget */}
        <ClockWidget initialData={initialClockData} />

        {/* 2. HRMS Attendance Administration View */}
        {hasAccess ? (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Staff Attendance Administration
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Real-time staff punch logs, shift intervals, idle analytics, and CSV report export.
              </p>
            </div>
            <AttendanceReportView
              initialRecords={initialRecords}
              initialTotal={initialTotal}
              initialStats={initialStats}
            />
          </div>
        ) : (
          <div className="p-8 rounded-[32px] bg-white/75 backdrop-blur-xl border border-amber-200 text-center space-y-3">
            <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">
              Administrative Access Restricted
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your account ({user.email} - {user.role}) has permission to use the Personal Time
              Tracker above, but viewing company-wide attendance logs requires Admin or HRMS role.
            </p>
            <Link href="/portal">
              <Button variant="outline" size="sm" className="mt-2 text-xs">
                Back to Central Portal
              </Button>
            </Link>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
