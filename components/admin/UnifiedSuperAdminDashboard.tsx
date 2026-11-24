"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  Filter,
  Activity,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight,
  Clock,
  RotateCw,
  Sparkles,
  IndianRupee,
  Building2,
  AlertTriangle,
  Award,
  Compass,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuthUser } from "@/lib/auth/session";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";
import { SuperAdminHierarchyData } from "@/lib/actions/super-admin-hierarchy";
import { ExecutiveDateFilterBar } from "./ExecutiveDateFilterBar";
import { OrbitalHierarchyVisualizer, SelectedNodeType } from "./OrbitalHierarchyVisualizer";
import { HierarchyReportCardDrawer, formatINR } from "./HierarchyReportCardDrawer";
import { RevenueFinanceView } from "./RevenueFinanceView";
import { SalesFunnelLeaderboardView } from "./SalesFunnelLeaderboardView";
import { DepartmentUserActivityView } from "./DepartmentUserActivityView";
import { WorkforceAttendanceView } from "./WorkforceAttendanceView";

interface UnifiedSuperAdminDashboardProps {
  initialData: SuperAdminDashboardData;
  initialHierarchy: SuperAdminHierarchyData;
  user: AuthUser;
}

type TabType = "orbital" | "financials" | "funnel" | "attendance" | "activity";

const TABS: Array<{ id: TabType; label: string; icon: any }> = [
  { id: "orbital", label: "Orbital Hierarchy & 1-on-1", icon: Compass },
  { id: "financials", label: "Financial Telemetry", icon: TrendingUp },
  { id: "funnel", label: "Sales Funnel & Leaderboards", icon: Filter },
  { id: "attendance", label: "Workforce & Attendance", icon: Users },
  { id: "activity", label: "Department Activity", icon: Activity },
];

