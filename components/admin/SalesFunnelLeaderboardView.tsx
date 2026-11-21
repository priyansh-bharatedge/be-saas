"use client";

import { useState } from "react";
import {
  Filter,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpDown,
  Layers,
  ChevronRight,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminDashboardData } from "@/lib/actions/super-admin";
import { formatINR } from "./RevenueFinanceView";

interface SalesFunnelLeaderboardViewProps {
  salesFunnel: SuperAdminDashboardData["salesFunnel"];
}

export function SalesFunnelLeaderboardView({
  salesFunnel,
}: SalesFunnelLeaderboardViewProps) {
  const [sortKey, setSortKey] = useState<"achieved" | "target" | "attainment">("achieved");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Sorting for BDM Leaderboard
  const sortedLeaderboard = [...salesFunnel.bdmLeaderboard].sort((a, b) => {
    let diff = 0;
    if (sortKey === "achieved") diff = a.achievedAmount - b.achievedAmount;
    else if (sortKey === "target") diff = a.targetAmount - b.targetAmount;
    else if (sortKey === "attainment") diff = a.attainmentRate - b.attainmentRate;
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (key: "achieved" | "target" | "attainment") => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. END-TO-END SALES FUNNEL */}
      <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 mb-5">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#F0944D]" />
            End-to-End Enterprise Sales Pipeline Funnel
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stage-by-stage progression from top-of-funnel lead acquisition to quality sign-off
          </p>
        </div>

        {/* Funnel Stage Flow Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {salesFunnel.stages.map((stage, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === salesFunnel.stages.length - 1;

            return (
              <div
                key={stage.stage}
                className={cn(
                  "relative rounded-xl p-3.5 border transition-all duration-200 flex flex-col justify-between",
                  isFirst
                    ? "bg-slate-50/80 border-slate-200"
                    : isLast
                    ? "bg-emerald-50/70 border-emerald-200"
                    : "bg-white/90 border-slate-200/80 hover:border-slate-300"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Stage {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                        stage.conversionRate >= 50
                          ? "bg-emerald-100 text-emerald-800"
                          : stage.conversionRate >= 20
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {stage.conversionRate}%
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{stage.label}</h4>
                </div>

                <div className="mt-3">
                  <div className="text-lg font-black text-slate-900 tabular-nums">
                    {stage.count.toLocaleString("en-IN")}
                  </div>
                  {stage.value !== undefined && (
                    <div className="text-[10px] font-semibold text-[#F0944D] mt-0.5 tabular-nums">
                      {formatINR(stage.value)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. TOP SELLING SERVICES & REAL-TIME ZERO-REVENUE ALERT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Top Selling Services (1 col) */}
        <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#ACCAD5]" />
              Top Revenue Services
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by total booked billing in period
            </p>
          </div>

          <div className="space-y-3 flex-1">
            {salesFunnel.topServices.length > 0 ? (
              salesFunnel.topServices.map((service, idx) => (
                <div
                  key={service.name}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-6 w-6 rounded-md bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{service.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {service.dealCount} Deals • Avg {formatINR(service.avgDealSize)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-slate-900 tabular-nums">
                      {formatINR(service.totalRevenue)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">
                No service transactions in this period.
              </div>
            )}
          </div>
        </div>

        {/* Right: Zero-Revenue Today Watchlist (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-white/85 backdrop-blur-md border border-rose-200/80 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-rose-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-rose-950 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Zero-Revenue Today Watchlist (Real-Time)
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Active sales reps with ₹0 closed today • Live tracker status & quick interventions
              </p>
            </div>
            <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {salesFunnel.zeroRevenueToday.length} BDMs Alerted
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Salesperson</th>
                  <th className="py-2.5 px-3">Team Leader</th>
                  <th className="py-2.5 px-3">Attendance Today</th>
                  <th className="py-2.5 px-3 text-center">Quotes Today</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesFunnel.zeroRevenueToday.length > 0 ? (
                  salesFunnel.zeroRevenueToday.map((rep) => {
                    return (
                      <tr key={rep.bdmId} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs border border-slate-200">
                              {rep.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{rep.name}</p>
                              <p className="text-[11px] text-slate-500">{rep.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {rep.teamLeaderName}
                        </td>
                        <td className="py-2.5 px-3">
                          {rep.attendanceStatus === "ACTIVE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active (Online)
                            </span>
                          )}
                          {rep.attendanceStatus === "IDLE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Idle
                            </span>
                          )}
                          {rep.attendanceStatus === "CLOCKED_OUT" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Clocked Out
                            </span>
                          )}
                          {rep.attendanceStatus === "ON_LEAVE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              Approved Leave
                            </span>
                          )}
                          {rep.attendanceStatus === "ABSENT" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Absent
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800 tabular-nums">
                          {rep.quotationsTodayCount}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`mailto:${rep.email}?subject=Sales%20Daily%20Revenue%20Follow-up`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-100 hover:bg-rose-200 text-rose-900 transition-colors"
                          >
                            <Mail className="h-3 w-3" /> Nudge BDM
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      🎉 Outstanding! All active sales representatives have generated revenue today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. BDM PERFORMANCE LEADERBOARD (STRICT 50/50 PARTNER SPLIT) */}
      <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 shadow-xs">
        <div className="pb-3 border-b border-slate-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              BDM / CDM Executive Performance Leaderboard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact revenue attribution honoring the 50/50 partner deal split rule
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort by:</span>
            <button
              onClick={() => toggleSort("achieved")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 border transition-all",
                sortKey === "achieved"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              Revenue {sortKey === "achieved" && (sortAsc ? "↑" : "↓")}
            </button>
            <button
              onClick={() => toggleSort("attainment")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 border transition-all",
                sortKey === "attainment"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              Attainment {sortKey === "attainment" && (sortAsc ? "↑" : "↓")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Rank & Sales Rep</th>
                <th className="py-2.5 px-3">Team Leader</th>
                <th className="py-2.5 px-3 text-right">Target (₹)</th>
                <th className="py-2.5 px-3 text-right">Achieved Revenue (₹)</th>
                <th className="py-2.5 px-3 text-center">Attainment %</th>
                <th className="py-2.5 px-3 text-center">Deals Won</th>
                <th className="py-2.5 px-3 text-center">Quotations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedLeaderboard.map((bdm, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr key={bdm.bdmId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center font-black text-xs shrink-0",
                            idx === 0
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : idx === 1
                              ? "bg-slate-200 text-slate-800 border border-slate-300"
                              : idx === 2
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "text-slate-400"
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{bdm.name}</p>
                          <p className="text-[11px] text-slate-500">{bdm.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {bdm.teamLeaderName}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-600 tabular-nums">
                      {formatINR(bdm.targetAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 tabular-nums">
                      {formatINR(bdm.achievedAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "text-xs font-black",
                            bdm.attainmentRate >= 100
                              ? "text-emerald-600"
                              : bdm.attainmentRate >= 50
                              ? "text-amber-600"
                              : "text-slate-600"
                          )}
                        >
                          {bdm.attainmentRate}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              bdm.attainmentRate >= 100
                                ? "bg-emerald-500"
                                : bdm.attainmentRate >= 50
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            )}
                            style={{ width: `${Math.min(100, bdm.attainmentRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 tabular-nums">
                      {bdm.dealsWon}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600 tabular-nums">
                      {bdm.quotationsCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
