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

  // Check whether user has organizational HR admin access or self-service access
  const isHrAdmin =
    user.role === Role.Admin ||
    user.role === Role.HRMS ||
    user.systemRole === "SUPER_ADMIN" ||
    user.systemRole === "HR_ADMIN" ||
    (user.systemRole === "ADMIN_HOD" && (user.department || "").toLowerCase().includes("hr"));

  // Fetch today's personal attendance state for the user's widget
  const todayAttendanceRes = await getTodayAttendanceAction();
  const initialClockData = todayAttendanceRes.success ? todayAttendanceRes.data : null;

  // Fetch initial report:
  // For HR Admin: default to today (organization-wide)
  // For Self-Service: default to 30-day window so employee sees their recent daily attendance history
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const reportRes = await getAttendanceReportAction({
    startDate: isHrAdmin ? todayStr : thirtyDaysAgo,
    endDate: todayStr,
    page: 1,
    pageSize: 10,
  });

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
              Active shift punch card, 5-minute automated idle pause, and employee attendance records.
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

        {/* 2. Attendance View: Organization Administration for HR Admins, Personal Self-Service History for Staff */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {isHrAdmin ? "Staff Attendance Administration" : "Daily Attendance History"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isHrAdmin
                ? "Real-time staff punch logs, shift intervals, idle analytics, and CSV report export."
                : "Your daily punch card records, shift duration logs, meeting mode sessions, and working hours."}
            </p>
          </div>
          <AttendanceReportView
            initialRecords={initialRecords}
            initialTotal={initialTotal}
            initialStats={initialStats}
            isSelfService={!isHrAdmin}
          />
        </div>
      </div>
    </PageTransition>
  );
}
