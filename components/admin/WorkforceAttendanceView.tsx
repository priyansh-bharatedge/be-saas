"use client";

import { useState } from "react";
import {
  Clock,
  Download,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  UserX,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";
import { DEPARTMENTS } from "@/lib/constants/departments";

interface WorkforceAttendanceViewProps {
  workforceAttendance: SuperAdminDashboardData["workforceAttendance"];
  currentRange: string;
}

export function WorkforceAttendanceView({
  workforceAttendance,
  currentRange,
}: WorkforceAttendanceViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const snapshot = workforceAttendance.snapshot;

  const filteredAttendance = workforceAttendance.employeeAttendanceList.filter((emp) => {
    const matchesDept =
      selectedDept === "ALL" ||
      emp.department.toLowerCase() === selectedDept.toLowerCase();

    const matchesStatus =
      selectedStatus === "ALL" ||
      emp.status.toUpperCase() === selectedStatus.toUpperCase();

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.designation.toLowerCase().includes(query) ||
      emp.employeeId.toLowerCase().includes(query);

    return matchesDept && matchesStatus && matchesSearch;
  });

  const handleExportCsv = () => {
    window.location.href = `/api/admin/export/attendance?range=${currentRange}`;
  };

  return (
    <div className="space-y-8">
      {/* 1. LIVE ATTENDANCE SNAPSHOT CARDS */}
      <div>
        <div className="pb-3 border-b border-slate-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#F0944D]" />
              Workforce Presence & Live Attendance Tracking
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time headcount status, active session timers, and attendance compliance
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
          >
            <Download className="h-3.5 w-3.5 text-[#ACCAD5]" />
            <span>Export Attendance CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Workforce */}
          <div className="p-3.5 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Staff
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-1">
              {snapshot.totalWorkforce}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 font-medium">Headcount</span>
          </div>

          {/* Currently Active */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums mt-1">
              {snapshot.currentlyActive}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 font-medium">Clocked In</span>
          </div>

          {/* Idle */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Idle
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums mt-1">
              {snapshot.idle}
            </div>
            <span className="text-[11px] text-amber-600 mt-1 font-medium">Inactive Session</span>
          </div>

          {/* Clocked Out */}
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Clocked Out
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-700 tabular-nums mt-1">
              {snapshot.clockedOut}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 font-medium">Shift Ended</span>
          </div>

          {/* On Leave */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
              On Leave
            </span>
            <div className="text-xl sm:text-2xl font-black text-sky-700 tabular-nums mt-1">
              {snapshot.onLeave}
            </div>
            <span className="text-[11px] text-sky-600 mt-1 font-medium">Approved Off</span>
          </div>

          {/* Absent Today */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
              Absent
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 tabular-nums mt-1">
              {snapshot.absentToday}
            </div>
            <span className="text-[11px] text-rose-600 mt-1 font-medium">Unexcused</span>
          </div>

          {/* Average Working Hours */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
              Avg Daily Hrs
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 tabular-nums mt-1">
              {snapshot.averageDailyHours}h
            </div>
            <span className="text-[11px] text-indigo-600 mt-1 font-medium">Productivity</span>
          </div>
        </div>
      </div>

      {/* 2. ATTENDANCE DETAILS TABLE */}
      <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#ACCAD5]" />
            Organization Attendance Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual clock logs, active session durations, and status per date
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name, code, designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F0944D]/40 focus:bg-white"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/40"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/40"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="IDLE">Idle</option>
            <option value="CLOCKED_OUT">Clocked Out</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Clock In</th>
                <th className="py-2.5 px-3">Clock Out</th>
                <th className="py-2.5 px-3 text-center">Active Hours</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{row.name}</p>
                          <p className="text-[11px] text-slate-500">{row.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {row.department}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {row.designation}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium tabular-nums">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold tabular-nums">
                      {row.clockInTime || "--:--"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-semibold tabular-nums">
                      {row.clockOutTime || "--:--"}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900 tabular-nums">
                      {row.totalActiveHours.toFixed(1)}h
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                      {row.status === "IDLE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Idle
                        </span>
                      )}
                      {row.status === "CLOCKED_OUT" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Clocked Out
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No attendance records found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
