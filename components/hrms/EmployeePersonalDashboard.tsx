"use client";

import Link from "next/link";
import {
  UserCheck,
  CalendarDays,
  Hourglass,
  Activity,
  Clock,
  ArrowRight,
  Palmtree,
  Calendar,
  FileText,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import PageTransition from "@/components/animations/PageTransition";
import HoverCard from "@/components/animations/HoverCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ClockWidget from "@/components/attendance/ClockWidget";
import { TodayAttendanceState } from "@/lib/actions/attendance";
import { LeaveType, ApprovalStatus, TrackerStatus } from "@prisma/client";

interface LeaveBalanceItem {
  id: string;
  leaveType: LeaveType;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
  year: number;
}

interface RecentLeaveRequestItem {
  id: string;
  leaveType: LeaveType;
  startDate: Date | string;
  endDate: Date | string;
  totalDays: number;
  reason: string;
  finalStatus: ApprovalStatus;
  createdAt: Date | string;
}

interface RecentAttendanceItem {
  id: string;
  date: Date | string;
  clockInTime?: Date | string | null;
  clockOutTime?: Date | string | null;
  totalActiveHours: number;
  currentStatus: TrackerStatus;
}

interface EmployeePersonalDashboardProps {
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    workEmail: string;
    department: string;
    designation: string;
    teamLeader?: { firstName: string; lastName: string; employeeId: string } | null;
    reportingManager?: { firstName: string; lastName: string; employeeId: string } | null;
  };
  initialClockData?: TodayAttendanceState | null;
  daysPresent: number;
  workingDaysElapsed: number;
  attendancePercentage: number;
  leaveBalances: LeaveBalanceItem[];
  totalRemainingDays: number;
  pendingRequestsCount: number;
  recentLeaveRequests: RecentLeaveRequestItem[];
  recentAttendanceLogs: RecentAttendanceItem[];
}