export function UnifiedSuperAdminDashboard({
  initialData,
  initialHierarchy,
  user,
}: UnifiedSuperAdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SuperAdminDashboardData>(initialData);
  const [hierarchy, setHierarchy] = useState<SuperAdminHierarchyData>(initialHierarchy);
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "orbital"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedHierarchyNode, setSelectedHierarchyNode] = useState<SelectedNodeType | null>(null);
  const [rightWidgetTab, setRightWidgetTab] = useState<"services" | "watchlist">("watchlist");

  const currentRange = searchParams.get("range") || data.filter.range || "monthly";
  const currentFrom = searchParams.get("from") || undefined;
  const currentTo = searchParams.get("to") || undefined;

  const handleFilterChange = async (params: {
    range: string;
    from?: string;
    to?: string;
  }) => {
    setIsLoading(true);

    const query = new URLSearchParams();
    query.set("range", params.range);
    query.set("tab", activeTab);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);

    router.replace(`/admin?${query.toString()}`, { scroll: false });

    try {
      const [resDashboard, resHierarchy] = await Promise.all([
        fetch(`/api/admin/dashboard?${query.toString()}`),
        fetch(`/api/dashboard/super-admin/hierarchy?${query.toString()}`),
      ]);

      const [jsonDashboard, jsonHierarchy] = await Promise.all([
        resDashboard.json(),
        resHierarchy.json(),
      ]);

      if (jsonDashboard.success && jsonDashboard.data) {
        setData(jsonDashboard.data);
      }
      if (jsonHierarchy.success && jsonHierarchy.data) {
        setHierarchy(jsonHierarchy.data);
      }
    } catch (err) {
      console.error("Failed to fetch updated dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    handleFilterChange({
      range: currentRange,
      from: currentFrom,
      to: currentTo,
    });
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", tabId);
    router.replace(`/admin?${query.toString()}`, { scroll: false });
  };

  // Calculations for gauges (Ref: Image 2)
  const totalTarget = hierarchy.summary.totalRevenueTarget;
  const totalAchieved = hierarchy.summary.totalAchievedRevenue;
  const attainmentPercent =
    totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

  const totalWorkforce = data.workforceAttendance.snapshot.totalWorkforce || 1;
  const activeWorkforce = data.workforceAttendance.snapshot.currentlyActive;
  const activeWorkforcePercent = Math.min(100, Math.round((activeWorkforce / totalWorkforce) * 100));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 select-none">
      {/* 1. TOP GLOBAL DATE FILTER BAR & ACTIONS */}
      <ExecutiveDateFilterBar
        currentRange={currentRange}
        startDate={currentFrom}
        endDate={currentTo}
        label={data.filter.label}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* 2. SLEEK VIEW NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-[#ACCAD5]/25 text-[#274854] border border-[#ACCAD5]/60 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-[#C66318]" : "text-slate-400"
                  )}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live PostgreSQL Telemetry
          </span>
        </div>
      </div>

      {/* 3. MAIN EXECUTIVE CANVAS */}
      <AnimatePresence mode="wait">
        {activeTab === "orbital" && (
          <motion.div
            key="orbital-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* 3-Column Floating Executive Command Layout (Ref: Image 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: Floating General Stats & Financial Breakdown (3 Cols) */}
              <div className="lg:col-span-3 space-y-4">
                {/* Headline Total Booked Revenue Card */}
                <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Booked Revenue
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      +14.2%
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {formatINR(data.financials.totalBookedRevenue)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Gross contract value across active deals in period.
                  </p>

                  {/* Sparkline mini-indicator */}
                  <div className="h-10 w-full flex items-end gap-1.5 pt-2">
                    {[35, 45, 60, 50, 75, 70, 90, 85, 95].map((height, i) => (
                      <div
                        key={i}
                        style={{ height: `${height}%` }}
                        className="flex-1 rounded-t-sm bg-gradient-to-t from-[#ACCAD5] to-[#F0944D] opacity-80 hover:opacity-100 transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Cashflow Split Card */}
                <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Verified vs Pending
                    </span>
                    <IndianRupee className="h-4 w-4 text-[#F0944D]" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Verified Received:</span>
                      <strong className="text-emerald-600 font-bold">
                        {formatINR(data.financials.totalReceivedRevenue)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Pending Receivables:</span>
                      <strong className="text-amber-600 font-bold">
                        {formatINR(data.financials.totalPendingReceivables)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Outsource Production:</span>
                      <strong className="text-slate-700 font-bold">
                        {formatINR(data.financials.totalOutsourceCost)}
                      </strong>
                    </div>
                  </div>

                  {/* Bank Split Progress */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>BSPL ({data.financials.bspl.percentage}%)</span>
                      <span>BSAPL ({data.financials.bsapl.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                      <div
                        style={{ width: `${data.financials.bspl.percentage}%` }}
                        className="bg-[#ACCAD5]"
                        title="BSPL"
                      />
                      <div
                        style={{ width: `${data.financials.bsapl.percentage}%` }}
                        className="bg-[#F0944D]"
                        title="BSAPL"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: Central 4-Tier Interactive Orbital Hierarchy Visualizer (6 Cols) */}
              <div className="lg:col-span-6 flex flex-col h-full">
                <OrbitalHierarchyVisualizer
                  hod={hierarchy.hod}
                  selectedNode={selectedHierarchyNode}
                  onSelectNode={(node) => setSelectedHierarchyNode(node)}
                />
              </div>

              {/* RIGHT COLUMN: Attainment Circular Rings & Executive Watchlist (3 Cols) */}
              <div className="lg:col-span-3 space-y-4">
                {/* Circular Gauges Card (Target Attainment & Attendance) */}
                <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Execution Attainment Gauges
                  </span>

                  <div className="grid grid-cols-2 gap-3 items-center text-center">
                    {/* Ring 1: Revenue Attainment */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className="stroke-slate-100"
                            strokeWidth="6"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="#F0944D"
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 32}
                            strokeDashoffset={2 * Math.PI * 32 * (1 - attainmentPercent / 100)}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <span className="absolute text-sm font-black text-slate-900">
                          {attainmentPercent}%
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-1">
                        Revenue Target
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {formatINR(totalAchieved)}
                      </span>
                    </div>

                    {/* Ring 2: Active Workforce Attendance */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            className="stroke-slate-100"
                            strokeWidth="6"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="32"
                            stroke="#10B981"
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 32}
                            strokeDashoffset={2 * Math.PI * 32 * (1 - activeWorkforcePercent / 100)}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <span className="absolute text-sm font-black text-slate-900">
                          {activeWorkforcePercent}%
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-1">
                        Active Staff
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {activeWorkforce} / {totalWorkforce} online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Executive Watchlist / Top Services Widget */}
                <div className="p-5 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRightWidgetTab("watchlist")}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          rightWidgetTab === "watchlist"
                            ? "bg-[#F0944D]/15 text-[#C66318]"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Zero Rev BDM
                      </button>
                      <button
                        onClick={() => setRightWidgetTab("services")}
                        className={cn(
                          "px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer",
                          rightWidgetTab === "services"
                            ? "bg-[#ACCAD5]/25 text-[#274854]"
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Top Services
                      </button>
                    </div>
                  </div>

                  {rightWidgetTab === "watchlist" ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {data.salesFunnel.zeroRevenueToday.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">
                          All active BDMs have logged activity today!
                        </p>
                      ) : (
                        data.salesFunnel.zeroRevenueToday.slice(0, 4).map((bdm) => (
                          <div
                            key={bdm.bdmId}
                            className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800 block truncate max-w-[140px]">
                                {bdm.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                TL: {bdm.teamLeaderName || "Direct"}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {bdm.attendanceStatus}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {data.salesFunnel.topServices.slice(0, 4).map((service, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800 block truncate max-w-[140px]">
                              {service.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {service.dealCount} deals booked
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatINR(service.totalRevenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FINANCIALS TAB */}
        {activeTab === "financials" && (
          <motion.div
            key="financials-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <RevenueFinanceView financials={data.financials} />
          </motion.div>
        )}

        {/* FUNNEL & LEADERBOARD TAB */}
        {activeTab === "funnel" && (
          <motion.div
            key="funnel-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SalesFunnelLeaderboardView salesFunnel={data.salesFunnel} />
          </motion.div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <motion.div
            key="attendance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <WorkforceAttendanceView
              workforceAttendance={data.workforceAttendance}
              currentRange={currentRange}
            />
          </motion.div>
        )}

        {/* DEPARTMENT ACTIVITY TAB */}
        {activeTab === "activity" && (
          <motion.div
            key="activity-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DepartmentUserActivityView
              departmentActivity={data.departmentActivity}
              currentRange={currentRange}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. INTERACTIVE 1-ON-1 PERFORMANCE REPORT CARD DRAWER */}
      {selectedHierarchyNode && (
        <HierarchyReportCardDrawer
          selectedNode={selectedHierarchyNode}
          onClose={() => setSelectedHierarchyNode(null)}
          dateFilterLabel={data.filter.label}
        />
      )}
    </div>
  );
}
