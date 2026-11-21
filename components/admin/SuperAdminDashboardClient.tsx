"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  Filter,
  Activity,
  Users,
  Building2,
  Briefcase,
  Headphones,
  Sparkles,
  ArrowUpRight,
  Clock,
  RotateCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AuthUser } from "@/lib/auth/session";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";
import { ExecutiveDateFilterBar } from "./ExecutiveDateFilterBar";
import { RevenueFinanceView, formatINR } from "./RevenueFinanceView";
import { SalesFunnelLeaderboardView } from "./SalesFunnelLeaderboardView";
import { DepartmentUserActivityView } from "./DepartmentUserActivityView";
import { WorkforceAttendanceView } from "./WorkforceAttendanceView";

interface SuperAdminDashboardClientProps {
  initialData: SuperAdminDashboardData;
  user: AuthUser;
}

type TabType = "overview" | "funnel" | "activity" | "attendance";

const TABS: Array<{ id: TabType; label: string; icon: any; badge?: string | number }> = [
  { id: "overview", label: "Executive Financials", icon: TrendingUp },
  { id: "funnel", label: "Sales Funnel & Leaderboards", icon: Filter },
  { id: "activity", label: "Department & User Activity", icon: Activity },
  { id: "attendance", label: "Workforce & Attendance", icon: Users },
];

export function SuperAdminDashboardClient({
  initialData,
  user,
}: SuperAdminDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<SuperAdminDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "overview"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

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

    // Update URL query string without reloading page
    router.replace(`/admin?${query.toString()}`, { scroll: false });

    try {
      const res = await fetch(`/api/admin/dashboard?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-700/60 relative overflow-hidden">
        {/* Ambient glow decoration */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#F0944D]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#ACCAD5]/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0944D]/20 text-[#F0944D] border border-[#F0944D]/30 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" />
                SUPER ADMIN HQ
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Cross-Platform Operations
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Super Admin Executive Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Consolidated real-time intelligence aggregating CRM revenue pipelines, HRMS workforce attendance, and Support Desk quality audits.
            </p>
          </div>

          {/* Quick Drill-down Links to Other Modules */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/crm"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all"
            >
              <Briefcase className="h-3.5 w-3.5 text-[#F0944D]" />
              <span>CRM</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </a>
            <a
              href="/hrms"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all"
            >
              <Users className="h-3.5 w-3.5 text-[#ACCAD5]" />
              <span>HRMS</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </a>
            <a
              href="/support"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all"
            >
              <Headphones className="h-3.5 w-3.5 text-emerald-400" />
              <span>Support</span>
              <ArrowUpRight className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Highlight Stats Strip in Banner */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Pipeline Revenue:</span>
            <p className="text-sm sm:text-base font-black text-white tabular-nums mt-0.5">
              {formatINR(data.financials.totalBookedRevenue)}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Verified Realized:</span>
            <p className="text-sm sm:text-base font-black text-emerald-400 tabular-nums mt-0.5">
              {formatINR(data.financials.totalReceivedRevenue)}
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Workforce Headcount:</span>
            <p className="text-sm sm:text-base font-black text-white tabular-nums mt-0.5">
              {data.workforceAttendance.snapshot.totalWorkforce} Staff
            </p>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Zero-Revenue Today:</span>
            <p className="text-sm sm:text-base font-black text-[#F0944D] tabular-nums mt-0.5">
              {data.salesFunnel.zeroRevenueToday.length} BDMs
            </p>
          </div>
        </div>
      </div>

      {/* 2. STICKY EXECUTIVE DATE FILTER BAR */}
      <ExecutiveDateFilterBar
        currentRange={currentRange}
        startDate={data.filter.startDate}
        endDate={data.filter.endDate}
        label={data.filter.label}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* 3. EXECUTIVE TAB NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-all rounded-t-xl",
                isActive
                  ? "text-slate-900 bg-white shadow-xs border-t-2 border-t-[#F0944D]"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
              )}
            >
              <Icon
                className={cn("h-4 w-4", isActive ? "text-[#F0944D]" : "text-slate-400")}
              />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. ACTIVE TAB CONTENT VIEW */}
      <div className="transition-all duration-200">
        {isLoading && (
          <div className="py-2 mb-4 px-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <RotateCw className="h-3.5 w-3.5 animate-spin text-[#F0944D]" />
            <span>Synchronizing live PostgreSQL database records for {data.filter.label}...</span>
          </div>
        )}

        {activeTab === "overview" && (
          <RevenueFinanceView financials={data.financials} />
        )}

        {activeTab === "funnel" && (
          <SalesFunnelLeaderboardView salesFunnel={data.salesFunnel} />
        )}

        {activeTab === "activity" && (
          <DepartmentUserActivityView
            departmentActivity={data.departmentActivity}
            currentRange={currentRange}
          />
        )}

        {activeTab === "attendance" && (
          <WorkforceAttendanceView
            workforceAttendance={data.workforceAttendance}
            currentRange={currentRange}
          />
        )}
      </div>
    </div>
  );
}