export function EmployeePersonalDashboard({
  employee,
  initialClockData,
  daysPresent,
  workingDaysElapsed,
  attendancePercentage,
  leaveBalances,
  totalRemainingDays,
  pendingRequestsCount,
  recentLeaveRequests,
  recentAttendanceLogs,
}: EmployeePersonalDashboardProps) {
  // Extract specific leave balances for Paid Leave and Short Leave
  const paidBal = leaveBalances.find((b) => b.leaveType === "PAID_LEAVE")?.remainingDays ?? 12;
  const shortBal = leaveBalances.find((b) => b.leaveType === "SHORT_LEAVE")?.remainingDays ?? 0;

  const managerOrTl = employee.teamLeader
    ? `${employee.teamLeader.firstName} ${employee.teamLeader.lastName}`
    : employee.reportingManager
      ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}`
      : "Executive Management";

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            Pending
          </span>
        );
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* 1. Employee Profile & Shift Summary Header */}
        <div className="rounded-[32px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar & Meta */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ACCAD5] to-[#F0944D] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                {employee.firstName.charAt(0)}
                {employee.lastName.charAt(0)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {employee.firstName} {employee.lastName}
                  </h1>

                </div>


              </div>
            </div>

            {/* Right: Quick Action Buttons (Add Employee strictly omitted) */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/hrms/leave">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-full px-4 border-slate-200 bg-white/80 hover:bg-white shadow-2xs text-slate-700 font-medium">
                  <Palmtree className="h-3.5 w-3.5 mr-1.5 text-[#F0944D]" /> Apply for Leave
                </Button>
              </Link>
              <Link href="/hrms/attendance">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-full px-4 border-slate-200 bg-white/80 hover:bg-white shadow-2xs text-slate-700 font-medium">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-[#588594]" /> My Attendance
                </Button>
              </Link>
              <Link href="/hrms/calendar">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-full px-4 border-slate-200 bg-white/80 hover:bg-white shadow-2xs text-slate-700 font-medium">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Holidays & Calendar
                </Button>
              </Link>
              <Link href="/hrms/policies">
                <Button variant="outline" size="sm" className="text-xs h-9 rounded-full px-4 border-slate-200 bg-white/80 hover:bg-white shadow-2xs text-slate-700 font-medium">
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Policies
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Personal KPI Cards (4 Cards Scoped Strictly to Logged-in Employee) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Attendance this month */}
          <HoverCard>
            <Card className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  My Attendance This Month
                </CardTitle>
                <div className="w-8 h-8 rounded-xl bg-[#EBF3F6] flex items-center justify-center text-[#588594]">
                  <UserCheck className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {daysPresent} / {workingDaysElapsed}{" "}
                  <span className="text-xs font-medium text-slate-400">Working Days</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {attendancePercentage}% attendance rate
                </p>
              </CardContent>
            </Card>
          </HoverCard>

          {/* Card 2: Leave Balance */}
          <HoverCard>
            <Card className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  My Leave Balance
                </CardTitle>
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#F0944D]">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {totalRemainingDays}{" "}
                  <span className="text-xs font-medium text-slate-400">Days Remaining</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">
                  {paidBal} Paid Leaves remaining • Short Leave: max 2/mo (3 hrs)
                </p>
              </CardContent>
            </Card>
          </HoverCard>

          {/* Card 3: Pending Leave Requests */}
          <HoverCard>
            <Card className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Leave Requests
                </CardTitle>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Hourglass className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {pendingRequestsCount}{" "}
                  <span className="text-xs font-medium text-slate-400">Requests</span>
                </div>
                <p className="text-xs font-medium mt-1">
                  {pendingRequestsCount > 0 ? (
                    <span className="text-amber-600 font-semibold">Awaiting review from TL / HR</span>
                  ) : (
                    <span className="text-slate-400">All applications processed</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </HoverCard>

          {/* Card 4: Today's Shift Status */}
          <HoverCard>
            <Card className="rounded-2xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Today&apos;s Logged Hours
                </CardTitle>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Activity className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {initialClockData?.totalActiveHours
                    ? `${initialClockData.totalActiveHours.toFixed(2)} hrs`
                    : "0.00 hrs"}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {initialClockData && initialClockData.currentStatus !== "CLOCKED_OUT" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Clocked In • {initialClockData.currentStatus === "MEETING_MODE" ? "Meeting Mode" : "Active Shift"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      Clocked Out
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </HoverCard>
        </div>

        {/* 3. Prominent Time & Attendance Tracking Widget (Full Self-Service Clock In/Out) */}
        <div>
          <ClockWidget initialData={initialClockData} />
        </div>

        {/* 4. Personal Recent Activity: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: My Recent Attendance Logs */}
          <Card className="rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">My Recent Attendance Logs</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Your recent shift punches and recorded daily active hours
                </CardDescription>
              </div>
              <Link href="/hrms/attendance">
                <Button variant="ghost" size="sm" className="text-xs text-[#588594] hover:text-[#3D6472] hover:bg-[#EBF3F6]">
                  View All Logs <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentAttendanceLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No recent attendance records found. Clock in above to log your shift.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {recentAttendanceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{formatDate(log.date)}</p>
                        <p className="text-[11px] text-slate-400">
                          In: <span className="font-mono text-slate-600">{formatTime(log.clockInTime)}</span> • Out:{" "}
                          <span className="font-mono text-slate-600">{formatTime(log.clockOutTime)}</span>
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="font-mono font-bold text-slate-900 block">
                          {Number(log.totalActiveHours).toFixed(2)} hrs
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.currentStatus === "CLOCKED_OUT"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                        >
                          {log.currentStatus === "CLOCKED_OUT" ? "Completed" : "Active Shift"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: My Recent Leave Applications */}
          <Card className="rounded-3xl border border-white/80 bg-white/80 backdrop-blur-md shadow-2xs overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">My Recent Leave Requests</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Your time-off requests and approval progress
                </CardDescription>
              </div>
              <Link href="/hrms/leave">
                <Button variant="ghost" size="sm" className="text-xs text-[#F0944D] hover:text-[#C66318] hover:bg-orange-50">
                  Apply / View Leaves <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentLeaveRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No leave requests submitted yet. Click &apos;Apply / View Leaves&apos; to request time off.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {recentLeaveRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{req.leaveType}</span>
                          <span className="font-mono text-[11px] text-slate-400">
                            ({req.totalDays} {req.totalDays === 1 ? "day" : "days"})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {formatDate(req.startDate)} &rarr; {formatDate(req.endDate)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{req.reason}</p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(req.finalStatus)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 5. Quick Access Action Hub Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <Link href="/hrms/leave" className="group">
            <div className="p-5 rounded-2xl bg-white/75 backdrop-blur-md border border-slate-200/70 hover:border-[#F0944D]/50 hover:shadow-sm transition-all h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F0944D] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Palmtree className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Apply for Leave</h3>
                <p className="text-[11px] text-slate-500">
                  Request time off, view your remaining leave allowances, and track approvals.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#F0944D] group-hover:underline">
                <span>Open Leave Portal</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </Link>

          <Link href="/hrms/attendance" className="group">
            <div className="p-5 rounded-2xl bg-white/75 backdrop-blur-md border border-slate-200/70 hover:border-[#588594]/50 hover:shadow-sm transition-all h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#EBF3F6] text-[#588594] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">My Attendance History</h3>
                <p className="text-[11px] text-slate-500">
                  Inspect your daily clock-in/out records, idle pause intervals, and total active hours.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#588594] group-hover:underline">
                <span>View Attendance Logs</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </Link>

          <Link href="/hrms/calendar" className="group">
            <div className="p-5 rounded-2xl bg-white/75 backdrop-blur-md border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Holidays & Calendar</h3>
                <p className="text-[11px] text-slate-500">
                  Browse company holidays, gazetted days off, and upcoming corporate schedules.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-slate-700 group-hover:underline">
                <span>Open Company Calendar</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </Link>

          <Link href="/hrms/policies" className="group">
            <div className="p-5 rounded-2xl bg-white/75 backdrop-blur-md border border-slate-200/70 hover:border-slate-300 hover:shadow-sm transition-all h-full flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Company Policies</h3>
                <p className="text-[11px] text-slate-500">
                  Read statutory guidelines, HR compliance rules, code of conduct, and leave policies.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-slate-700 group-hover:underline">
                <span>Read HR Policies</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}

export default EmployeePersonalDashboard;
