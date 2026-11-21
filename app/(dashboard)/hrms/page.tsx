import DepartmentHeader from "@/components/layout/DepartmentHeader";
import PageTransition from "@/components/animations/PageTransition";
import HoverCard from "@/components/animations/HoverCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, CalendarDays, ShieldCheck, UserPlus, Clock } from "lucide-react";
import Link from "next/link";
import ClockWidget from "@/components/attendance/ClockWidget";
import { getTodayAttendanceAction } from "@/lib/actions/attendance";

export const dynamic = "force-dynamic";

export default async function HRMSOverviewPage() {
  const attendanceRes = await getTodayAttendanceAction();
  const initialClockData = attendanceRes.success ? attendanceRes.data : null;

  const metrics = [
    { title: "Total Headcount", value: "318", change: "+12 this quarter", icon: Users },
    { title: "Present Today", value: "96.2%", change: "306 clocked-in", icon: UserCheck },
    { title: "On Approved Leave", value: "12", change: "8 planned / 4 sick", icon: CalendarDays },
    { title: "Departments", value: "6 Active", change: "100% RBAC configured", icon: ShieldCheck },
  ];

  return (
    <PageTransition>
      <DepartmentHeader
        title="Human Resources Management System (HRMS)"
        description="Department management, employee directories, biometrics/attendance tracking, and RBAC portals."
        departmentBadge="DEPT-HRMS"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/hrms/leave">
              <Button variant="outline" size="sm" className="text-xs">
                Leave &amp; Time Off
              </Button>
            </Link>
            <Link href="/hrms/calendar">
              <Button variant="outline" size="sm" className="text-xs">
                Calendar
              </Button>
            </Link>
            <Link href="/hrms/policies">
              <Button variant="outline" size="sm" className="text-xs">
                Policies
              </Button>
            </Link>
            <Link href="/hrms/attendance">
              <Button variant="outline" size="sm" className="text-xs">
                <Clock className="h-3.5 w-3.5 mr-1 text-[#588594]" /> Attendance
              </Button>
            </Link>
            <Link href="/hrms/directory/new">
              <Button size="sm" className="text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Employee
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <HoverCard key={item.title}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-[#588594]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.value}</div>
                  <p className="text-xs text-emerald-600 font-medium mt-1">{item.change}</p>
                </CardContent>
              </Card>
            </HoverCard>
          );
        })}
      </div>

      {/* Prominent Employee Time & Attendance Tracking Widget */}
      <div className="mb-8">
        <ClockWidget initialData={initialClockData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Roster Overview</CardTitle>
            <CardDescription>
              Executive, Sales CRM, HR, Quality Assurance, Support Desk, Operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg text-center text-slate-500 text-sm">
              Department hierarchy and access control matrices configured across 6 departments.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>HRMS Attendance Central</CardTitle>
              <CardDescription>
                Live shift punch stream and idle detection records
              </CardDescription>
            </div>
            <Link href="/hrms/attendance">
              <Button variant="outline" size="sm" className="text-xs">
                View All Records
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Idle Detection:</span>
                <span className="font-semibold text-emerald-600">Active (5m Threshold)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tracking Engine:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  PostgreSQL Session Slices
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Auto-Resume:</span>
                <span className="font-semibold text-emerald-600">Enabled on Activity</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <Link href="/hrms/attendance" className="text-xs font-semibold text-[#588594] hover:underline">
                  Open Administration Logs &rarr;
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
