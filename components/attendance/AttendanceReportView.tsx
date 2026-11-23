"use client";

import { useState, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  UserX,
  Layers,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AttendanceDetailModal from "@/components/attendance/AttendanceDetailModal";
import {
  AttendanceRecordRow,
  getAttendanceReportAction,
  exportAttendanceCSVAction,
} from "@/lib/actions/attendance";
import { DEPARTMENT_FILTER_TABS } from "@/lib/constants/departments";

interface AttendanceReportViewProps {
  initialRecords: AttendanceRecordRow[];
  initialTotal: number;
  initialStats: {
    totalEmployees: number;
    activeNow: number;
    idleNow: number;
    clockedOut: number;
    avgWorkingHours: number;
  };
  isSelfService?: boolean;
}

const DEPARTMENTS = DEPARTMENT_FILTER_TABS;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active Working" },
  { value: "MEETING_MODE", label: "Meeting Mode" },
  { value: "IDLE", label: "Idle / Paused" },
  { value: "CLOCKED_OUT", label: "Clocked Out" },
];

export default function AttendanceReportView({
  initialRecords,
  initialTotal,
  initialStats,
  isSelfService = false,
}: AttendanceReportViewProps) {
  const [records, setRecords] = useState<AttendanceRecordRow[]>(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7" | "all">("today");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [viewRecord, setViewRecord] = useState<AttendanceRecordRow | null>(null);
  const pageSize = 10;
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch filtered data
  const refetchData = (
    p = currentPage,
    dept = selectedDept,
    stat = selectedStatus,
    q = search,
    start = startDate,
    end = endDate
  ) => {
    startTransition(async () => {
      const res = await getAttendanceReportAction({
        page: p,
        pageSize,
        department: dept,
        status: stat,
        search: q,
        startDate: start || undefined,
        endDate: end || undefined,
      });

      if (res.success && res.data) {
        setRecords(res.data.records);
        setTotal(res.data.total);
        setStats(res.data.stats);
        setCurrentPage(res.data.page);
      }
    });
  };

  // Date preset handler
  const handleDatePresetChange = (preset: "today" | "yesterday" | "last7" | "all") => {
    setDatePreset(preset);
    const today = new Date();
    let start = "";
    let end = today.toISOString().split("T")[0];

    if (preset === "today") {
      start = end;
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = y.toISOString().split("T")[0];
      end = start;
    } else if (preset === "last7") {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      start = d7.toISOString().split("T")[0];
    } else if (preset === "all") {
      start = "";
      end = "";
    }

    setStartDate(start);
    setEndDate(end);
    refetchData(1, selectedDept, selectedStatus, search, start, end);
  };

  // CSV Export handler
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await exportAttendanceCSVAction({
        department: selectedDept,
        status: selectedStatus,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.success && res.data) {
        const { csvContent, filename } = res.data;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setIsExporting(false);
    }
  };

  // Time format helper
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format hours & minutes
  const formatHoursDisplay = (hoursDecimal: number) => {
    const totalMinutes = Math.round(hoursDecimal * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m (${hoursDecimal.toFixed(1)} hrs)`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Personal metrics for self-service view
  const totalPersonalHours = records.reduce((acc, r) => acc + (r.totalActiveHours || 0), 0);
  const avgPersonalHours = records.length > 0 ? (totalPersonalHours / records.length).toFixed(1) : "0.0";
  const activeMeetingsCount = records.filter((r) => r.currentStatus === "MEETING_MODE").length;

  return (
    <div className="space-y-6">
      {/* 1. Light Glassmorphic Summary Statistic Cards */}
      {isSelfService ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Days Logged */}
          <div className="p-5 rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Days Logged</span>
              <Layers className="h-4 w-4 text-[#588594]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {total}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Recorded shift dates</p>
          </div>

          {/* Total Active Hours */}
          <div className="p-5 rounded-[26px] bg-[#EBF3F6]/85 backdrop-blur-xl border border-[#ACCAD5]/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3D6472] mb-1">
              <span>Total Active Hours</span>
              <Clock className="h-4 w-4 text-[#588594]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#274854] tracking-tight">
              {totalPersonalHours.toFixed(1)}h
            </div>
            <p className="text-[11px] text-[#588594] mt-1 font-medium">Net logged working hours</p>
          </div>

          {/* Average Shift Hours */}
          <div className="p-5 rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Avg Shift Hours</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {avgPersonalHours}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Per logged shift date</p>
          </div>

          {/* Meeting Mode Sessions */}
          <div className="p-5 rounded-[26px] bg-emerald-50/85 backdrop-blur-xl border border-emerald-300 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
              <span>Client Meeting Logs</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
              {activeMeetingsCount}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1 font-medium">Meeting Mode records</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Staff */}
          <div className="p-5 rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Total Staff</span>
              <Layers className="h-4 w-4 text-[#588594]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.totalEmployees}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Configured workforce</p>
          </div>

          {/* Currently Active (Brand Cyan Accent #ACCAD5) */}
          <div className="p-5 rounded-[26px] bg-[#EBF3F6]/85 backdrop-blur-xl border border-[#ACCAD5]/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3D6472] mb-1">
              <span>Currently Active</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#588594] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#588594]"></span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#274854] tracking-tight">
              {stats.activeNow}
            </div>
            <p className="text-[11px] text-[#588594] mt-1 font-medium">Real-time working</p>
          </div>

          {/* Idle / Paused (Brand Sunset Amber Accent #F0944D) */}
          <div className="p-5 rounded-[26px] bg-[#FDEFE6]/85 backdrop-blur-xl border border-[#F0944D]/35 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#C66318] mb-1">
              <span>Idle / Paused</span>
              <Coffee className="h-4 w-4 text-[#F0944D]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#9C4206] tracking-tight">
              {stats.idleNow}
            </div>
            <p className="text-[11px] text-[#C66318] mt-1 font-medium">&gt; 5m inactivity</p>
          </div>

          {/* Clocked Out / Off */}
          <div className="p-5 rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Clocked Out / Off</span>
              <UserX className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.clockedOut}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Shift completed / off</p>
          </div>

          {/* Avg Working Hours */}
          <div className="p-5 rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
              <span>Avg Working Hours</span>
              <Clock className="h-4 w-4 text-[#588594]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {stats.avgWorkingHours}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Today&apos;s shift average</p>
          </div>
        </div>
      )}

      {/* 2. Main Light Glassmorphic Container matching Reference Aesthetic */}
      <div className="rounded-[36px] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-6 sm:p-8">
        {/* Top Controls: Department Filter Pills & Export Report Button */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100/80">
          {/* Department Pills or Self-Service Header */}
          {!isSelfService ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DEPARTMENTS.map((dept) => {
                const isActive = selectedDept === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      setSelectedDept(dept);
                      refetchData(1, dept, selectedStatus, search, startDate, endDate);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "text-slate-900 font-bold bg-white shadow-2xs border border-slate-200/70"
                        : "text-slate-500 hover:text-slate-900 font-medium"
                    }`}
                  >
                    {dept === "ALL" ? "All Departments" : dept}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Personal Daily Attendance Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Filter by date range and view your complete shift history.</p>
            </div>
          )}

          {/* Export Report Button: Styled with BharatEdge Brand Accent (#588594) */}
          <Button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="bg-gradient-to-r from-[#588594] to-[#4A7280] hover:from-[#4A7280] hover:to-[#3D606C] text-white font-semibold text-xs px-5 py-2.5 rounded-full shadow-sm flex items-center gap-2 self-start xl:self-auto shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Generating CSV..." : "Export Report (CSV)"}
          </Button>
        </div>

        {/* Second Row: Search, Date Range Presets, Status Dropdown, Custom Date Picker */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-center">
          {/* Search Box (Only shown for Administration view) */}
          {!isSelfService && (
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search staff, ID, designation..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  refetchData(1, selectedDept, selectedStatus, e.target.value, startDate, endDate);
                }}
                className="pl-10 h-10 rounded-2xl bg-white/80 border-slate-200/80 text-slate-800 placeholder:text-slate-400 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-[#588594]"
              />
            </div>
          )}

          {/* Date Range Presets */}
          <div className={`${isSelfService ? "md:col-span-6" : "md:col-span-4"} flex items-center gap-1 bg-[#E7EAEF]/70 p-1 rounded-2xl border border-slate-200/50`}>
            {(
              [
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "last7", label: "Last 7 Days" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => handleDatePresetChange(p.id)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-xl transition-all cursor-pointer ${
                  datePreset === p.id
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Status Dropdown */}
          <div className={`${isSelfService ? "md:col-span-3" : "md:col-span-2"}`}>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                refetchData(1, selectedDept, e.target.value, search, startDate, endDate);
              }}
              className="w-full h-10 px-3 rounded-2xl bg-white/80 border border-slate-200/80 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#588594] cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Input */}
          <div className={`${isSelfService ? "md:col-span-3" : "md:col-span-2"} flex items-center gap-1.5 text-xs text-slate-500`}>
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("today");
                refetchData(1, selectedDept, selectedStatus, search, e.target.value, endDate);
              }}
              className="w-full h-10 px-3 rounded-2xl bg-white/80 border border-slate-200/80 text-xs text-slate-700 font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Table Header: shaded row matching reference aesthetic */}
            <thead>
              <tr className="bg-[#E7EAEF]/60 rounded-xl text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isSelfService ? (
                  <>
                    <th className="py-3.5 pl-4 pr-3 rounded-l-xl">Date</th>
                    <th className="py-3.5 px-3">Clock-In Time</th>
                    <th className="py-3.5 px-3">Clock-Out Time</th>
                    <th className="py-3.5 px-3">Total Working Hours</th>
                    <th className="py-3.5 px-3">Tracker Status</th>
                    <th className="py-3.5 px-3 rounded-r-xl text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="py-3.5 pl-4 pr-3 rounded-l-xl">Employee ID</th>
                    <th className="py-3.5 px-3">Staff Name</th>
                    <th className="py-3.5 px-3">Department & Role</th>
                    <th className="py-3.5 px-3">Clock-In Time</th>
                    <th className="py-3.5 px-3">Clock-Out Time</th>
                    <th className="py-3.5 px-3">Total Working Hours</th>
                    <th className="py-3.5 px-3">Real-Time Status</th>
                    <th className="py-3.5 px-3 rounded-r-xl text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-[#EAEFF4]/70">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isSelfService ? 6 : 8} className="py-12 text-center text-sm text-slate-400">
                    {isPending ? "Filtering records..." : "No attendance logs found for this filter criteria."}
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isOngoing = r.currentStatus !== "CLOCKED_OUT";

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-white/50 transition-colors text-xs text-slate-800"
                    >
                      {isSelfService ? (
                        /* Date for Self Service */
                        <td className="py-4 pl-4 pr-3 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">{formatDate(r.date)}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {r.sessionsCount} session{r.sessionsCount === 1 ? "" : "s"}
                          </div>
                        </td>
                      ) : (
                        <>
                          {/* Employee ID */}
                          <td className="py-4 pl-4 pr-3 font-mono font-medium text-slate-500">
                            {r.employeeId}
                          </td>

                          {/* Staff Name (no avatar initial circles, matching directory redesign) */}
                          <td className="py-4 px-3">
                            <div className="font-semibold text-slate-900">
                              {r.employeeName}
                            </div>
                            <div className="text-[11px] text-slate-400">{r.workEmail}</div>
                          </td>

                          {/* Department & Role */}
                          <td className="py-4 px-3">
                            <div className="text-slate-800 font-medium">
                              {r.designation}
                            </div>
                            <div className="text-[11px] text-slate-400">{r.department}</div>
                          </td>
                        </>
                      )}

                      {/* Clock-In Time */}
                      <td className="py-4 px-3 font-medium text-slate-700">
                        {r.clockInTime ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTime(r.clockInTime)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Clock-Out Time */}
                      <td className="py-4 px-3 font-medium text-slate-700">
                        {r.clockOutTime ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTime(r.clockOutTime)}
                          </div>
                        ) : isOngoing ? (
                          <span className="text-[#3D6472] font-semibold text-[11px] bg-[#EBF3F6] border border-[#ACCAD5]/50 px-2.5 py-0.5 rounded-full">
                            Shift Ongoing
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Working Hours */}
                      <td className="py-4 px-3 font-bold text-slate-900">
                        {formatHoursDisplay(r.totalActiveHours)}
                      </td>

                      {/* Real-Time Tracker Status (Aesthetic soft colored text matching reference) */}
                      <td className="py-4 px-3">
                        {r.currentStatus === "ACTIVE" && (
                          <span className="text-[#10B981] font-semibold flex items-center gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}

                        {r.currentStatus === "MEETING_MODE" && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Meeting Mode
                          </span>
                        )}

                        {r.currentStatus === "IDLE" && (
                          <span className="text-[#F0944D] font-semibold flex items-center gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Idle (Paused)
                          </span>
                        )}

                        {r.currentStatus === "CLOCKED_OUT" && (
                          <span className="text-slate-400 font-medium flex items-center gap-1.5 text-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Clocked Out
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewRecord(r)}
                          className="h-7 w-7 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="View Attendance Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Left Pagination matching Reference Aesthetic */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EAEFF4]/70">
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {/* Previous Page */}
            <button
              onClick={() => {
                if (currentPage > 1) {
                  refetchData(currentPage - 1);
                }
              }}
              disabled={currentPage <= 1 || isPending}
              className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Pagination Number Pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => refetchData(p)}
                  disabled={isPending}
                  className={`h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#E2F16D] text-slate-900 font-bold shadow-2xs scale-105"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  refetchData(currentPage + 1);
                }
              }}
              disabled={currentPage >= totalPages || isPending}
              className="h-8 w-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400 self-end sm:self-auto">
            Showing {records.length} of {total} attendance entries
          </div>
        </div>
      </div>

      <AttendanceDetailModal
        open={Boolean(viewRecord)}
        onOpenChange={(open) => !open && setViewRecord(null)}
        record={viewRecord}
      />
    </div>
  );
}
