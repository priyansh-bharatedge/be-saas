"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Download,
  Search,
  Filter,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";
import { DEPARTMENTS } from "@/lib/constants/departments";

interface DepartmentUserActivityViewProps {
  departmentActivity: SuperAdminDashboardData["departmentActivity"];
  currentRange: string;
}

export function DepartmentUserActivityView({
  departmentActivity,
  currentRange,
}: DepartmentUserActivityViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedModule, setSelectedModule] = useState("ALL");

  // Filter user activities based on search, department, and module
  const filteredActivities = departmentActivity.userActivityFeed.filter((act) => {
    const matchesDept =
      selectedDept === "ALL" ||
      act.department.toLowerCase() === selectedDept.toLowerCase();

    const matchesModule =
      selectedModule === "ALL" ||
      act.module.toUpperCase() === selectedModule.toUpperCase();

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      act.userName.toLowerCase().includes(query) ||
      act.userEmail.toLowerCase().includes(query) ||
      act.action.toLowerCase().includes(query) ||
      act.targetTitle.toLowerCase().includes(query);

    return matchesDept && matchesModule && matchesSearch;
  });

  const handleExportCsv = () => {
    window.location.href = `/api/admin/export/activity?range=${currentRange}`;
  };

  return (
    <div className="space-y-8">
      {/* 1. ALL 8 DEPARTMENTS THROUGHPUT GRID */}
      <div>
        <div className="pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#ACCAD5]" />
            Department Throughput & Operational Metrics (8 Official Units)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active workflows, resolved operations, and employee participation across corporate departments
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {departmentActivity.departments.map((dept) => {
            return (
              <div
                key={dept.name}
                className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{dept.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {dept.headcount} Staff
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">In Progress</p>
                      <p className="text-sm font-bold text-slate-800 tabular-nums">
                        {dept.activeThroughput}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">Executed</p>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">
                        {dept.completedTasks}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Attendance</span>
                  <span className="font-bold text-slate-700">{dept.attendanceRate}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. USER ACTIVITY AUDIT TIMELINE & FILTERABLE TABLE */}
      <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#F0944D]" />
              Enterprise User Activity Audit Feed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live chronological stream of business actions executed across CRM, HRMS, and Support
            </p>
          </div>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all self-start md:self-auto"
          >
            <Download className="h-3.5 w-3.5 text-[#ACCAD5]" />
            <span>Export Activity CSV</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, or target record..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F0944D]/40 focus:bg-white"
            />
          </div>

          {/* Department Filter */}
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

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#F0944D]/40"
          >
            <option value="ALL">All Modules</option>
            <option value="CRM">CRM</option>
            <option value="HRMS">HRMS</option>
            <option value="SUPPORT">Support</option>
          </select>
        </div>

        {/* Activity Feed Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">User & Identity</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Action Performed</th>
                <th className="py-2.5 px-3">Target Record</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length > 0 ? (
                filteredActivities.slice(0, 50).map((act) => {
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {act.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{act.userName}</p>
                            <p className="text-[11px] text-slate-500">{act.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {act.department}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                            act.module === "CRM"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : act.module === "HRMS"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          )}
                        >
                          {act.module}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {act.action}
                      </td>
                      <td className="py-2.5 px-3">
                        <Link
                          href={act.targetLink}
                          className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-[#F0944D] hover:underline"
                        >
                          <span className="truncate max-w-[180px]">{act.targetTitle}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 tabular-nums">
                        {new Date(act.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching activity events found.
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
