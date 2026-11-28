"use client";

import { useState, useEffect, useTransition } from "react";
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
import { SuperAdminBentoData, BentoRosterMember } from "@/lib/actions/super-admin-bento";
import { TierHierarchyDrillDown, BentoHierarchySelection } from "./bento/TierHierarchyDrillDown";
import { ExecutiveBentoGrid } from "./bento/ExecutiveBentoGrid";

interface UnifiedSuperAdminDashboardProps {
  initialData: SuperAdminDashboardData;
  initialHierarchy: SuperAdminHierarchyData;
  initialBento?: SuperAdminBentoData;
  user: AuthUser;
}

type TabType = "orbital" | "financials" | "funnel" | "attendance" | "activity";

export function UnifiedSuperAdminDashboard({
  initialData,
  initialHierarchy,
  initialBento,
  user,
}: UnifiedSuperAdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SuperAdminDashboardData>(initialData);
  const [hierarchy, setHierarchy] = useState<SuperAdminHierarchyData>(initialHierarchy);
  const [bentoData, setBentoData] = useState<SuperAdminBentoData | null>(initialBento || null);
  const [bentoSelection, setBentoSelection] = useState<BentoHierarchySelection>({ tier: "all" });
  const tabFromQuery = (searchParams.get("tab") as TabType) || "orbital";
  const [activeTab, setActiveTab] = useState<TabType>(tabFromQuery);

  useEffect(() => {
    setActiveTab(tabFromQuery);
  }, [tabFromQuery]);
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
      const [resDashboard, resHierarchy, resBento] = await Promise.all([
        fetch(`/api/admin/dashboard?${query.toString()}`),
        fetch(`/api/dashboard/super-admin/hierarchy?${query.toString()}`),
        fetch(`/api/dashboard/super-admin/bento?${query.toString()}`),
      ]);

      const [jsonDashboard, jsonHierarchy, jsonBento] = await Promise.all([
        resDashboard.json(),
        resHierarchy.json(),
        resBento.json(),
      ]);

      if (jsonDashboard.success && jsonDashboard.data) {
        setData(jsonDashboard.data);
      }
      if (jsonHierarchy.success && jsonHierarchy.data) {
        setHierarchy(jsonHierarchy.data);
      }
      if (jsonBento.success && jsonBento.data) {
        setBentoData(jsonBento.data);
      }
    } catch (err) {
      console.error("Failed to fetch updated dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSubordinate = (member: BentoRosterMember) => {
    if (!bentoData) return;
    const lookup = bentoData.allEmployeesLookup.find((e) => e.id === member.id);
    if (lookup) {
      if (lookup.tier === "HOD") {
        setBentoSelection({
          tier: "hod",
          branchId: lookup.branchId,
          hodId: lookup.id,
        });
      } else if (lookup.tier === "TL") {
        setBentoSelection({
          tier: "tl",
          branchId: lookup.branchId,
          hodId: lookup.hodId || "hod-default",
          tlId: lookup.id,
        });
      } else if (lookup.tier === "TM") {
        setBentoSelection({
          tier: "tm",
          branchId: lookup.branchId,
          hodId: lookup.hodId || "hod-default",
          tlId: lookup.tlId || "tl-default",
          tmId: lookup.id,
        });
      }
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
    <div className="min-h-screen relative -m-4 sm:-m-6 lg:-m-7 p-4 sm:p-6 lg:p-7 overflow-hidden bg-[#F3F4F8] select-none">
      {/* =========================================================================
          ATMOSPHERIC SPATIAL BACKDROP (Pastel Aurora Mesh + Architectural Grid)
         ========================================================================= */}
      
      {/* 1. RICH MULTI-COLOR PASTEL MESH (Diffused Ambient Color Orbs: Orange, Sky, Indigo) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Warm BharatEdge Orange/Apricot Orb */}
        <div className="absolute -top-20 left-1/5 w-[650px] h-[650px] rounded-full bg-orange-300/25 blur-3xl" />
        {/* Sky Blue Mist Orb */}
        <div className="absolute top-12 -right-16 w-[600px] h-[600px] rounded-full bg-sky-300/25 blur-3xl" />
        {/* Soft Indigo / Violet Depth Orb */}
        <div className="absolute top-1/3 left-4 w-[650px] h-[650px] rounded-full bg-indigo-200/25 blur-3xl" />
        {/* Lower Warm Amber / Peach Glow */}
        <div className="absolute top-2/3 right-1/4 w-[700px] h-[700px] rounded-full bg-orange-200/20 blur-3xl" />
        {/* Bottom Sky Mist Orb */}
        <div className="absolute -bottom-24 left-1/3 w-[650px] h-[650px] rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      {/* 2. ARCHITECTURAL MICRO-GRID & DOT MATRIX PATTERN */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(#0f172a 1px, transparent 1px), linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)",
          backgroundSize: "28px 28px, 56px 56px, 56px 56px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* 3. CONCENTRIC TOP-CENTER HALO behind Active Period & Level 1 Branches */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_top,_rgba(232,108,44,0.12)_0%,_rgba(56,189,248,0.08)_45%,_transparent_75%)] blur-2xl z-0" />

      {/* FOREGROUND DASHBOARD CANVAS */}
      <div className="relative z-10 space-y-6 max-w-[1520px] mx-auto px-2 sm:px-4 pb-20">
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

        {/* MAIN EXECUTIVE CANVAS */}
        <AnimatePresence mode="wait">
          {/* EXECUTIVE BENTO & 4-TIER HIERARCHY CANVAS */}
          {activeTab === "orbital" && (
            <motion.div
              key="bento-hierarchy-canvas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {bentoData ? (
                <>
                  {/* 1. TOP 4-TIER INTERACTIVE DRILL-DOWN (Jaipur, Ahmedabad, Chennai -> HOD -> TL -> TM) */}
                  <TierHierarchyDrillDown
                    data={bentoData}
                    selection={bentoSelection}
                    onSelect={(newSel) => setBentoSelection(newSel)}
                  />

                  {/* 2. CREXTIO-INSPIRED BENTO GRID DASHBOARD */}
                  <ExecutiveBentoGrid
                    data={bentoData}
                    selection={bentoSelection}
                    onSelectSubordinate={handleSelectSubordinate}
                  />
                </>
              ) : (
                <div className="p-12 text-center bg-white/60 backdrop-blur-xl border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_28px_rgba(15,23,42,0.05)] rounded-3xl space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E86C2C]/10 text-[#E86C2C] flex items-center justify-center mx-auto animate-spin">
                    <RotateCw className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Loading Executive Bento Telemetry...
                  </div>
                </div>
              )}
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
    </div>
  );
}
