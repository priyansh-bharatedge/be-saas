"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle, Coffee, Briefcase } from "lucide-react";

export interface DepartmentAttendanceSummary {
  department: string;
  totalStaff: number;
  activeCount: number;
  meetingCount: number;
  idleCount: number;
  leaveCount: number;
  absentCount: number;
  avgHours: number;
  employees?: {
    id: string;
    name: string;
    status: string;
    activeHours: number;
  }[];
}

export interface AttendanceReportMetadata {
  reportDate: string;
  totalEmployees: number;
  overallPresent: number;
  overallAbsent: number;
  overallOnLeave: number;
  departments: DepartmentAttendanceSummary[];
}

export function AttendanceReportCard({ metadata }: { metadata: AttendanceReportMetadata }) {
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  if (!metadata || !metadata.departments) {
    return null;
  }

  const toggleDept = (deptName: string) => {
    setExpandedDept(expandedDept === deptName ? null : deptName);
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-white/95 border border-[#ACCAD5]/50 shadow-sm overflow-hidden text-xs my-2">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#ACCAD5]/25 via-white to-[#F0944D]/15 border-b border-[#ACCAD5]/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#588594] to-[#F0944D] flex items-center justify-center text-white shadow-xs">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              Workforce Attendance Pulse
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white border border-[#ACCAD5]/60 text-[#3D6472]">
                {metadata.reportDate}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">Live Department-Wise Attendance & Leave Breakdown</p>
          </div>
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50/70 border-b border-slate-200/60 text-center">
        <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total Staff</span>
          <span className="text-base font-bold text-slate-800">{metadata.totalEmployees}</span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center justify-center gap-0.5 uppercase">
            <CheckCircle2 className="h-2.5 w-2.5" /> Present
          </span>
          <span className="text-base font-bold text-emerald-700">{metadata.overallPresent}</span>
        </div>
        <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-amber-600 flex items-center justify-center gap-0.5 uppercase">
            <Coffee className="h-2.5 w-2.5" /> On Leave
          </span>
          <span className="text-base font-bold text-amber-700">{metadata.overallOnLeave}</span>
        </div>
        <div className="p-2 rounded-xl bg-rose-50/80 border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-rose-600 flex items-center justify-center gap-0.5 uppercase">
            <AlertCircle className="h-2.5 w-2.5" /> Absent
          </span>
          <span className="text-base font-bold text-rose-700">{metadata.overallAbsent}</span>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-2 text-center">Staff</th>
              <th className="py-2.5 px-2 text-center text-emerald-700 font-bold">Present</th>
              <th className="py-2.5 px-2 text-center text-sky-700">Meeting</th>
              <th className="py-2.5 px-2 text-center text-amber-700">On Leave</th>
              <th className="py-2.5 px-2 text-center text-rose-700 font-bold">Absent</th>
              <th className="py-2.5 px-2 text-center">Avg. Hrs</th>
              <th className="py-2.5 px-2 text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metadata.departments.map((dept) => {
              const isExpanded = expandedDept === dept.department;
              return (
                <div key={dept.department} className="contents">
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{dept.department}</td>
                    <td className="py-2.5 px-2 text-center font-mono">{dept.totalStaff}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600">{dept.activeCount}</td>
                    <td className="py-2.5 px-2 text-center text-sky-600">{dept.meetingCount}</td>
                    <td className="py-2.5 px-2 text-center text-amber-600">{dept.leaveCount}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-rose-600">{dept.absentCount}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-600">{dept.avgHours.toFixed(1)}h</td>
                    <td className="py-2.5 px-2 text-center">
                      {dept.employees && dept.employees.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleDept(dept.department)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Sub-Rows */}
                  {isExpanded && dept.employees && (
                    <tr className="bg-slate-50/90">
                      <td colSpan={8} className="p-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {dept.employees.map((emp) => (
                            <div key={emp.id} className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5">
                              <span className="font-semibold text-slate-800 block truncate">{emp.name}</span>
                              <div className="flex items-center justify-between text-slate-500 font-mono">
                                <span>{emp.status}</span>
                                <span>{emp.activeHours.toFixed(1)} hrs</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
